use std::path::Path;

use serde_json::{json, Value};

use crate::models::auth::AuthConfig;
use crate::models::collection::{CollectionNode, RequestFile};
use crate::storage::collection::{load_collection_tree, read_request};

/// Export an ApiArk collection to Insomnia v4 JSON format.
pub fn export_to_insomnia(collection_path: &Path) -> Result<String, String> {
    let tree = load_collection_tree(collection_path)?;

    let (name, children) = match &tree {
        CollectionNode::Collection { name, children, .. } => (name.clone(), children),
        _ => return Err("Expected a collection node at root".to_string()),
    };

    let workspace_id = format!("wrk_{}", uuid::Uuid::new_v4());
    let mut resources: Vec<Value> = Vec::new();

    // Workspace resource
    resources.push(json!({
        "_id": workspace_id,
        "_type": "workspace",
        "name": name,
        "parentId": null,
        "description": "",
        "scope": "collection"
    }));

    // Export nodes recursively
    export_nodes(&mut resources, children, &workspace_id)?;

    let export = json!({
        "_type": "export",
        "__export_format": 4,
        "__export_source": "apiark",
        "resources": resources
    });

    serde_json::to_string_pretty(&export)
        .map_err(|e| format!("Failed to serialize Insomnia JSON: {e}"))
}

fn export_nodes(
    resources: &mut Vec<Value>,
    nodes: &[CollectionNode],
    parent_id: &str,
) -> Result<(), String> {
    for node in nodes {
        match node {
            CollectionNode::Folder { name, children, .. }
            | CollectionNode::Collection { name, children, .. } => {
                let folder_id = format!("fld_{}", uuid::Uuid::new_v4());
                resources.push(json!({
                    "_id": folder_id,
                    "_type": "request_group",
                    "name": name,
                    "parentId": parent_id,
                    "description": ""
                }));
                export_nodes(resources, children, &folder_id)?;
            }
            CollectionNode::Request { name, path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        resources.push(export_request(name, &req, parent_id));
                    }
                    Err(e) => {
                        tracing::warn!("Skipping request {name}: {e}");
                    }
                }
            }
        }
    }
    Ok(())
}

fn export_request(name: &str, req: &RequestFile, parent_id: &str) -> Value {
    let req_id = format!("req_{}", uuid::Uuid::new_v4());

    let headers: Vec<Value> = req
        .headers
        .iter()
        .map(|(k, v)| {
            json!({
                "name": k,
                "value": v,
                "disabled": false
            })
        })
        .collect();

    let body = req.body.as_ref().map(|b| {
        let mime_type = match b.body_type.as_str() {
            "json" => "application/json",
            "xml" => "application/xml",
            "urlencoded" | "form-urlencoded" => "application/x-www-form-urlencoded",
            "form-data" => "multipart/form-data",
            _ => "text/plain",
        };
        json!({
            "mimeType": mime_type,
            "text": b.content
        })
    });

    let auth = req.auth.as_ref().and_then(export_auth);

    let mut request = json!({
        "_id": req_id,
        "_type": "request",
        "parentId": parent_id,
        "name": name,
        "method": format!("{:?}", req.method),
        "url": req.url,
        "headers": headers,
        "description": req.description.clone().unwrap_or_default()
    });

    if let Some(body_val) = body {
        request["body"] = body_val;
    }
    if let Some(auth_val) = auth {
        request["authentication"] = auth_val;
    }

    request
}

fn export_auth(auth: &AuthConfig) -> Option<Value> {
    match auth {
        AuthConfig::Bearer { token } => Some(json!({
            "type": "bearer",
            "token": token
        })),
        AuthConfig::Basic { username, password } => Some(json!({
            "type": "basic",
            "username": username,
            "password": password
        })),
        AuthConfig::ApiKey { key, value, .. } => Some(json!({
            "type": "apikey",
            "key": key,
            "value": value
        })),
        AuthConfig::None => None,
        _ => None,
    }
}
