use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::sync::OnceLock;

use regex::Regex;
use serde_json::Value;

use crate::models::{
    ApiKeyLocation, AuthConfig, CollectionConfig, EnvironmentFile, HttpMethod, RequestBodyFile,
    RequestFile,
};

static STRIP_ENV_RE: OnceLock<Regex> = OnceLock::new();
static ADD_ENV_RE: OnceLock<Regex> = OnceLock::new();

pub fn strip_insomnia_env_prefix(input: &str) -> String {
    let cleaned = input.replace('\u{00a0}', " ");
    let re = STRIP_ENV_RE.get_or_init(|| Regex::new(r"\{\{\s*_\.([a-zA-Z0-9_\-\.]+)\s*\}\}").unwrap());
    re.replace_all(&cleaned, "{{$1}}").to_string()
}

pub fn add_insomnia_env_prefix(input: &str) -> String {
    let re = ADD_ENV_RE.get_or_init(|| Regex::new(r"\{\{\s*([^}]+?)\s*\}\}").unwrap());
    re.replace_all(input, |caps: &regex::Captures| {
        let var = caps[1].trim();
        if var.starts_with('$') || var.starts_with("_.") || var.starts_with('_') {
            caps[0].to_string()
        } else {
            format!("{{{{ _.{var} }}}}")
        }
    })
    .to_string()
}

// ── Format Detection ──

pub fn detect_format(file_path: &Path) -> anyhow::Result<String> {
    let content = fs::read_to_string(file_path)?;

    // JSON checks
    if let Ok(json) = serde_json::from_str::<Value>(&content) {
        // Postman v2.1
        if json.get("info").and_then(|i| i.get("schema")).is_some() {
            return Ok("postman".to_string());
        }
        // Insomnia v4
        if json.get("resources").is_some() || json.get("__export_format").is_some() {
            return Ok("insomnia".to_string());
        }
        // Insomnia v5 JSON
        if json
            .get("type")
            .and_then(|t| t.as_str())
            .map(|t| t.contains("insomnia.rest/5") || t.contains("collection.insomnia.rest"))
            .unwrap_or(false)
            || (json.get("collection").is_some() && json.get("schema_version").is_some())
        {
            return Ok("insomnia".to_string());
        }
        // OpenAPI JSON
        if json.get("openapi").is_some() || json.get("swagger").is_some() {
            return Ok("openapi".to_string());
        }
    }

    // YAML / Substring checks
    if content.contains("collection.insomnia.rest")
        || content.contains("insomnia.rest/5")
        || (content.contains("schema_version:") && content.contains("collection:"))
    {
        return Ok("insomnia".to_string());
    }

    if (content.contains("\"_type\"") && content.contains("\"resources\""))
        || (content.contains("_type:") && content.contains("resources:"))
    {
        return Ok("insomnia".to_string());
    }

    if content.contains("openapi:") || content.contains("swagger:") {
        return Ok("openapi".to_string());
    }

    // Bruno (.bru file)
    if file_path.extension().map(|e| e == "bru").unwrap_or(false) {
        return Ok("bruno".to_string());
    }

    // HAR
    if content.contains("\"log\"") && content.contains("\"entries\"") {
        return Ok("har".to_string());
    }

    anyhow::bail!(
        "Could not detect format. Specify with --format (postman, insomnia, openapi, bruno, har)"
    )
}

// ── Import ──

pub fn import_collection(
    file_path: &Path,
    output_dir: &Path,
    format: &str,
) -> anyhow::Result<usize> {
    let content = fs::read_to_string(file_path)?;

    match format {
        "postman" => import_postman(&content, output_dir),
        "insomnia" => import_insomnia(&content, output_dir),
        _ => anyhow::bail!(
            "Import format '{format}' not supported in CLI. Supported: postman, insomnia"
        ),
    }
}

fn import_postman(content: &str, output_dir: &Path) -> anyhow::Result<usize> {
    let json: Value = serde_json::from_str(content)?;

    let name = json
        .get("info")
        .and_then(|i| i.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("Imported Collection");

    let collection_dir = output_dir.join(sanitize(name));
    fs::create_dir_all(&collection_dir)?;

    let config_dir = collection_dir.join(".apiark");
    fs::create_dir_all(&config_dir)?;
    let config = CollectionConfig {
        name: name.to_string(),
        version: 1,
    };
    fs::write(
        config_dir.join("apiark.yaml"),
        serde_yaml::to_string(&config)?,
    )?;

    let items = json.get("item").and_then(|i| i.as_array());
    let mut count = 0;
    if let Some(items) = items {
        import_postman_items(items, &collection_dir, &mut count)?;
    }

    Ok(count)
}

fn import_postman_items(
    items: &[Value],
    dir: &Path,
    count: &mut usize,
) -> anyhow::Result<()> {
    for item in items {
        let name = item
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("unnamed");

        if let Some(sub_items) = item.get("item").and_then(|i| i.as_array()) {
            let folder_dir = dir.join(sanitize(name));
            fs::create_dir_all(&folder_dir)?;
            import_postman_items(sub_items, &folder_dir, count)?;
        } else if let Some(request) = item.get("request") {
            let method = request
                .get("method")
                .and_then(|m| m.as_str())
                .unwrap_or("GET");

            let url = match request.get("url") {
                Some(Value::String(s)) => s.clone(),
                Some(Value::Object(obj)) => obj
                    .get("raw")
                    .and_then(|r| r.as_str())
                    .unwrap_or("")
                    .to_string(),
                _ => String::new(),
            };

            let mut headers = HashMap::new();
            if let Some(header_arr) = request.get("header").and_then(|h| h.as_array()) {
                for h in header_arr {
                    let key = h.get("key").and_then(|k| k.as_str()).unwrap_or("");
                    let val = h.get("value").and_then(|v| v.as_str()).unwrap_or("");
                    if !key.is_empty() {
                        headers.insert(key.to_string(), val.to_string());
                    }
                }
            }

            let body = request.get("body").and_then(|b| {
                let mode = b.get("mode").and_then(|m| m.as_str()).unwrap_or("raw");
                let content = match mode {
                    "raw" => b.get("raw").and_then(|r| r.as_str()).unwrap_or("").to_string(),
                    "urlencoded" => {
                        if let Some(arr) = b.get("urlencoded").and_then(|u| u.as_array()) {
                            arr.iter()
                                .filter_map(|p| {
                                    let k = p.get("key").and_then(|k| k.as_str())?;
                                    let v = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                                    Some(format!("{k}={v}"))
                                })
                                .collect::<Vec<_>>()
                                .join("&")
                        } else {
                            String::new()
                        }
                    }
                    _ => b.get("raw").and_then(|r| r.as_str()).unwrap_or("").to_string(),
                };
                let body_type = match mode {
                    "raw" => {
                        let lang = b
                            .get("options")
                            .and_then(|o| o.get("raw"))
                            .and_then(|r| r.get("language"))
                            .and_then(|l| l.as_str())
                            .unwrap_or("text");
                        match lang {
                            "json" => "json",
                            "xml" => "xml",
                            _ => "raw",
                        }
                    }
                    "urlencoded" => "urlencoded",
                    "formdata" => "form-data",
                    _ => "raw",
                };
                if content.is_empty() {
                    None
                } else {
                    Some(RequestBodyFile {
                        body_type: body_type.to_string(),
                        content,
                    })
                }
            });

            let req = RequestFile {
                name: name.to_string(),
                method: parse_http_method(method),
                url,
                description: item
                    .get("description")
                    .or_else(|| request.get("description"))
                    .and_then(|d| d.as_str())
                    .map(|s| s.to_string()),
                headers,
                auth: None,
                body,
                params: None,
                assert: None,
                tests: None,
                pre_request_script: None,
                post_response_script: None,
            };

            let filename = format!("{}.yaml", sanitize(name));
            fs::write(dir.join(&filename), serde_yaml::to_string(&req)?)?;
            *count += 1;
        }
    }
    Ok(())
}

fn import_insomnia(content: &str, output_dir: &Path) -> anyhow::Result<usize> {
    let root: Value = serde_json::from_str(content)
        .or_else(|_| serde_yaml::from_str::<Value>(content))
        .map_err(|e| anyhow::anyhow!("Failed to parse Insomnia export (JSON or YAML): {e}"))?;

    let is_v5 = root
        .get("type")
        .and_then(|t| t.as_str())
        .map(|t| t.contains("insomnia.rest/5") || t.contains("collection.insomnia.rest"))
        .unwrap_or(false)
        || root.get("collection").and_then(|c| c.as_array()).is_some();

    if is_v5 {
        import_insomnia_v5(&root, output_dir)
    } else if root.get("resources").and_then(|r| r.as_array()).is_some() {
        import_insomnia_v4(&root, output_dir)
    } else {
        anyhow::bail!("Invalid Insomnia format: missing 'collection' or 'resources'")
    }
}

// ── Insomnia v5 Import ──

fn import_insomnia_v5(root: &Value, output_dir: &Path) -> anyhow::Result<usize> {
    let name = root
        .get("name")
        .and_then(|n| n.as_str())
        .unwrap_or("Imported Collection")
        .trim();

    let collection_dir = output_dir.join(sanitize(name));
    fs::create_dir_all(&collection_dir)?;

    let config_dir = collection_dir.join(".apiark");
    fs::create_dir_all(&config_dir)?;
    let config = CollectionConfig {
        name: name.to_string(),
        version: 1,
    };
    fs::write(
        config_dir.join("apiark.yaml"),
        serde_yaml::to_string(&config)?,
    )?;

    // Import environments with inheritance
    if let Some(env_obj) = root.get("environments") {
        import_insomnia_v5_environments(env_obj, &config_dir)?;
    }

    let items = root
        .get("collection")
        .and_then(|c| c.as_array())
        .ok_or_else(|| anyhow::anyhow!("Missing 'collection' array in Insomnia v5"))?;

    let mut count = 0;
    import_insomnia_v5_items(items, &collection_dir, &mut count)?;
    Ok(count)
}

fn import_insomnia_v5_items(
    items: &[Value],
    dir: &Path,
    count: &mut usize,
) -> anyhow::Result<()> {
    for item in items {
        let name = item
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("unnamed")
            .trim();

        if let Some(children) = item.get("children").and_then(|c| c.as_array()) {
            let folder_dir = dir.join(sanitize(name));
            fs::create_dir_all(&folder_dir)?;
            import_insomnia_v5_items(children, &folder_dir, count)?;
        } else if item.get("url").is_some() || item.get("method").is_some() {
            let method = item
                .get("method")
                .and_then(|m| m.as_str())
                .unwrap_or("GET");

            let raw_url = item.get("url").and_then(|u| u.as_str()).unwrap_or("");
            let url = strip_insomnia_env_prefix(raw_url).trim().to_string();

            let mut headers = HashMap::new();
            if let Some(arr) = item.get("headers").and_then(|h| h.as_array()) {
                for h in arr {
                    if h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                        continue;
                    }
                    let key = h.get("name").and_then(|k| k.as_str()).unwrap_or("");
                    let val = h.get("value").and_then(|v| v.as_str()).unwrap_or("");
                    if !key.is_empty() {
                        headers.insert(key.to_string(), strip_insomnia_env_prefix(val));
                    }
                }
            }

            let mut params = HashMap::new();
            if let Some(arr) = item.get("parameters").and_then(|p| p.as_array()) {
                for p in arr {
                    if p.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                        continue;
                    }
                    let key = p.get("name").and_then(|k| k.as_str()).unwrap_or("");
                    let val = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                    if !key.is_empty() {
                        params.insert(key.to_string(), strip_insomnia_env_prefix(val));
                    }
                }
            }

            let body = parse_insomnia_body(item.get("body"));
            let auth = parse_insomnia_auth(item.get("authentication"));

            let (pre_request_script, post_response_script) = if let Some(scripts) = item.get("scripts") {
                let pre = scripts
                    .get("preRequest")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
                let post = scripts
                    .get("afterResponse")
                    .and_then(|v| v.as_str())
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| s.to_string());
                (pre, post)
            } else {
                (None, None)
            };

            let req = RequestFile {
                name: name.to_string(),
                method: parse_http_method(method),
                url,
                description: item
                    .get("description")
                    .or_else(|| item.get("meta").and_then(|m| m.get("description")))
                    .and_then(|d| d.as_str())
                    .map(|s| s.to_string()),
                headers,
                auth,
                body,
                params: if params.is_empty() { None } else { Some(params) },
                assert: None,
                tests: None,
                pre_request_script,
                post_response_script,
            };

            let filename = format!("{}.yaml", sanitize(name));
            fs::write(dir.join(&filename), serde_yaml::to_string(&req)?)?;
            *count += 1;
        }
    }
    Ok(())
}

fn import_insomnia_v5_environments(env_obj: &Value, config_dir: &Path) -> anyhow::Result<()> {
    let env_dir = config_dir.join("environments");
    fs::create_dir_all(&env_dir)?;

    let mut base_vars = HashMap::new();
    if let Some(data) = env_obj.get("data").and_then(|d| d.as_object()) {
        for (k, val) in data {
            let v = match val {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            base_vars.insert(k.clone(), v);
        }
    }

    if let Some(sub_envs) = env_obj.get("subEnvironments").and_then(|s| s.as_array()) {
        for se in sub_envs {
            let name = se
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("Environment")
                .trim();
            let mut merged = base_vars.clone();
            if let Some(data) = se.get("data").and_then(|d| d.as_object()) {
                for (k, val) in data {
                    let v = match val {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    merged.insert(k.clone(), v);
                }
            }

            let env_file = EnvironmentFile {
                name: name.to_string(),
                variables: merged,
                secrets: Vec::new(),
            };
            fs::write(
                env_dir.join(format!("{}.yaml", sanitize(name))),
                serde_yaml::to_string(&env_file)?,
            )?;
        }
    }

    if !base_vars.is_empty() {
        let base_name = env_obj
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("Base")
            .trim();
        let name = if base_name.is_empty() { "Base" } else { base_name };
        let env_file = EnvironmentFile {
            name: name.to_string(),
            variables: base_vars,
            secrets: Vec::new(),
        };
        fs::write(
            env_dir.join(format!("{}.yaml", sanitize(name))),
            serde_yaml::to_string(&env_file)?,
        )?;
    }

    Ok(())
}

// ── Insomnia v4 Import ──

fn import_insomnia_v4(root: &Value, output_dir: &Path) -> anyhow::Result<usize> {
    let resources = root
        .get("resources")
        .and_then(|r| r.as_array())
        .ok_or_else(|| anyhow::anyhow!("Invalid Insomnia format: missing resources"))?;

    let workspace = resources
        .iter()
        .find(|r| r.get("_type").and_then(|t| t.as_str()) == Some("workspace"));

    let ws_name = workspace
        .and_then(|w| w.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("Imported Collection");
    let ws_id = workspace
        .and_then(|w| w.get("_id"))
        .and_then(|i| i.as_str())
        .unwrap_or("");

    let collection_dir = output_dir.join(sanitize(ws_name));
    fs::create_dir_all(&collection_dir)?;

    let config_dir = collection_dir.join(".apiark");
    fs::create_dir_all(&config_dir)?;
    let config = CollectionConfig {
        name: ws_name.to_string(),
        version: 1,
    };
    fs::write(
        config_dir.join("apiark.yaml"),
        serde_yaml::to_string(&config)?,
    )?;

    // Import environments if present
    let mut environments = Vec::new();
    for res in resources {
        if res.get("_type").and_then(|t| t.as_str()) == Some("environment") {
            let name = res
                .get("name")
                .and_then(|n| n.as_str())
                .unwrap_or("Default")
                .trim();
            let mut variables = HashMap::new();
            if let Some(data) = res.get("data").and_then(|d| d.as_object()) {
                for (k, val) in data {
                    let v = match val {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    variables.insert(k.clone(), v);
                }
            }
            if !variables.is_empty() {
                environments.push(EnvironmentFile {
                    name: name.to_string(),
                    variables,
                    secrets: Vec::new(),
                });
            }
        }
    }

    if !environments.is_empty() {
        let env_dir = config_dir.join("environments");
        fs::create_dir_all(&env_dir)?;
        for env in environments {
            fs::write(
                env_dir.join(format!("{}.yaml", sanitize(&env.name))),
                serde_yaml::to_string(&env)?,
            )?;
        }
    }

    let mut children_map: HashMap<String, Vec<&Value>> = HashMap::new();
    for res in resources {
        let parent = res
            .get("parentId")
            .and_then(|p| p.as_str())
            .unwrap_or("");
        children_map.entry(parent.to_string()).or_default().push(res);
    }

    let mut count = 0;
    import_insomnia_v4_children(&children_map, ws_id, &collection_dir, &mut count)?;

    Ok(count)
}

fn import_insomnia_v4_children(
    children_map: &HashMap<String, Vec<&Value>>,
    parent_id: &str,
    dir: &Path,
    count: &mut usize,
) -> anyhow::Result<()> {
    let Some(children) = children_map.get(parent_id) else {
        return Ok(());
    };

    for res in children {
        let res_type = res.get("_type").and_then(|t| t.as_str()).unwrap_or("");
        let name = res
            .get("name")
            .and_then(|n| n.as_str())
            .unwrap_or("unnamed");
        let res_id = res.get("_id").and_then(|i| i.as_str()).unwrap_or("");

        match res_type {
            "request_group" => {
                let folder_dir = dir.join(sanitize(name));
                fs::create_dir_all(&folder_dir)?;
                import_insomnia_v4_children(children_map, res_id, &folder_dir, count)?;
            }
            "request" => {
                let method = res
                    .get("method")
                    .and_then(|m| m.as_str())
                    .unwrap_or("GET");
                let raw_url = res.get("url").and_then(|u| u.as_str()).unwrap_or("");
                let url = strip_insomnia_env_prefix(raw_url).trim().to_string();

                let mut headers = HashMap::new();
                if let Some(arr) = res.get("headers").and_then(|h| h.as_array()) {
                    for h in arr {
                        if h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                            continue;
                        }
                        let key = h.get("name").and_then(|k| k.as_str()).unwrap_or("");
                        let val = h.get("value").and_then(|v| v.as_str()).unwrap_or("");
                        if !key.is_empty() {
                            headers.insert(key.to_string(), strip_insomnia_env_prefix(val));
                        }
                    }
                }

                let body = parse_insomnia_body(res.get("body"));
                let auth = parse_insomnia_auth(res.get("authentication"));

                let req = RequestFile {
                    name: name.to_string(),
                    method: parse_http_method(method),
                    url,
                    description: res
                        .get("description")
                        .and_then(|d| d.as_str())
                        .map(|s| s.to_string()),
                    headers,
                    auth,
                    body,
                    params: None,
                    assert: None,
                    tests: None,
                    pre_request_script: None,
                    post_response_script: None,
                };

                let filename = format!("{}.yaml", sanitize(name));
                fs::write(dir.join(&filename), serde_yaml::to_string(&req)?)?;
                *count += 1;
            }
            _ => {}
        }
    }
    Ok(())
}

fn parse_insomnia_body(body_val: Option<&Value>) -> Option<RequestBodyFile> {
    let b = body_val?;
    let mime = b.get("mimeType").and_then(|m| m.as_str()).unwrap_or("");

    if mime.contains("multipart") || mime.contains("form-data") {
        if let Some(params) = b.get("params").and_then(|p| p.as_array()) {
            let items: Vec<serde_json::Value> = params
                .iter()
                .filter_map(|p| {
                    if p.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                        return None;
                    }
                    let key = p.get("name").and_then(|v| v.as_str())?;
                    let value = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                    let file_name = p.get("fileName").and_then(|v| v.as_str());
                    let val = if let Some(f) = file_name {
                        if !f.is_empty() { f } else { value }
                    } else {
                        value
                    };
                    Some(serde_json::json!({
                        "key": key,
                        "value": strip_insomnia_env_prefix(val)
                    }))
                })
                .collect();
            if !items.is_empty() {
                return Some(RequestBodyFile {
                    body_type: "form-data".to_string(),
                    content: serde_json::to_string_pretty(&items).unwrap_or_default(),
                });
            }
        }
    } else if mime.contains("urlencoded") {
        if let Some(params) = b.get("params").and_then(|p| p.as_array()) {
            let content = params
                .iter()
                .filter_map(|p| {
                    if p.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                        return None;
                    }
                    let k = p.get("name").and_then(|v| v.as_str())?;
                    let v = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                    Some(format!("{}={}", k, strip_insomnia_env_prefix(v)))
                })
                .collect::<Vec<_>>()
                .join("&");
            if !content.is_empty() {
                return Some(RequestBodyFile {
                    body_type: "urlencoded".to_string(),
                    content,
                });
            }
        }
    }

    let text = b.get("text").and_then(|t| t.as_str()).unwrap_or("");
    if text.is_empty() {
        return None;
    }

    let body_type = if mime.contains("json") {
        "json"
    } else if mime.contains("xml") {
        "xml"
    } else if mime.contains("graphql") {
        "graphql"
    } else if mime.contains("urlencoded") {
        "urlencoded"
    } else if mime.contains("multipart") || mime.contains("form-data") {
        "form-data"
    } else {
        "raw"
    };

    Some(RequestBodyFile {
        body_type: body_type.to_string(),
        content: strip_insomnia_env_prefix(text),
    })
}

fn parse_insomnia_auth(auth_val: Option<&Value>) -> Option<AuthConfig> {
    let auth = auth_val?;
    if auth.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
        return None;
    }
    let auth_type = auth.get("type").and_then(|v| v.as_str())?;

    match auth_type {
        "bearer" => {
            let token = auth
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(AuthConfig::Bearer {
                token: strip_insomnia_env_prefix(&token),
            })
        }
        "basic" => Some(AuthConfig::Basic {
            username: strip_insomnia_env_prefix(
                auth.get("username").and_then(|v| v.as_str()).unwrap_or(""),
            ),
            password: strip_insomnia_env_prefix(
                auth.get("password").and_then(|v| v.as_str()).unwrap_or(""),
            ),
        }),
        "apikey" => {
            let key = strip_insomnia_env_prefix(
                auth.get("key").and_then(|v| v.as_str()).unwrap_or(""),
            );
            let value = strip_insomnia_env_prefix(
                auth.get("value").and_then(|v| v.as_str()).unwrap_or(""),
            );
            Some(AuthConfig::ApiKey {
                key,
                value,
                add_to: ApiKeyLocation::Header,
            })
        }
        _ => None,
    }
}

fn parse_http_method(method: &str) -> HttpMethod {
    match method.to_uppercase().as_str() {
        "POST" => HttpMethod::POST,
        "PUT" => HttpMethod::PUT,
        "PATCH" => HttpMethod::PATCH,
        "DELETE" => HttpMethod::DELETE,
        "HEAD" => HttpMethod::HEAD,
        "OPTIONS" => HttpMethod::OPTIONS,
        _ => HttpMethod::GET,
    }
}

// ── Export ──

pub fn export_collection(collection_path: &Path, format: &str) -> anyhow::Result<String> {
    let requests = crate::collection::load_request_files(collection_path)?;
    let config = crate::collection::load_config(collection_path)?;

    match format {
        "postman" => export_postman(&config.name, &requests),
        "insomnia" => export_insomnia_v5(collection_path, &config.name, &requests),
        "insomnia-v4" => export_insomnia_v4(&config.name, &requests),
        _ => anyhow::bail!(
            "Export format '{format}' not supported. Supported: postman, insomnia, insomnia-v4"
        ),
    }
}

fn export_postman(
    name: &str,
    requests: &[(String, RequestFile)],
) -> anyhow::Result<String> {
    let items: Vec<Value> = requests
        .iter()
        .map(|(_, req)| {
            let headers: Vec<Value> = req
                .headers
                .iter()
                .map(|(k, v)| {
                    serde_json::json!({ "key": k, "value": v })
                })
                .collect();

            let body = req.body.as_ref().map(|b| {
                let mode = match b.body_type.as_str() {
                    "json" | "xml" | "raw" | "text" => "raw",
                    "urlencoded" => "urlencoded",
                    "form-data" => "formdata",
                    _ => "raw",
                };
                serde_json::json!({
                    "mode": mode,
                    "raw": b.content
                })
            });

            let mut request = serde_json::json!({
                "method": req.method.as_str(),
                "header": headers,
                "url": { "raw": req.url },
            });
            if let Some(body_val) = body {
                request["body"] = body_val;
            }

            serde_json::json!({
                "name": req.name,
                "request": request
            })
        })
        .collect();

    let postman = serde_json::json!({
        "info": {
            "name": name,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items
    });

    Ok(serde_json::to_string_pretty(&postman)?)
}

fn export_insomnia_v5(
    collection_path: &Path,
    name: &str,
    requests: &[(String, RequestFile)],
) -> anyhow::Result<String> {
    let now_ms = chrono::Utc::now().timestamp_millis();
    let ws_id = format!("wrk_{}", uuid::Uuid::new_v4().simple());

    let mut collection = Vec::new();
    for (_, req) in requests {
        let req_id = format!("req_{}", uuid::Uuid::new_v4().simple());
        let headers: Vec<Value> = req
            .headers
            .iter()
            .map(|(k, v)| {
                serde_json::json!({
                    "name": k,
                    "value": add_insomnia_env_prefix(v),
                    "disabled": false
                })
            })
            .collect();

        let mut item = serde_json::json!({
            "url": add_insomnia_env_prefix(&req.url),
            "name": req.name,
            "meta": {
                "id": req_id,
                "created": now_ms,
                "modified": now_ms,
                "isPrivate": false,
                "description": req.description.clone().unwrap_or_default()
            },
            "method": req.method.as_str(),
            "headers": headers,
            "settings": {
                "renderRequestBody": true,
                "encodeUrl": true,
                "followRedirects": "global",
                "cookies": { "send": true, "store": true },
                "rebuildPath": true
            }
        });

        if let Some(params) = &req.params {
            if !params.is_empty() {
                let p_arr: Vec<Value> = params
                    .iter()
                    .map(|(k, v)| {
                        serde_json::json!({
                            "name": k,
                            "value": add_insomnia_env_prefix(v),
                            "disabled": false
                        })
                    })
                    .collect();
                item["parameters"] = serde_json::json!(p_arr);
            }
        }

        if let Some(body) = &req.body {
            let mime = match body.body_type.as_str() {
                "json" => "application/json",
                "xml" => "application/xml",
                "graphql" => "application/graphql",
                "urlencoded" => "application/x-www-form-urlencoded",
                "form-data" => "multipart/form-data",
                _ => "text/plain",
            };
            item["body"] = serde_json::json!({
                "mimeType": mime,
                "text": add_insomnia_env_prefix(&body.content)
            });
        }

        if let Some(auth) = &req.auth {
            match auth {
                AuthConfig::Bearer { token } => {
                    item["authentication"] = serde_json::json!({
                        "type": "bearer",
                        "token": add_insomnia_env_prefix(token),
                        "disabled": false
                    });
                }
                AuthConfig::Basic { username, password } => {
                    item["authentication"] = serde_json::json!({
                        "type": "basic",
                        "username": add_insomnia_env_prefix(username),
                        "password": add_insomnia_env_prefix(password),
                        "disabled": false
                    });
                }
                AuthConfig::ApiKey { key, value, .. } => {
                    item["authentication"] = serde_json::json!({
                        "type": "apikey",
                        "key": add_insomnia_env_prefix(key),
                        "value": add_insomnia_env_prefix(value),
                        "disabled": false
                    });
                }
                _ => {}
            }
        }

        let mut scripts = serde_json::json!({});
        if let Some(pre) = &req.pre_request_script {
            if !pre.is_empty() {
                scripts["preRequest"] = serde_json::json!(pre);
            }
        }
        if let Some(post) = &req.post_response_script {
            if !post.is_empty() {
                scripts["afterResponse"] = serde_json::json!(post);
            }
        }
        if scripts.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
            item["scripts"] = scripts;
        }

        collection.push(item);
    }

    let mut doc = serde_json::json!({
        "type": "collection.insomnia.rest/5.0",
        "schema_version": "5.1",
        "name": name,
        "meta": {
            "id": ws_id,
            "created": now_ms,
            "modified": now_ms,
            "description": ""
        },
        "collection": collection
    });

    if let Ok(env_files) = crate::collection::load_environments(collection_path) {
        if !env_files.is_empty() {
            let base_env = env_files.iter().find(|e| e.name.eq_ignore_ascii_case("base"));
            let base_data = base_env
                .map(|e| serde_json::json!(e.variables))
                .unwrap_or_else(|| serde_json::json!({}));

            let mut sub_envs = Vec::new();
            for env in &env_files {
                if env.name.eq_ignore_ascii_case("base") {
                    continue;
                }
                sub_envs.push(serde_json::json!({
                    "name": env.name,
                    "meta": {
                        "id": format!("env_{}", uuid::Uuid::new_v4().simple()),
                        "created": now_ms,
                        "modified": now_ms,
                        "isPrivate": false
                    },
                    "data": env.variables
                }));
            }

            doc["environments"] = serde_json::json!({
                "name": "Base Environment",
                "meta": {
                    "id": format!("env_{}", uuid::Uuid::new_v4().simple()),
                    "created": now_ms,
                    "modified": now_ms,
                    "isPrivate": false
                },
                "data": base_data,
                "subEnvironments": sub_envs
            });
        }
    }

    Ok(serde_yaml::to_string(&doc)?)
}

fn export_insomnia_v4(
    name: &str,
    requests: &[(String, RequestFile)],
) -> anyhow::Result<String> {
    let ws_id = format!("wrk_{}", uuid::Uuid::new_v4());
    let mut resources: Vec<Value> = vec![serde_json::json!({
        "_id": ws_id,
        "_type": "workspace",
        "name": name,
        "parentId": null,
        "scope": "collection"
    })];

    for (_, req) in requests {
        let req_id = format!("req_{}", uuid::Uuid::new_v4());
        let headers: Vec<Value> = req
            .headers
            .iter()
            .map(|(k, v)| {
                serde_json::json!({ "name": k, "value": v, "disabled": false })
            })
            .collect();

        let body = req.body.as_ref().map(|b| {
            let mime = match b.body_type.as_str() {
                "json" => "application/json",
                "xml" => "application/xml",
                "urlencoded" => "application/x-www-form-urlencoded",
                _ => "text/plain",
            };
            serde_json::json!({ "mimeType": mime, "text": b.content })
        });

        let mut resource = serde_json::json!({
            "_id": req_id,
            "_type": "request",
            "parentId": ws_id,
            "name": req.name,
            "method": req.method.as_str(),
            "url": req.url,
            "headers": headers,
            "description": req.description.clone().unwrap_or_default()
        });
        if let Some(b) = body {
            resource["body"] = b;
        }
        resources.push(resource);
    }

    let export = serde_json::json!({
        "_type": "export",
        "__export_format": 4,
        "__export_source": "apiark-cli",
        "resources": resources
    });

    Ok(serde_json::to_string_pretty(&export)?)
}

fn sanitize(name: &str) -> String {
    name.chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else {
                '_'
            }
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cli_strip_and_add_env_prefix() {
        let original = "{{ _.base_url }}/api/{{ _.version }}/users";
        let stripped = strip_insomnia_env_prefix(original);
        assert_eq!(stripped, "{{base_url}}/api/{{version}}/users");
        let added = add_insomnia_env_prefix(&stripped);
        assert_eq!(added, "{{ _.base_url }}/api/{{ _.version }}/users");
    }

    #[test]
    fn test_cli_detect_v5_and_v4() {
        let temp_dir = std::env::temp_dir();
        let v5_path = temp_dir.join("test_v5.yaml");
        let v4_path = temp_dir.join("test_v4.json");

        fs::write(
            &v5_path,
            "type: collection.insomnia.rest/5.0\nschema_version: \"5.1\"\nname: My API\ncollection: []\n",
        ).unwrap();

        fs::write(
            &v4_path,
            "{\"_type\": \"export\", \"__export_format\": 4, \"resources\": []}",
        ).unwrap();

        assert_eq!(detect_format(&v5_path).unwrap(), "insomnia");
        assert_eq!(detect_format(&v4_path).unwrap(), "insomnia");

        let _ = fs::remove_file(v5_path);
        let _ = fs::remove_file(v4_path);
    }
}
