use std::collections::HashMap;

use serde_json::Value;

use super::{ImportBody, ImportData, ImportEnvironment, ImportItem, ImportWarning};
use crate::models::auth::AuthConfig;

/// Parse a Postman Collection v2.1 JSON string into ImportData.
pub fn parse_postman(content: &str) -> Result<ImportData, String> {
    let root: Value = serde_json::from_str(content).map_err(|e| format!("Invalid JSON: {e}"))?;

    let info = root
        .get("info")
        .ok_or("Missing 'info' field — is this a Postman v2.1 collection?")?;

    let collection_name = info
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Imported Collection")
        .to_string();

    let mut warnings = Vec::new();

    let items = root
        .get("item")
        .and_then(|v| v.as_array())
        .map(|arr| parse_items(arr, &mut warnings))
        .unwrap_or_default();

    // Collection-level variables → environment
    let mut environments = Vec::new();
    if let Some(vars) = root.get("variable").and_then(|v| v.as_array()) {
        let mut variables = HashMap::new();
        for var in vars {
            if let (Some(key), Some(value)) = (
                var.get("key").and_then(|v| v.as_str()),
                var.get("value").and_then(|v| v.as_str()),
            ) {
                variables.insert(key.to_string(), value.to_string());
            }
        }
        if !variables.is_empty() {
            environments.push(ImportEnvironment {
                name: "Collection Variables".to_string(),
                variables,
            });
        }
    }

    Ok(ImportData {
        collection_name,
        items,
        environments,
        warnings,
    })
}

fn parse_items(items: &[Value], warnings: &mut Vec<ImportWarning>) -> Vec<ImportItem> {
    items
        .iter()
        .filter_map(|item| parse_item(item, warnings))
        .collect()
}

fn parse_item(item: &Value, warnings: &mut Vec<ImportWarning>) -> Option<ImportItem> {
    let name = item
        .get("name")
        .and_then(|v| v.as_str())
        .unwrap_or("Untitled")
        .to_string();

    // If it has nested "item", it's a folder
    if let Some(children) = item.get("item").and_then(|v| v.as_array()) {
        return Some(ImportItem::Folder {
            name,
            items: parse_items(children, warnings),
        });
    }

    // Otherwise it should have a "request" field
    let req = item.get("request")?;

    let method = req
        .get("method")
        .and_then(|v| v.as_str())
        .unwrap_or("GET")
        .to_uppercase();

    let url = parse_url(req.get("url"));

    let headers = parse_headers(req.get("header"));

    let body = parse_body(req.get("body"));

    let auth = parse_auth(req.get("auth"));

    let description = req
        .get("description")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    // Scripts from event array
    let mut pre_request_script = None;
    let post_response_script = None;
    let mut tests = None;

    if let Some(events) = item.get("event").and_then(|v| v.as_array()) {
        for event in events {
            let listen = event.get("listen").and_then(|v| v.as_str()).unwrap_or("");
            let script_src = event
                .get("script")
                .and_then(|s| s.get("exec"))
                .and_then(|e| {
                    if let Some(arr) = e.as_array() {
                        Some(
                            arr.iter()
                                .filter_map(|l| l.as_str())
                                .collect::<Vec<_>>()
                                .join("\n"),
                        )
                    } else {
                        e.as_str().map(|s| s.to_string())
                    }
                });

            if let Some(src) = script_src {
                if src.trim().is_empty() {
                    continue;
                }
                // Warn about pm.* API usage
                if src.contains("pm.") {
                    warnings.push(ImportWarning {
                        item_name: name.clone(),
                        message: "Script uses Postman's pm.* API. Replace with ark.* equivalents."
                            .to_string(),
                    });
                }
                match listen {
                    "prerequest" => pre_request_script = Some(src),
                    "test" => tests = Some(src),
                    _ => {}
                }
            }
        }
    }

    Some(ImportItem::Request {
        name,
        method,
        url,
        headers,
        body: Box::new(body),
        auth: Box::new(auth),
        description,
        pre_request_script,
        post_response_script,
        tests,
    })
}

fn parse_url(url_val: Option<&Value>) -> String {
    match url_val {
        None => String::new(),
        Some(v) if v.is_string() => v.as_str().unwrap_or("").to_string(),
        Some(v) => {
            // Postman URL object: { raw, host, path, query, ... }
            if let Some(raw) = v.get("raw").and_then(|r| r.as_str()) {
                return raw.to_string();
            }
            // Reconstruct from parts
            let host = v
                .get("host")
                .and_then(|h| h.as_array())
                .map(|parts| {
                    parts
                        .iter()
                        .filter_map(|p| p.as_str())
                        .collect::<Vec<_>>()
                        .join(".")
                })
                .unwrap_or_default();

            let path = v
                .get("path")
                .and_then(|p| p.as_array())
                .map(|parts| {
                    parts
                        .iter()
                        .filter_map(|p| p.as_str())
                        .collect::<Vec<_>>()
                        .join("/")
                })
                .unwrap_or_default();

            let protocol = v
                .get("protocol")
                .and_then(|p| p.as_str())
                .unwrap_or("https");

            format!("{protocol}://{host}/{path}")
        }
    }
}

fn parse_headers(headers_val: Option<&Value>) -> HashMap<String, String> {
    let mut map = HashMap::new();
    if let Some(arr) = headers_val.and_then(|v| v.as_array()) {
        for h in arr {
            if let (Some(key), Some(value)) = (
                h.get("key").and_then(|v| v.as_str()),
                h.get("value").and_then(|v| v.as_str()),
            ) {
                // Skip disabled headers
                if h.get("disabled").and_then(|v| v.as_bool()).unwrap_or(false) {
                    continue;
                }
                map.insert(key.to_string(), value.to_string());
            }
        }
    }
    map
}

fn parse_body(body_val: Option<&Value>) -> Option<ImportBody> {
    let body = body_val?;
    let mode = body.get("mode").and_then(|v| v.as_str())?;

    match mode {
        "raw" => {
            let content = body.get("raw").and_then(|v| v.as_str()).unwrap_or("");
            // Check language option for body type
            let lang = body
                .get("options")
                .and_then(|o| o.get("raw"))
                .and_then(|r| r.get("language"))
                .and_then(|l| l.as_str())
                .unwrap_or("json");

            let body_type = match lang {
                "json" => "json",
                "xml" => "xml",
                _ => "raw",
            };

            Some(ImportBody {
                body_type: body_type.to_string(),
                content: content.to_string(),
            })
        }
        "urlencoded" => {
            let pairs = body.get("urlencoded").and_then(|v| v.as_array());
            let content = pairs
                .map(|arr| {
                    arr.iter()
                        .filter_map(|p| {
                            let key = p.get("key").and_then(|v| v.as_str())?;
                            let val = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                            Some(format!("{key}={val}"))
                        })
                        .collect::<Vec<_>>()
                        .join("&")
                })
                .unwrap_or_default();

            Some(ImportBody {
                body_type: "urlencoded".to_string(),
                content,
            })
        }
        "formdata" => {
            let pairs = body.get("formdata").and_then(|v| v.as_array());
            // Store as JSON array for form-data
            let content = pairs
                .map(|arr| {
                    let items: Vec<serde_json::Value> = arr
                        .iter()
                        .filter_map(|p| {
                            let key = p.get("key").and_then(|v| v.as_str())?;
                            let val = p.get("value").and_then(|v| v.as_str()).unwrap_or("");
                            Some(serde_json::json!({"key": key, "value": val}))
                        })
                        .collect();
                    serde_json::to_string_pretty(&items).unwrap_or_default()
                })
                .unwrap_or_default();

            Some(ImportBody {
                body_type: "form-data".to_string(),
                content,
            })
        }
        _ => None,
    }
}

fn parse_auth(auth_val: Option<&Value>) -> Option<AuthConfig> {
    let auth = auth_val?;
    let auth_type = auth.get("type").and_then(|v| v.as_str())?;

    match auth_type {
        "bearer" => {
            let token = auth
                .get("bearer")
                .and_then(|b| b.as_array())
                .and_then(|arr| {
                    arr.iter().find_map(|item| {
                        if item.get("key").and_then(|v| v.as_str()) == Some("token") {
                            item.get("value")
                                .and_then(|v| v.as_str())
                                .map(|s| s.to_string())
                        } else {
                            None
                        }
                    })
                })
                .unwrap_or_default();

            Some(AuthConfig::Bearer { token })
        }
        "basic" => {
            let get_field = |field: &str| -> String {
                auth.get("basic")
                    .and_then(|b| b.as_array())
                    .and_then(|arr| {
                        arr.iter().find_map(|item| {
                            if item.get("key").and_then(|v| v.as_str()) == Some(field) {
                                item.get("value")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string())
                            } else {
                                None
                            }
                        })
                    })
                    .unwrap_or_default()
            };

            Some(AuthConfig::Basic {
                username: get_field("username"),
                password: get_field("password"),
            })
        }
        "apikey" => {
            let get_field = |field: &str| -> String {
                auth.get("apikey")
                    .and_then(|b| b.as_array())
                    .and_then(|arr| {
                        arr.iter().find_map(|item| {
                            if item.get("key").and_then(|v| v.as_str()) == Some(field) {
                                item.get("value")
                                    .and_then(|v| v.as_str())
                                    .map(|s| s.to_string())
                            } else {
                                None
                            }
                        })
                    })
                    .unwrap_or_default()
            };

            let add_to = match get_field("in").as_str() {
                "query" => crate::models::auth::ApiKeyLocation::Query,
                _ => crate::models::auth::ApiKeyLocation::Header,
            };

            Some(AuthConfig::ApiKey {
                key: get_field("key"),
                value: get_field("value"),
                add_to,
            })
        }
        "noauth" | "" => Some(AuthConfig::None),
        _ => None,
    }
}
