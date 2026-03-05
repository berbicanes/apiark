use std::path::Path;

use serde_json::{json, Value};

use crate::models::auth::AuthConfig;
use crate::models::collection::{CollectionNode, RequestFile};
use crate::storage::collection::{load_collection_tree, read_request};

/// Export an ApiArk collection to Postman v2.1 JSON format.
pub fn export_to_postman(collection_path: &Path) -> Result<String, String> {
    let tree = load_collection_tree(collection_path)?;

    let (name, children) = match &tree {
        CollectionNode::Collection { name, children, .. } => (name.clone(), children),
        _ => return Err("Expected a collection node at root".to_string()),
    };

    let items = export_nodes(children)?;

    let postman = json!({
        "info": {
            "name": name,
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": items
    });

    serde_json::to_string_pretty(&postman)
        .map_err(|e| format!("Failed to serialize Postman JSON: {e}"))
}

fn export_nodes(nodes: &[CollectionNode]) -> Result<Vec<Value>, String> {
    let mut items = Vec::new();

    for node in nodes {
        match node {
            CollectionNode::Folder { name, children, .. } => {
                let sub_items = export_nodes(children)?;
                items.push(json!({
                    "name": name,
                    "item": sub_items
                }));
            }
            CollectionNode::Request { name, path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        items.push(export_request(name, &req));
                    }
                    Err(e) => {
                        tracing::warn!("Skipping request {name}: {e}");
                    }
                }
            }
            CollectionNode::Collection { name, children, .. } => {
                // Nested collections become folders
                let sub_items = export_nodes(children)?;
                items.push(json!({
                    "name": name,
                    "item": sub_items
                }));
            }
        }
    }

    Ok(items)
}

fn export_request(name: &str, req: &RequestFile) -> Value {
    let method = format!("{:?}", req.method);

    let headers: Vec<Value> = req
        .headers
        .iter()
        .map(|(k, v)| {
            json!({
                "key": k,
                "value": v,
                "type": "text"
            })
        })
        .collect();

    let mut request = json!({
        "method": method,
        "header": headers,
        "url": {
            "raw": req.url,
        }
    });

    // Body
    if let Some(body) = &req.body {
        let postman_body = match body.body_type.as_str() {
            "json" => json!({
                "mode": "raw",
                "raw": body.content,
                "options": {
                    "raw": {
                        "language": "json"
                    }
                }
            }),
            "xml" => json!({
                "mode": "raw",
                "raw": body.content,
                "options": {
                    "raw": {
                        "language": "xml"
                    }
                }
            }),
            "urlencoded" => {
                let pairs: Vec<Value> = body
                    .content
                    .split('&')
                    .filter_map(|pair| {
                        let mut parts = pair.splitn(2, '=');
                        let key = parts.next()?;
                        let value = parts.next().unwrap_or("");
                        Some(json!({"key": key, "value": value, "type": "text"}))
                    })
                    .collect();
                json!({
                    "mode": "urlencoded",
                    "urlencoded": pairs
                })
            }
            _ => json!({
                "mode": "raw",
                "raw": body.content
            }),
        };
        request
            .as_object_mut()
            .unwrap()
            .insert("body".to_string(), postman_body);
    }

    // Auth
    if let Some(auth) = &req.auth {
        if let Some(postman_auth) = export_auth(auth) {
            request
                .as_object_mut()
                .unwrap()
                .insert("auth".to_string(), postman_auth);
        }
    }

    // Description
    if let Some(desc) = &req.description {
        request
            .as_object_mut()
            .unwrap()
            .insert("description".to_string(), json!(desc));
    }

    let mut item = json!({
        "name": name,
        "request": request
    });

    // Scripts
    let mut events = Vec::new();
    if let Some(script) = &req.pre_request_script {
        events.push(json!({
            "listen": "prerequest",
            "script": {
                "exec": script.lines().collect::<Vec<_>>(),
                "type": "text/javascript"
            }
        }));
    }
    if let Some(script) = &req.tests {
        events.push(json!({
            "listen": "test",
            "script": {
                "exec": script.lines().collect::<Vec<_>>(),
                "type": "text/javascript"
            }
        }));
    }
    if !events.is_empty() {
        item.as_object_mut()
            .unwrap()
            .insert("event".to_string(), json!(events));
    }

    item
}

fn export_auth(auth: &AuthConfig) -> Option<Value> {
    match auth {
        AuthConfig::None => None,
        AuthConfig::Bearer { token } => Some(json!({
            "type": "bearer",
            "bearer": [
                {"key": "token", "value": token, "type": "string"}
            ]
        })),
        AuthConfig::Basic { username, password } => Some(json!({
            "type": "basic",
            "basic": [
                {"key": "username", "value": username, "type": "string"},
                {"key": "password", "value": password, "type": "string"}
            ]
        })),
        AuthConfig::ApiKey { key, value, add_to } => {
            let in_val = match add_to {
                crate::models::auth::ApiKeyLocation::Header => "header",
                crate::models::auth::ApiKeyLocation::Query => "query",
            };
            Some(json!({
                "type": "apikey",
                "apikey": [
                    {"key": "key", "value": key, "type": "string"},
                    {"key": "value", "value": value, "type": "string"},
                    {"key": "in", "value": in_val, "type": "string"}
                ]
            }))
        }
        AuthConfig::Oauth2 { .. } => {
            // OAuth2 export is complex and Postman has its own format — skip
            None
        }
        AuthConfig::Digest { username, password } => Some(json!({
            "type": "digest",
            "digest": [
                {"key": "username", "value": username, "type": "string"},
                {"key": "password", "value": password, "type": "string"}
            ]
        })),
        AuthConfig::AwsV4 {
            access_key,
            secret_key,
            region,
            service,
            session_token,
        } => Some(json!({
            "type": "awsv4",
            "awsv4": [
                {"key": "accessKey", "value": access_key, "type": "string"},
                {"key": "secretKey", "value": secret_key, "type": "string"},
                {"key": "region", "value": region, "type": "string"},
                {"key": "service", "value": service, "type": "string"},
                {"key": "sessionToken", "value": session_token, "type": "string"}
            ]
        })),
        AuthConfig::JwtBearer { .. } => {
            // JWT Bearer has no direct Postman equivalent
            None
        }
        AuthConfig::Ntlm {
            username, password, ..
        } => Some(json!({
            "type": "ntlm",
            "ntlm": [
                {"key": "username", "value": username, "type": "string"},
                {"key": "password", "value": password, "type": "string"}
            ]
        })),
    }
}
