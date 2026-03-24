use std::collections::HashMap;
use std::fs;
use std::path::Path;

use serde_json::Value;

use crate::models::{CollectionConfig, HttpMethod, RequestBodyFile, RequestFile};

// ── Format Detection ──

pub fn detect_format(file_path: &Path) -> anyhow::Result<String> {
    let content = fs::read_to_string(file_path)?;

    if let Ok(json) = serde_json::from_str::<Value>(&content) {
        // Postman v2.1
        if json.get("info").and_then(|i| i.get("schema")).is_some() {
            return Ok("postman".to_string());
        }
        // Insomnia v4
        if json.get("resources").is_some() || json.get("__export_format").is_some() {
            return Ok("insomnia".to_string());
        }
        // OpenAPI
        if json.get("openapi").is_some() || json.get("swagger").is_some() {
            return Ok("openapi".to_string());
        }
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
        _ => anyhow::bail!("Import format '{format}' not supported in CLI. Supported: postman, insomnia"),
    }
}

fn import_postman(content: &str, output_dir: &Path) -> anyhow::Result<usize> {
    let json: Value = serde_json::from_str(content)?;

    let name = json
        .get("info")
        .and_then(|i| i.get("name"))
        .and_then(|n| n.as_str())
        .unwrap_or("Imported Collection");

    // Create collection directory
    let collection_dir = output_dir.join(sanitize(name));
    fs::create_dir_all(&collection_dir)?;

    // Write collection config
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

    // Import items
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

        // Check if folder (has sub-items)
        if let Some(sub_items) = item.get("item").and_then(|i| i.as_array()) {
            let folder_dir = dir.join(sanitize(name));
            fs::create_dir_all(&folder_dir)?;
            import_postman_items(sub_items, &folder_dir, count)?;
        } else if let Some(request) = item.get("request") {
            // It's a request
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
                method: match method.to_uppercase().as_str() {
                    "POST" => HttpMethod::POST,
                    "PUT" => HttpMethod::PUT,
                    "PATCH" => HttpMethod::PATCH,
                    "DELETE" => HttpMethod::DELETE,
                    "HEAD" => HttpMethod::HEAD,
                    "OPTIONS" => HttpMethod::OPTIONS,
                    _ => HttpMethod::GET,
                },
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
    let json: Value = serde_json::from_str(content)?;
    let resources = json
        .get("resources")
        .and_then(|r| r.as_array())
        .ok_or_else(|| anyhow::anyhow!("Invalid Insomnia format: missing resources"))?;

    // Find workspace
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

    // Build parent→children map
    let mut children_map: HashMap<String, Vec<&Value>> = HashMap::new();
    for res in resources {
        let parent = res
            .get("parentId")
            .and_then(|p| p.as_str())
            .unwrap_or("");
        children_map.entry(parent.to_string()).or_default().push(res);
    }

    let mut count = 0;
    import_insomnia_children(&children_map, ws_id, &collection_dir, &mut count)?;

    Ok(count)
}

fn import_insomnia_children(
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
                import_insomnia_children(children_map, res_id, &folder_dir, count)?;
            }
            "request" => {
                let method = res
                    .get("method")
                    .and_then(|m| m.as_str())
                    .unwrap_or("GET");
                let url = res
                    .get("url")
                    .and_then(|u| u.as_str())
                    .unwrap_or("")
                    .to_string();

                let mut headers = HashMap::new();
                if let Some(arr) = res.get("headers").and_then(|h| h.as_array()) {
                    for h in arr {
                        let key = h.get("name").and_then(|k| k.as_str()).unwrap_or("");
                        let val = h.get("value").and_then(|v| v.as_str()).unwrap_or("");
                        if !key.is_empty() {
                            headers.insert(key.to_string(), val.to_string());
                        }
                    }
                }

                let body = res.get("body").and_then(|b| {
                    let text = b.get("text").and_then(|t| t.as_str()).unwrap_or("");
                    let mime = b
                        .get("mimeType")
                        .and_then(|m| m.as_str())
                        .unwrap_or("text/plain");
                    if text.is_empty() {
                        return None;
                    }
                    let body_type = if mime.contains("json") {
                        "json"
                    } else if mime.contains("xml") {
                        "xml"
                    } else if mime.contains("urlencoded") {
                        "urlencoded"
                    } else {
                        "raw"
                    };
                    Some(RequestBodyFile {
                        body_type: body_type.to_string(),
                        content: text.to_string(),
                    })
                });

                let req = RequestFile {
                    name: name.to_string(),
                    method: match method.to_uppercase().as_str() {
                        "POST" => HttpMethod::POST,
                        "PUT" => HttpMethod::PUT,
                        "PATCH" => HttpMethod::PATCH,
                        "DELETE" => HttpMethod::DELETE,
                        "HEAD" => HttpMethod::HEAD,
                        "OPTIONS" => HttpMethod::OPTIONS,
                        _ => HttpMethod::GET,
                    },
                    url,
                    description: res
                        .get("description")
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
            _ => {}
        }
    }
    Ok(())
}

// ── Export ──

pub fn export_collection(collection_path: &Path, format: &str) -> anyhow::Result<String> {
    let requests = crate::collection::load_request_files(collection_path)?;
    let config = crate::collection::load_config(collection_path)?;

    match format {
        "postman" => export_postman(&config.name, &requests),
        "insomnia" => export_insomnia(&config.name, &requests),
        _ => anyhow::bail!(
            "Export format '{format}' not supported. Supported: postman, insomnia"
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

fn export_insomnia(
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
