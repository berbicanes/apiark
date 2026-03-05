use std::collections::HashMap;
use std::path::Path;

use serde_json::{json, Value};

use crate::models::collection::{CollectionNode, RequestFile};
use crate::storage::collection::{load_collection_tree, read_request};

/// Export an ApiArk collection to OpenAPI 3.0 JSON format.
pub fn export_to_openapi(collection_path: &Path) -> Result<String, String> {
    let tree = load_collection_tree(collection_path)?;

    let (name, children) = match &tree {
        CollectionNode::Collection { name, children, .. } => (name.clone(), children),
        _ => return Err("Expected a collection node at root".to_string()),
    };

    let mut paths: HashMap<String, HashMap<String, Value>> = HashMap::new();
    let mut tags: Vec<String> = Vec::new();

    collect_operations(children, &mut paths, &mut tags, None)?;

    // Build tags array
    let tags_array: Vec<Value> = tags.iter().map(|t| json!({"name": t})).collect();

    // Build paths object
    let mut paths_obj = serde_json::Map::new();
    for (path, methods) in &paths {
        let mut methods_obj = serde_json::Map::new();
        for (method, operation) in methods {
            methods_obj.insert(method.clone(), operation.clone());
        }
        paths_obj.insert(path.clone(), Value::Object(methods_obj));
    }

    let openapi = json!({
        "openapi": "3.0.3",
        "info": {
            "title": name,
            "version": "1.0.0"
        },
        "paths": paths_obj,
        "tags": tags_array
    });

    serde_json::to_string_pretty(&openapi)
        .map_err(|e| format!("Failed to serialize OpenAPI JSON: {e}"))
}

fn collect_operations(
    nodes: &[CollectionNode],
    paths: &mut HashMap<String, HashMap<String, Value>>,
    tags: &mut Vec<String>,
    current_tag: Option<&str>,
) -> Result<(), String> {
    for node in nodes {
        match node {
            CollectionNode::Folder { name, children, .. } => {
                if !tags.contains(name) {
                    tags.push(name.clone());
                }
                collect_operations(children, paths, tags, Some(name))?;
            }
            CollectionNode::Request { path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        add_operation(&req, paths, current_tag);
                    }
                    Err(e) => {
                        tracing::warn!("Skipping request: {e}");
                    }
                }
            }
            CollectionNode::Collection { children, name, .. } => {
                collect_operations(children, paths, tags, Some(name))?;
            }
        }
    }
    Ok(())
}

fn add_operation(
    req: &RequestFile,
    paths: &mut HashMap<String, HashMap<String, Value>>,
    tag: Option<&str>,
) {
    // Extract path from URL (strip scheme + host)
    let url_path = extract_path(&req.url);
    let method = format!("{:?}", req.method).to_lowercase();

    let mut operation = json!({
        "summary": req.name,
        "responses": {
            "200": {
                "description": "Successful response"
            }
        }
    });

    if let Some(tag) = tag {
        operation
            .as_object_mut()
            .unwrap()
            .insert("tags".to_string(), json!([tag]));
    }

    if let Some(desc) = &req.description {
        operation
            .as_object_mut()
            .unwrap()
            .insert("description".to_string(), json!(desc));
    }

    // Parameters from headers
    let mut parameters: Vec<Value> = req
        .headers
        .iter()
        .filter(|(k, _)| {
            // Skip standard headers
            let lower = k.to_lowercase();
            !matches!(
                lower.as_str(),
                "content-type" | "accept" | "authorization" | "user-agent"
            )
        })
        .map(|(k, v)| {
            json!({
                "name": k,
                "in": "header",
                "schema": {"type": "string"},
                "example": v
            })
        })
        .collect();

    // Parameters from query params
    if let Some(params) = &req.params {
        for (k, v) in params {
            parameters.push(json!({
                "name": k,
                "in": "query",
                "schema": {"type": "string"},
                "example": v
            }));
        }
    }

    if !parameters.is_empty() {
        operation
            .as_object_mut()
            .unwrap()
            .insert("parameters".to_string(), json!(parameters));
    }

    // Request body
    if let Some(body) = &req.body {
        let content_type = match body.body_type.as_str() {
            "json" => "application/json",
            "xml" => "application/xml",
            "urlencoded" => "application/x-www-form-urlencoded",
            "form-data" => "multipart/form-data",
            _ => "text/plain",
        };

        // Try to parse body content as JSON for schema inference
        let example = if body.body_type == "json" {
            serde_json::from_str::<Value>(&body.content).ok()
        } else {
            None
        };

        let mut media_type = json!({});
        if let Some(example_val) = example {
            media_type
                .as_object_mut()
                .unwrap()
                .insert("example".to_string(), example_val);
        }

        let request_body = json!({
            "content": {
                content_type: media_type
            }
        });

        operation
            .as_object_mut()
            .unwrap()
            .insert("requestBody".to_string(), request_body);
    }

    paths.entry(url_path).or_default().insert(method, operation);
}

/// Extract the path portion from a URL, handling variables.
fn extract_path(url: &str) -> String {
    // Try to parse as URL
    if let Ok(parsed) = url::Url::parse(url) {
        let path = parsed.path().to_string();
        if path.is_empty() {
            "/".to_string()
        } else {
            path
        }
    } else {
        // URL might contain template variables like {{baseUrl}}/path
        // Extract everything after the last }} or after ://host
        if let Some(idx) = url.find("}}") {
            let rest = &url[idx + 2..];
            if rest.is_empty() {
                "/".to_string()
            } else {
                rest.to_string()
            }
        } else {
            format!("/{url}")
        }
    }
}
