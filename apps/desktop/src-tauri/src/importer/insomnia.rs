use std::collections::HashMap;

use serde_json::Value;

use super::{ImportBody, ImportData, ImportEnvironment, ImportItem, ImportWarning};
use crate::models::auth::AuthConfig;

/// Parse an Insomnia v4 export (JSON or YAML) into ImportData.
pub fn parse_insomnia(content: &str) -> Result<ImportData, String> {
    // Insomnia exports can be JSON or YAML — try JSON first, then YAML
    let root: Value = serde_json::from_str(content)
        .or_else(|_| {
            serde_yaml::from_str::<Value>(content)
                .map_err(|e| format!("Invalid Insomnia export: {e}"))
        })
        .map_err(|e| format!("Failed to parse Insomnia export: {e}"))?;

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
    let items = build_tree(&workspace_id, &children_map, &mut warnings);

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

fn build_tree(
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
                let sub_items = build_tree(id, children_map, warnings);
                items.push(ImportItem::Folder {
                    name,
                    items: sub_items,
                });
            }
            "request" => {
                if let Some(item) = parse_request(res, &name, warnings) {
                    items.push(item);
                }
            }
            _ => {} // Skip workspace, environment, etc.
        }
    }

    items
}

fn parse_request(res: &Value, name: &str, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let method = res
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();

    let url = res
        .get("url")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();

    let mut headers = HashMap::new();
    if let Some(header_arr) = res.get("headers").and_then(|v| v.as_array()) {
        for h in header_arr {
            if let (Some(k), Some(v)) = (
                h.get("name").and_then(|v| v.as_str()),
                h.get("value").and_then(|v| v.as_str()),
            ) {
                if !h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    headers.insert(k.to_string(), v.to_string());
                }
            }
        }
    }

    let body = parse_body(res.get("body"));

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
        body: Box::new(body),
        auth: Box::new(auth),
        description,
        pre_request_script: None,
        post_response_script: None,
        tests: None,
    })
}

fn parse_body(body_val: Option<&Value>) -> Option<ImportBody> {
    let body = body_val?;
    let mime = body.get("mimeType").and_then(|v| v.as_str()).unwrap_or("");

    let body_type = if mime.contains("json") {
        "json"
    } else if mime.contains("xml") {
        "xml"
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
        content,
    })
}

fn parse_auth(
    auth_val: Option<&Value>,
    name: &str,
    warnings: &mut Vec<ImportWarning>,
) -> Option<AuthConfig> {
    let auth = auth_val?;
    let auth_type = auth.get("type").and_then(|v| v.as_str())?;

    match auth_type {
        "bearer" => {
            let token = auth
                .get("token")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();
            Some(AuthConfig::Bearer { token })
        }
        "basic" => Some(AuthConfig::Basic {
            username: auth
                .get("username")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
            password: auth
                .get("password")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string(),
        }),
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
