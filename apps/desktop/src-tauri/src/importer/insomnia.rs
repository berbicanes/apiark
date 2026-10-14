use std::collections::HashMap;
use std::sync::OnceLock;

use regex::Regex;
use serde_json::Value;

use super::{ImportBody, ImportData, ImportEnvironment, ImportItem, ImportWarning};
use crate::models::auth::{ApiKeyLocation, AuthConfig};

static STRIP_ENV_RE: OnceLock<Regex> = OnceLock::new();

/// Strip Insomnia variable environment prefix: `{{ _.var_name }}` -> `{{var_name}}`.
/// Also cleans non-breaking spaces (\u{00a0}).
pub fn strip_insomnia_env_prefix(input: &str) -> String {
    let cleaned = input.replace('\u{00a0}', " ");
    let re = STRIP_ENV_RE.get_or_init(|| Regex::new(r"\{\{\s*_\.([a-zA-Z0-9_\-\.]+)\s*\}\}").unwrap());
    re.replace_all(&cleaned, "{{$1}}").to_string()
}

/// Parse an Insomnia export (v4 JSON/YAML or v5 YAML/JSON) into ImportData.
pub fn parse_insomnia(content: &str) -> Result<ImportData, String> {
    // Insomnia exports can be JSON or YAML — try JSON first, then YAML
    let root: Value = serde_json::from_str(content)
        .or_else(|_| {
            serde_yaml::from_str::<Value>(content)
                .map_err(|e| format!("Invalid Insomnia export: {e}"))
        })
        .map_err(|e| format!("Failed to parse Insomnia export: {e}"))?;

    let is_v5 = root
        .get("type")
        .and_then(|v| v.as_str())
        .map(|t| t.contains("insomnia.rest/5") || t.contains("collection.insomnia.rest"))
        .unwrap_or(false)
        || root.get("collection").and_then(|v| v.as_array()).is_some();

    if is_v5 {
        parse_insomnia_v5(&root)
    } else if root.get("resources").and_then(|v| v.as_array()).is_some() {
        parse_insomnia_v4(&root)
    } else {
        Err("Missing 'collection' or 'resources' array — not a recognized Insomnia export".to_string())
    }
}

// ──────────────────────────────────────────
// Insomnia v5 Parser
// ──────────────────────────────────────────

fn parse_insomnia_v5(root: &Value) -> Result<ImportData, String> {
    let collection_name = root
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Imported Collection")
        .trim()
        .to_string();

    let collection_items = root
        .get("collection")
        .and_then(|v| v.as_array())
        .ok_or_else(|| "Missing 'collection' array in Insomnia v5 export".to_string())?;

    let mut warnings = Vec::new();
    let items = parse_v5_items(collection_items, &mut warnings);
    let environments = parse_v5_environments(root.get("environments"));

    Ok(ImportData {
        collection_name,
        items,
        environments,
        warnings,
    })
}

fn parse_v5_items(items_val: &[Value], warnings: &mut Vec<ImportWarning>) -> Vec<ImportItem> {
    let mut items = Vec::new();

    for item in items_val {
        let name = item
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled")
            .trim()
            .to_string();

        if let Some(children) = item.get("children").and_then(|v| v.as_array()) {
            let sub_items = parse_v5_items(children, warnings);
            items.push(ImportItem::Folder {
                name,
                items: sub_items,
            });
        } else if item.get("url").is_some() || item.get("method").is_some() {
            if let Some(req) = parse_v5_request(item, &name, warnings) {
                items.push(req);
            }
        }
    }

    items
}

fn parse_v5_request(res: &Value, name: &str, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let method = res
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();

    let raw_url = res.get("url").and_then(|v| v.as_str()).unwrap_or("");
    let url = strip_insomnia_env_prefix(raw_url).trim().to_string();

    let mut headers = HashMap::new();
    if let Some(header_arr) = res.get("headers").and_then(|v| v.as_array()) {
        for h in header_arr {
            if let (Some(k), Some(v)) = (
                h.get("name").and_then(|v| v.as_str()),
                h.get("value").and_then(|v| v.as_str()),
            ) {
                if !h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) && !k.is_empty() {
                    headers.insert(k.to_string(), strip_insomnia_env_prefix(v));
                }
            }
        }
    }

    let mut params_map = HashMap::new();
    if let Some(param_arr) = res.get("parameters").and_then(|v| v.as_array()) {
        for p in param_arr {
            if let (Some(k), Some(v)) = (
                p.get("name").and_then(|v| v.as_str()),
                p.get("value").and_then(|v| v.as_str()),
            ) {
                if !p.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) && !k.is_empty() {
                    params_map.insert(k.to_string(), strip_insomnia_env_prefix(v));
                }
            }
        }
    }
    let params = if params_map.is_empty() {
        None
    } else {
        Some(params_map)
    };

    let body = parse_v5_body(res.get("body"));
    let auth = parse_auth(res.get("authentication"), name, warnings);

    let description = res
        .get("description")
        .or_else(|| res.get("meta").and_then(|m| m.get("description")))
        .and_then(|v| v.as_str())
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string());

    let (pre_request_script, post_response_script) = if let Some(scripts) = res.get("scripts") {
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

    Some(ImportItem::Request {
        name: name.to_string(),
        method,
        url,
        headers,
        params,
        body: Box::new(body),
        auth: Box::new(auth),
        description,
        pre_request_script,
        post_response_script,
        tests: None,
    })
}

fn parse_v5_body(body_val: Option<&Value>) -> Option<ImportBody> {
    let body = body_val?;
    let mime = body.get("mimeType").and_then(|v| v.as_str()).unwrap_or("");

    if mime.contains("multipart") || mime.contains("form-data") {
        if let Some(params) = body.get("params").and_then(|v| v.as_array()) {
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
                return Some(ImportBody {
                    body_type: "form-data".to_string(),
                    content: serde_json::to_string_pretty(&items).unwrap_or_default(),
                });
            }
        }
    } else if mime.contains("urlencoded") {
        if let Some(params) = body.get("params").and_then(|v| v.as_array()) {
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
                return Some(ImportBody {
                    body_type: "urlencoded".to_string(),
                    content,
                });
            }
        }
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

    let content = body
        .get("text")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    if content.is_empty() {
        return None;
    }

    Some(ImportBody {
        body_type: body_type.to_string(),
        content: strip_insomnia_env_prefix(&content),
    })
}

fn parse_v5_environments(env_val: Option<&Value>) -> Vec<ImportEnvironment> {
    let mut environments = Vec::new();
    let Some(env_obj) = env_val else {
        return environments;
    };

    let mut base_vars = HashMap::new();
    if let Some(data) = env_obj.get("data").and_then(|v| v.as_object()) {
        for (k, val) in data {
            let value = match val {
                Value::String(s) => s.clone(),
                other => other.to_string(),
            };
            base_vars.insert(k.clone(), value);
        }
    }

    // Process subEnvironments
    if let Some(sub_envs) = env_obj.get("subEnvironments").and_then(|v| v.as_array()) {
        for se in sub_envs {
            let name = se
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Environment")
                .trim()
                .to_string();

            let mut merged_vars = base_vars.clone();
            if let Some(data) = se.get("data").and_then(|v| v.as_object()) {
                for (k, val) in data {
                    let value = match val {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    merged_vars.insert(k.clone(), value);
                }
            }

            if !merged_vars.is_empty() {
                environments.push(ImportEnvironment {
                    name,
                    variables: merged_vars,
                });
            }
        }
    }

    // If base environment had variables, also save standalone Base
    if !base_vars.is_empty() {
        let base_name = env_obj
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Base")
            .trim()
            .to_string();
        environments.push(ImportEnvironment {
            name: if base_name.is_empty() { "Base".to_string() } else { base_name },
            variables: base_vars,
        });
    }

    environments
}

// ──────────────────────────────────────────
// Insomnia v4 Parser
// ──────────────────────────────────────────

fn parse_insomnia_v4(root: &Value) -> Result<ImportData, String> {
    let resources = root
        .get("resources")
        .and_then(|v| v.as_array())
        .ok_or("Missing 'resources' array — is this an Insomnia v4 export?")?;

    let mut warnings = Vec::new();

    // Index resources by _id for tree building
    let mut by_id: HashMap<String, &Value> = HashMap::new();
    let mut children_map: HashMap<String, Vec<&Value>> = HashMap::new();
    let mut workspace_name = "Imported Collection".to_string();
    let mut workspace_id = String::new();

    for res in resources {
        let id = res.get("_id").and_then(|v| v.as_str()).unwrap_or("");
        let parent_id = res.get("parentId").and_then(|v| v.as_str()).unwrap_or("");
        let res_type = res.get("_type").and_then(|v| v.as_str()).unwrap_or("");

        if res_type == "workspace" {
            workspace_name = res
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Imported Collection")
                .to_string();
            workspace_id = id.to_string();
        }

        by_id.insert(id.to_string(), res);
        children_map
            .entry(parent_id.to_string())
            .or_default()
            .push(res);
    }

    // Build tree from workspace root
    let items = build_tree_v4(&workspace_id, &children_map, &mut warnings);

    // Extract environments
    let mut environments = Vec::new();
    for res in resources {
        let res_type = res.get("_type").and_then(|v| v.as_str()).unwrap_or("");
        if res_type == "environment" {
            let name = res
                .get("name")
                .and_then(|v| v.as_str())
                .unwrap_or("Default")
                .to_string();
            let mut variables = HashMap::new();
            if let Some(data) = res.get("data").and_then(|v| v.as_object()) {
                for (key, val) in data {
                    let value = match val {
                        Value::String(s) => s.clone(),
                        other => other.to_string(),
                    };
                    variables.insert(key.clone(), value);
                }
            }
            if !variables.is_empty() {
                environments.push(ImportEnvironment { name, variables });
            }
        }
    }

    Ok(ImportData {
        collection_name: workspace_name,
        items,
        environments,
        warnings,
    })
}

fn build_tree_v4(
    parent_id: &str,
    children_map: &HashMap<String, Vec<&Value>>,
    warnings: &mut Vec<ImportWarning>,
) -> Vec<ImportItem> {
    let children = match children_map.get(parent_id) {
        Some(c) => c,
        None => return Vec::new(),
    };

    let mut items = Vec::new();

    for res in children {
        let res_type = res.get("_type").and_then(|v| v.as_str()).unwrap_or("");
        let id = res.get("_id").and_then(|v| v.as_str()).unwrap_or("");
        let name = res
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or("Untitled")
            .to_string();

        match res_type {
            "request_group" => {
                let sub_items = build_tree_v4(id, children_map, warnings);
                items.push(ImportItem::Folder {
                    name,
                    items: sub_items,
                });
            }
            "request" => {
                if let Some(item) = parse_request_v4(res, &name, warnings) {
                    items.push(item);
                }
            }
            _ => {} // Skip workspace, environment, etc.
        }
    }

    items
}

fn parse_request_v4(res: &Value, name: &str, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let method = res
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();

    let raw_url = res
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    let url = strip_insomnia_env_prefix(raw_url).trim().to_string();

    let mut headers = HashMap::new();
    if let Some(header_arr) = res.get("headers").and_then(|v| v.as_array()) {
        for h in header_arr {
            if let (Some(k), Some(v)) = (
                h.get("name").and_then(|v| v.as_str()),
                h.get("value").and_then(|v| v.as_str()),
            ) {
                if !h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    headers.insert(k.to_string(), strip_insomnia_env_prefix(v));
                }
            }
        }
    }

    let mut params_map = HashMap::new();
    if let Some(param_arr) = res.get("parameters").and_then(|v| v.as_array()) {
        for p in param_arr {
            if let (Some(k), Some(v)) = (
                p.get("name").and_then(|v| v.as_str()),
                p.get("value").and_then(|v| v.as_str()),
            ) {
                if !p.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) && !k.is_empty() {
                    params_map.insert(k.to_string(), strip_insomnia_env_prefix(v));
                }
            }
        }
    }
    let params = if params_map.is_empty() {
        None
    } else {
        Some(params_map)
    };

    let body = parse_v5_body(res.get("body"));
    let auth = parse_auth(res.get("authentication"), name, warnings);

    let description = res
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Some(ImportItem::Request {
        name: name.to_string(),
        method,
        url,
        headers,
        params,
        body: Box::new(body),
        auth: Box::new(auth),
        description,
        pre_request_script: None,
        post_response_script: None,
        tests: None,
    })
}

fn parse_auth(
    auth_val: Option<&Value>,
    name: &str,
    warnings: &mut Vec<ImportWarning>,
) -> Option<AuthConfig> {
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
        "" | "none" => None,
        other => {
            warnings.push(ImportWarning {
                item_name: name.to_string(),
                message: format!("Unsupported auth type '{other}' — skipped."),
            });
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_strip_insomnia_env_prefix() {
        assert_eq!(
            strip_insomnia_env_prefix("{{ _.base_url }}/users/{{ _.id }}"),
            "{{base_url}}/users/{{id}}"
        );
        assert_eq!(
            strip_insomnia_env_prefix("{{base_url}}/users"),
            "{{base_url}}/users"
        );
        assert_eq!(
            strip_insomnia_env_prefix("\u{00a0}{{ _.foo }}"),
            " {{foo}}"
        );
    }

    #[test]
    fn test_parse_v5_yaml_collection() {
        let yaml = r#"
type: collection.insomnia.rest/5.0
schema_version: "5.1"
name: Test API
collection:
  - name: Auth
    children:
      - name: Login
        url: "{{ _.base_url }}/auth/login"
        method: POST
        headers:
          - name: Content-Type
            value: application/json
        body:
          mimeType: application/json
          text: '{"username": "{{ _.username }}"}'
        scripts:
          preRequest: console.log("pre");
          afterResponse: insomnia.test("status 200", () => {});
environments:
  name: Base Environment
  data:
    base_url: https://api.example.com
    username: admin
  subEnvironments:
    - name: Dev
      data:
        base_url: https://dev.example.com
"#;

        let data = parse_insomnia(yaml).unwrap();
        assert_eq!(data.collection_name, "Test API");
        assert_eq!(data.items.len(), 1);

        match &data.items[0] {
            ImportItem::Folder { name, items } => {
                assert_eq!(name, "Auth");
                assert_eq!(items.len(), 1);
                match &items[0] {
                    ImportItem::Request {
                        name,
                        method,
                        url,
                        headers,
                        body,
                        pre_request_script,
                        post_response_script,
                        ..
                    } => {
                        assert_eq!(name, "Login");
                        assert_eq!(method, "POST");
                        assert_eq!(url, "{{base_url}}/auth/login");
                        assert_eq!(headers.get("Content-Type").unwrap(), "application/json");
                        assert_eq!(body.as_ref().as_ref().unwrap().body_type, "json");
                        assert_eq!(
                            body.as_ref().as_ref().unwrap().content,
                            r#"{"username": "{{username}}"}"#
                        );
                        assert_eq!(pre_request_script.as_deref(), Some("console.log(\"pre\");"));
                        assert_eq!(
                            post_response_script.as_deref(),
                            Some("insomnia.test(\"status 200\", () => {});")
                        );
                    }
                    _ => panic!("Expected request"),
                }
            }
            _ => panic!("Expected folder"),
        }

        // Environments: Dev has merged base_url and inherited username, plus standalone Base
        assert_eq!(data.environments.len(), 2);
        let dev_env = data.environments.iter().find(|e| e.name == "Dev").unwrap();
        assert_eq!(dev_env.variables.get("base_url").unwrap(), "https://dev.example.com");
        assert_eq!(dev_env.variables.get("username").unwrap(), "admin");

        let base_env = data.environments.iter().find(|e| e.name == "Base Environment").unwrap();
        assert_eq!(base_env.variables.get("base_url").unwrap(), "https://api.example.com");
        assert_eq!(base_env.variables.get("username").unwrap(), "admin");
    }

    #[test]
    fn test_parse_v4_json_collection() {
        let json = r#"{
  "_type": "export",
  "__export_format": 4,
  "resources": [
    {
      "_id": "wrk_1",
      "_type": "workspace",
      "name": "V4 Workspace"
    },
    {
      "_id": "req_1",
      "_type": "request",
      "parentId": "wrk_1",
      "name": "Get Info",
      "method": "GET",
      "url": "https://api.example.com/info"
    }
  ]
}"#;

        let data = parse_insomnia(json).unwrap();
        assert_eq!(data.collection_name, "V4 Workspace");
        assert_eq!(data.items.len(), 1);
    }

    #[test]
    fn test_parse_attached_v5_sample_if_present() {
        let sample_path = r"C:\Users\WORKPLUS\AppData\Local\Temp\monocode-attachments\18576-1791954559473366900-Molect-Podi-v5-no-env.yaml";
        if let Ok(content) = std::fs::read_to_string(sample_path) {
            let data = parse_insomnia(&content).expect("Should parse attached Insomnia v5 YAML export");
            assert_eq!(data.collection_name, "Molec Podi Stripped Identity");
            let preview = data.preview();
            assert_eq!(preview.request_count, 179);
            assert_eq!(preview.folder_count, 26);
            assert_eq!(preview.environment_count, 3);
        }
    }
}
