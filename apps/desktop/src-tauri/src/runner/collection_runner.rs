use std::collections::HashMap;
use std::path::Path;
use std::sync::Arc;

use tauri::{AppHandle, Emitter};

use crate::http::client::HttpEngine;
use crate::http::interpolation;
use crate::models::auth::AuthConfig;
use crate::models::collection::{CollectionNode, RequestFile};
use crate::models::request::{BodyType, HttpMethod, KeyValuePair, RequestBody, SendRequestParams};
use crate::oauth::OAuthTokenStore;
use crate::scripting::assertions::evaluate_assertions_from_yaml;
use crate::scripting::engine::execute_script;
use crate::scripting::{
    ConsoleEntry, RequestSnapshot, ResponseSnapshot, ScriptContext, ScriptPhase,
};
use crate::storage::collection::{load_collection_tree, read_request};
use crate::storage::environment;
use crate::storage::history::HistoryDb;

use super::data_reader::read_data_file;
use super::{IterationResult, RequestRunResult, RunConfig, RunProgress, RunSummary};

/// Collect all request file paths from a collection tree via DFS.
fn collect_request_paths(node: &CollectionNode) -> Vec<String> {
    match node {
        CollectionNode::Request { path, .. } => vec![path.clone()],
        CollectionNode::Collection { children, .. } | CollectionNode::Folder { children, .. } => {
            children.iter().flat_map(collect_request_paths).collect()
        }
    }
}

/// Convert a RequestFile from disk to SendRequestParams for the HTTP engine.
fn request_file_to_params(file: &RequestFile) -> SendRequestParams {
    let headers: Vec<KeyValuePair> = file
        .headers
        .iter()
        .map(|(k, v)| KeyValuePair {
            key: k.clone(),
            value: v.clone(),
            enabled: true,
        })
        .collect();

    let params: Vec<KeyValuePair> = file
        .params
        .as_ref()
        .map(|p| {
            p.iter()
                .map(|(k, v)| KeyValuePair {
                    key: k.clone(),
                    value: v.clone(),
                    enabled: true,
                })
                .collect()
        })
        .unwrap_or_default();

    let body = file.body.as_ref().map(|b| {
        let body_type = match b.body_type.as_str() {
            "json" => BodyType::Json,
            "xml" => BodyType::Xml,
            "raw" => BodyType::Raw,
            "urlencoded" => BodyType::Urlencoded,
            "form-data" => BodyType::FormData,
            "binary" => BodyType::Binary,
            _ => BodyType::None,
        };
        RequestBody {
            body_type,
            content: b.content.clone(),
            form_data: Vec::new(),
        }
    });

    SendRequestParams {
        method: file.method.clone(),
        url: file.url.clone(),
        headers,
        params,
        body,
        auth: file.auth.clone(),
        proxy: None,
        timeout_ms: None,
        follow_redirects: true,
        verify_ssl: true,
        cookies: file.cookies.clone(),
        ca_cert_path: None,
        client_cert_path: None,
        client_key_path: None,
        client_cert_passphrase: None,
    }
}

/// Interpolate variables into request params.
fn interpolate_params(
    params: &SendRequestParams,
    vars: &HashMap<String, String>,
) -> SendRequestParams {
    let mut interpolated = params.clone();
    interpolated.url = interpolation::interpolate(&params.url, vars);

    interpolated.headers = params
        .headers
        .iter()
        .map(|h| KeyValuePair {
            key: interpolation::interpolate(&h.key, vars),
            value: interpolation::interpolate(&h.value, vars),
            enabled: h.enabled,
        })
        .collect();

    interpolated.params = params
        .params
        .iter()
        .map(|p| KeyValuePair {
            key: interpolation::interpolate(&p.key, vars),
            value: interpolation::interpolate(&p.value, vars),
            enabled: p.enabled,
        })
        .collect();

    if let Some(ref body) = params.body {
        let mut new_body = body.clone();
        new_body.content = interpolation::interpolate(&body.content, vars);
        interpolated.body = Some(new_body);
    }

    if let Some(ref auth) = params.auth {
        interpolated.auth = Some(interpolate_auth(auth, vars));
    }

    interpolated
}

fn interpolate_auth(auth: &AuthConfig, vars: &HashMap<String, String>) -> AuthConfig {
    match auth {
        AuthConfig::None => AuthConfig::None,
        AuthConfig::Bearer { token } => AuthConfig::Bearer {
            token: interpolation::interpolate(token, vars),
        },
        AuthConfig::Basic { username, password } => AuthConfig::Basic {
            username: interpolation::interpolate(username, vars),
            password: interpolation::interpolate(password, vars),
        },
        AuthConfig::ApiKey { key, value, add_to } => AuthConfig::ApiKey {
            key: interpolation::interpolate(key, vars),
            value: interpolation::interpolate(value, vars),
            add_to: add_to.clone(),
        },
        AuthConfig::Oauth2 {
            grant_type,
            auth_url,
            token_url,
            client_id,
            client_secret,
            scope,
            callback_url,
            username,
            password,
            use_pkce,
        } => AuthConfig::Oauth2 {
            grant_type: grant_type.clone(),
            auth_url: interpolation::interpolate(auth_url, vars),
            token_url: interpolation::interpolate(token_url, vars),
            client_id: interpolation::interpolate(client_id, vars),
            client_secret: interpolation::interpolate(client_secret, vars),
            scope: interpolation::interpolate(scope, vars),
            callback_url: interpolation::interpolate(callback_url, vars),
            username: interpolation::interpolate(username, vars),
            password: interpolation::interpolate(password, vars),
            use_pkce: *use_pkce,
        },
        AuthConfig::Digest { username, password } => AuthConfig::Digest {
            username: interpolation::interpolate(username, vars),
            password: interpolation::interpolate(password, vars),
        },
        AuthConfig::AwsV4 {
            access_key,
            secret_key,
            region,
            service,
            session_token,
        } => AuthConfig::AwsV4 {
            access_key: interpolation::interpolate(access_key, vars),
            secret_key: interpolation::interpolate(secret_key, vars),
            region: interpolation::interpolate(region, vars),
            service: interpolation::interpolate(service, vars),
            session_token: interpolation::interpolate(session_token, vars),
        },
        AuthConfig::JwtBearer {
            secret,
            algorithm,
            payload,
            header_prefix,
        } => AuthConfig::JwtBearer {
            secret: interpolation::interpolate(secret, vars),
            algorithm: algorithm.clone(),
            payload: interpolation::interpolate(payload, vars),
            header_prefix: header_prefix.clone(),
        },
        AuthConfig::Ntlm {
            username,
            password,
            domain,
            workstation,
        } => AuthConfig::Ntlm {
            username: interpolation::interpolate(username, vars),
            password: interpolation::interpolate(password, vars),
            domain: interpolation::interpolate(domain, vars),
            workstation: interpolation::interpolate(workstation, vars),
        },
    }
}

fn apply_env_mutations(
    vars: &mut HashMap<String, String>,
    mutations: &HashMap<String, Option<String>>,
) {
    for (key, value) in mutations {
        match value {
            Some(v) => {
                vars.insert(key.clone(), v.clone());
            }
            None => {
                vars.remove(key);
            }
        }
    }
}

/// Run a single request and return the result.
async fn run_single_request(
    file: &RequestFile,
    vars: &mut HashMap<String, String>,
    _history_db: &Arc<HistoryDb>,
    oauth_store: &OAuthTokenStore,
) -> RequestRunResult {
    let params = request_file_to_params(file);
    let mut interpolated = interpolate_params(&params, vars);

    // Resolve OAuth token if applicable
    if let Some(AuthConfig::Oauth2 {
        ref client_id,
        ref auth_url,
        ..
    }) = interpolated.auth
    {
        let key = OAuthTokenStore::cache_key(client_id, auth_url);
        match oauth_store.get(&key) {
            Some(token) if !token.is_expired() => {
                interpolated.auth = Some(AuthConfig::Bearer {
                    token: token.access_token,
                });
            }
            _ => {
                return RequestRunResult {
                    name: file.name.clone(),
                    method: format!("{:?}", interpolated.method),
                    url: interpolated.url.clone(),
                    status: None,
                    time_ms: None,
                    passed: false,
                    test_count: 0,
                    test_passed: 0,
                    assertion_count: 0,
                    assertion_passed: 0,
                    error: Some("No valid OAuth token. Authenticate in the app first.".to_string()),
                };
            }
        }
    }

    let method_str = format!("{:?}", interpolated.method);
    let url_str = interpolated.url.clone();

    // Execute request
    let response = match HttpEngine::send(interpolated.clone()).await {
        Ok(resp) => resp,
        Err(e) => {
            let err_msg = format!("{e}");
            return RequestRunResult {
                name: file.name.clone(),
                method: method_str,
                url: url_str,
                status: None,
                time_ms: None,
                passed: false,
                test_count: 0,
                test_passed: 0,
                assertion_count: 0,
                assertion_passed: 0,
                error: Some(err_msg),
            };
        }
    };

    let mut test_count = 0usize;
    let mut test_passed = 0usize;
    let mut assertion_count = 0usize;
    let mut assertion_passed = 0usize;
    let mut has_error = false;

    // Build response snapshot for scripts/assertions
    let resp_snapshot = ResponseSnapshot {
        status: response.status,
        status_text: response.status_text.clone(),
        headers: response
            .headers
            .iter()
            .map(|h| (h.key.clone(), h.value.clone()))
            .collect(),
        body: response.body.clone(),
        time_ms: response.time_ms,
        size_bytes: response.size_bytes,
    };

    // Run post-response script if present
    if let Some(ref script) = file.post_response_script {
        if !script.trim().is_empty() {
            let req_snapshot = RequestSnapshot {
                method: method_str.clone(),
                url: url_str.clone(),
                headers: interpolated
                    .headers
                    .iter()
                    .filter(|h| h.enabled)
                    .map(|h| (h.key.clone(), h.value.clone()))
                    .collect(),
                body: interpolated.body.as_ref().map(|b| b.content.clone()),
            };
            let ctx = ScriptContext {
                request: req_snapshot,
                response: Some(resp_snapshot.clone()),
                env: vars.clone(),
                globals: HashMap::new(),
                variables: HashMap::new(),
            };
            match execute_script(script, ctx, ScriptPhase::PostResponse) {
                Ok(result) => {
                    apply_env_mutations(vars, &result.env_mutations);
                    test_count += result.test_results.len();
                    test_passed += result.test_results.iter().filter(|t| t.passed).count();
                }
                Err(e) => {
                    tracing::warn!("Post-response script error in {}: {e}", file.name);
                    has_error = true;
                }
            }
        }
    }

    // Evaluate declarative assertions
    if let Some(ref assert_value) = file.assert {
        let assertions = crate::scripting::assertions::evaluate_assertions_from_yaml(
            assert_value,
            &resp_snapshot,
        );
        assertion_count = assertions.len();
        assertion_passed = assertions.iter().filter(|a| a.passed).count();
    }

    // Run test script if present
    if let Some(ref script) = file.tests {
        if !script.trim().is_empty() {
            let req_snapshot = RequestSnapshot {
                method: method_str.clone(),
                url: url_str.clone(),
                headers: interpolated
                    .headers
                    .iter()
                    .filter(|h| h.enabled)
                    .map(|h| (h.key.clone(), h.value.clone()))
                    .collect(),
                body: interpolated.body.as_ref().map(|b| b.content.clone()),
            };
            let ctx = ScriptContext {
                request: req_snapshot,
                response: Some(resp_snapshot.clone()),
                env: vars.clone(),
                globals: HashMap::new(),
                variables: HashMap::new(),
            };
            match execute_script(script, ctx, ScriptPhase::PostResponse) {
                Ok(result) => {
                    apply_env_mutations(vars, &result.env_mutations);
                    test_count += result.test_results.len();
                    test_passed += result.test_results.iter().filter(|t| t.passed).count();
                }
                Err(e) => {
                    tracing::warn!("Test script error in {}: {e}", file.name);
                    has_error = true;
                }
            }
        }
    }

    let all_tests_pass = test_passed == test_count;
    let all_assertions_pass = assertion_passed == assertion_count;
    let passed = !has_error && all_tests_pass && all_assertions_pass;

    RequestRunResult {
        name: file.name.clone(),
        method: method_str,
        url: url_str,
        status: Some(response.status),
        time_ms: Some(response.time_ms),
        passed,
        test_count,
        test_passed,
        assertion_count,
        assertion_passed,
        error: None,
    }
}

/// Main entry point for running a collection.
pub async fn run_collection(
    app: AppHandle,
    config: RunConfig,
    history_db: Arc<HistoryDb>,
    oauth_store: &OAuthTokenStore,
) -> Result<RunSummary, String> {
    let collection_path = Path::new(&config.collection_path);
    let tree = load_collection_tree(collection_path)?;

    // If a specific folder is targeted, find it
    let request_paths = if let Some(ref folder_path) = config.folder_path {
        fn find_folder<'a>(node: &'a CollectionNode, target: &str) -> Option<&'a CollectionNode> {
            match node {
                CollectionNode::Folder { path, .. } | CollectionNode::Collection { path, .. }
                    if path == target =>
                {
                    Some(node)
                }
                CollectionNode::Collection { children, .. }
                | CollectionNode::Folder { children, .. } => {
                    children.iter().find_map(|c| find_folder(c, target))
                }
                CollectionNode::Request { .. } => None,
            }
        }
        match find_folder(&tree, folder_path) {
            Some(folder) => collect_request_paths(folder),
            None => return Err(format!("Folder not found: {folder_path}")),
        }
    } else {
        collect_request_paths(&tree)
    };

    if request_paths.is_empty() {
        return Err("No requests found in collection".to_string());
    }

    // Load environment variables
    let base_vars = if let Some(ref env_name) = config.environment_name {
        environment::get_resolved_variables(collection_path, env_name)?
    } else {
        HashMap::new()
    };

    // Load data file rows
    let data_rows = if let Some(ref data_file) = config.data_file {
        read_data_file(data_file)?
    } else {
        vec![HashMap::new()] // Single empty row = 1 iteration without data
    };

    let iterations = if config.iterations > 0 {
        config.iterations
    } else {
        1
    };
    let run_id = uuid::Uuid::new_v4().to_string();
    let total_requests = request_paths.len();

    let mut all_iterations = Vec::new();
    let mut total_passed = 0usize;
    let mut total_failed = 0usize;
    let mut total_time_ms = 0u64;

    for iteration in 0..iterations {
        let mut iteration_results = Vec::new();
        let mut vars = base_vars.clone();

        // Merge data row for this iteration (cycle through data rows)
        if !data_rows.is_empty() {
            let row_idx = iteration as usize % data_rows.len();
            for (k, v) in &data_rows[row_idx] {
                vars.insert(k.clone(), v.clone());
            }
        }

        for (req_idx, req_path) in request_paths.iter().enumerate() {
            let file = match read_request(Path::new(req_path)) {
                Ok(f) => f,
                Err(e) => {
                    let result = RequestRunResult {
                        name: req_path.clone(),
                        method: "?".to_string(),
                        url: String::new(),
                        status: None,
                        time_ms: None,
                        passed: false,
                        test_count: 0,
                        test_passed: 0,
                        assertion_count: 0,
                        assertion_passed: 0,
                        error: Some(format!("Failed to read request: {e}")),
                    };

                    // Emit progress
                    let _ = app.emit(
                        "runner:progress",
                        RunProgress {
                            run_id: run_id.clone(),
                            iteration,
                            request_index: req_idx,
                            total_requests,
                            result: result.clone(),
                        },
                    );

                    if config.stop_on_error {
                        iteration_results.push(result);
                        break;
                    }
                    iteration_results.push(result);
                    continue;
                }
            };

            let result = run_single_request(&file, &mut vars, &history_db, oauth_store).await;

            // Emit progress event
            let _ = app.emit(
                "runner:progress",
                RunProgress {
                    run_id: run_id.clone(),
                    iteration,
                    request_index: req_idx,
                    total_requests,
                    result: result.clone(),
                },
            );

            if result.passed {
                total_passed += 1;
            } else {
                total_failed += 1;
            }
            if let Some(ms) = result.time_ms {
                total_time_ms += ms;
            }

            let should_stop = !result.passed && config.stop_on_error;
            iteration_results.push(result);

            if should_stop {
                break;
            }

            // Delay between requests
            if config.delay_ms > 0 && req_idx < request_paths.len() - 1 {
                tokio::time::sleep(tokio::time::Duration::from_millis(config.delay_ms)).await;
            }
        }

        all_iterations.push(IterationResult {
            iteration,
            results: iteration_results,
        });
    }

    let summary = RunSummary {
        total_requests: total_passed + total_failed,
        total_passed,
        total_failed,
        total_time_ms,
        iterations: all_iterations,
    };

    // Emit complete event
    let _ = app.emit("runner:complete", &summary);

    Ok(summary)
}
