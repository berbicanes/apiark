use std::collections::HashMap;
use std::path::Path;
use std::time::Instant;

use colored::Colorize;

use crate::collection;
use crate::interpolation;
use crate::models::*;

/// Run a collection and return a summary.
pub async fn run_collection(
    collection_path: &Path,
    env_name: Option<&str>,
    delay_ms: u64,
    iterations: u32,
    data_file: Option<&str>,
) -> anyhow::Result<RunSummary> {
    let _config = collection::load_config(collection_path)?;
    let requests = collection::load_request_files(collection_path)?;

    if requests.is_empty() {
        anyhow::bail!("No request files found in collection");
    }

    let base_vars = if let Some(env) = env_name {
        collection::resolve_variables(collection_path, env)?
    } else {
        HashMap::new()
    };

    // Load data file rows if provided
    let data_rows: Vec<HashMap<String, String>> = if let Some(path) = data_file {
        load_data_file(path)?
    } else {
        Vec::new()
    };

    let actual_iterations = if !data_rows.is_empty() {
        data_rows.len() as u32
    } else {
        iterations
    };

    let client = reqwest::Client::builder()
        .cookie_store(true)
        .redirect(reqwest::redirect::Policy::limited(10))
        .timeout(std::time::Duration::from_secs(30))
        .build()?;

    let mut all_iterations = Vec::new();
    let mut total_passed = 0usize;
    let mut total_failed = 0usize;
    let mut total_time = 0u64;

    for iter_idx in 0..actual_iterations {
        let mut vars = base_vars.clone();

        // Merge data row variables
        if let Some(row) = data_rows.get(iter_idx as usize) {
            for (k, v) in row {
                vars.insert(k.clone(), v.clone());
            }
        }

        if actual_iterations > 1 {
            println!(
                "\n{} {}",
                "Iteration".bold(),
                format!("{}/{}", iter_idx + 1, actual_iterations).bold()
            );
        }

        let mut results = Vec::new();

        for (rel_path, req_file) in &requests {
            let result = run_single_request(&client, req_file, &mut vars).await;

            // Print result line
            let status_str = match result.status {
                Some(s) if s < 300 => format!("{s}").green().to_string(),
                Some(s) if s < 400 => format!("{s}").yellow().to_string(),
                Some(s) => format!("{s}").red().to_string(),
                None => "ERR".red().to_string(),
            };

            let pass_str = if result.passed {
                "PASS".green().to_string()
            } else {
                "FAIL".red().to_string()
            };

            let time_str = result.time_ms.map(|t| format!("{t}ms")).unwrap_or_default();

            println!(
                "  [{pass_str}] {method} {name} → {status} ({time})",
                method = result.method,
                name = rel_path,
                status = status_str,
                time = time_str,
            );

            if let Some(ref err) = result.error {
                eprintln!("        Error: {err}");
            }

            if result.passed {
                total_passed += 1;
            } else {
                total_failed += 1;
            }

            if let Some(t) = result.time_ms {
                total_time += t;
            }

            results.push(result);

            if delay_ms > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(delay_ms)).await;
            }
        }

        all_iterations.push(IterationResult {
            iteration: iter_idx + 1,
            results,
        });
    }

    let total_requests = total_passed + total_failed;

    Ok(RunSummary {
        total_requests,
        total_passed,
        total_failed,
        total_time_ms: total_time,
        iterations: all_iterations,
    })
}

async fn run_single_request(
    client: &reqwest::Client,
    req_file: &RequestFile,
    vars: &mut HashMap<String, String>,
) -> RequestRunResult {
    // Build URL with interpolation
    let url = interpolation::interpolate(&req_file.url, vars);
    let method = req_file.method.to_reqwest();

    let mut builder = client.request(method, &url);

    // Apply headers
    for (k, v) in &req_file.headers {
        let k = interpolation::interpolate(k, vars);
        let v = interpolation::interpolate(v, vars);
        builder = builder.header(k, v);
    }

    // Apply query params
    if let Some(ref params) = req_file.params {
        let pairs: Vec<(String, String)> = params
            .iter()
            .map(|(k, v)| {
                (
                    interpolation::interpolate(k, vars),
                    interpolation::interpolate(v, vars),
                )
            })
            .collect();
        builder = builder.query(&pairs);
    }

    // Apply auth
    builder = apply_auth(builder, &req_file.auth, vars);

    // Apply body
    if let Some(ref body) = req_file.body {
        let content = interpolation::interpolate(&body.content, vars);
        match body.body_type.as_str() {
            "json" => {
                builder = builder
                    .header("Content-Type", "application/json")
                    .body(content);
            }
            "xml" => {
                builder = builder
                    .header("Content-Type", "application/xml")
                    .body(content);
            }
            "raw" => {
                builder = builder.header("Content-Type", "text/plain").body(content);
            }
            _ => {
                builder = builder.body(content);
            }
        }
    }

    let start = Instant::now();

    match builder.send().await {
        Ok(response) => {
            let elapsed = start.elapsed().as_millis() as u64;
            let status = response.status().as_u16();

            // Read body for potential variable extraction (not used yet but structure is here)
            let _body = response.text().await.unwrap_or_default();

            RequestRunResult {
                name: req_file.name.clone(),
                method: req_file.method.as_str().to_string(),
                url,
                status: Some(status),
                time_ms: Some(elapsed),
                passed: status < 400,
                error: None,
            }
        }
        Err(e) => {
            let elapsed = start.elapsed().as_millis() as u64;
            RequestRunResult {
                name: req_file.name.clone(),
                method: req_file.method.as_str().to_string(),
                url,
                status: None,
                time_ms: Some(elapsed),
                passed: false,
                error: Some(e.to_string()),
            }
        }
    }
}

fn apply_auth(
    mut builder: reqwest::RequestBuilder,
    auth: &Option<AuthConfig>,
    vars: &HashMap<String, String>,
) -> reqwest::RequestBuilder {
    match auth {
        Some(AuthConfig::Bearer { token }) => {
            let token = interpolation::interpolate(token, vars);
            builder = builder.bearer_auth(token);
        }
        Some(AuthConfig::Basic { username, password }) => {
            let u = interpolation::interpolate(username, vars);
            let p = interpolation::interpolate(password, vars);
            builder = builder.basic_auth(u, Some(p));
        }
        Some(AuthConfig::ApiKey { key, value, add_to }) => {
            let k = interpolation::interpolate(key, vars);
            let v = interpolation::interpolate(value, vars);
            match add_to {
                ApiKeyLocation::Header => {
                    builder = builder.header(k, v);
                }
                ApiKeyLocation::Query => {
                    builder = builder.query(&[(k, v)]);
                }
            }
        }
        Some(AuthConfig::Digest { username, password }) => {
            let u = interpolation::interpolate(username, vars);
            let p = interpolation::interpolate(password, vars);
            builder = builder.basic_auth(u, Some(p));
        }
        _ => {}
    }
    builder
}

fn load_data_file(path: &str) -> anyhow::Result<Vec<HashMap<String, String>>> {
    let content = std::fs::read_to_string(path)?;

    // Try JSON first
    if path.ends_with(".json") {
        let rows: Vec<HashMap<String, String>> = serde_json::from_str(&content)?;
        return Ok(rows);
    }

    // Try CSV
    if path.ends_with(".csv") {
        let mut reader = csv::Reader::from_reader(content.as_bytes());
        let mut rows = Vec::new();
        for result in reader.deserialize() {
            let row: HashMap<String, String> = result?;
            rows.push(row);
        }
        return Ok(rows);
    }

    // Try YAML
    let rows: Vec<HashMap<String, String>> = serde_yaml::from_str(&content)?;
    Ok(rows)
}
