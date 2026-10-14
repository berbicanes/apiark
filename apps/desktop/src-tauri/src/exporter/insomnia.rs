use std::path::Path;
use std::sync::OnceLock;

use regex::Regex;
use serde_json::{json, Value};

use crate::models::auth::AuthConfig;
use crate::models::collection::{CollectionNode, RequestFile};
use crate::storage::collection::{load_collection_tree, read_request};

static ADD_ENV_RE: OnceLock<Regex> = OnceLock::new();

/// Prefix template variables with `_.` for Insomnia v5 YAML export.
/// System variables starting with `$` or already prefixed with `_` are left untouched.
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

/// Default Insomnia export (v5 YAML).
#[allow(dead_code)]
pub fn export_to_insomnia(collection_path: &Path) -> Result<String, String> {
    export_to_insomnia_v5(collection_path)
}

/// Export an ApiArk collection to Insomnia v5 YAML format.
pub fn export_to_insomnia_v5(collection_path: &Path) -> Result<String, String> {
    let tree = load_collection_tree(collection_path)?;

    let (name, children) = match &tree {
        CollectionNode::Collection { name, children, .. } => (name.clone(), children),
        _ => return Err("Expected a collection node at root".to_string()),
    };

    let now_ms = chrono::Utc::now().timestamp_millis();
    let workspace_id = format!("wrk_{}", uuid::Uuid::new_v4().simple());

    // Export collection items recursively
    let collection_items = export_nodes_v5(children, now_ms)?;

    // Export environments
    let environments_val = export_environments_v5(collection_path, now_ms);

    let mut export = json!({
        "type": "collection.insomnia.rest/5.0",
        "schema_version": "5.1",
        "name": name,
        "meta": {
            "id": workspace_id,
            "created": now_ms,
            "modified": now_ms,
            "description": ""
        },
        "collection": collection_items
    });

    if let Some(env_val) = environments_val {
        export["environments"] = env_val;
    }

    serde_yaml::to_string(&export)
        .map_err(|e| format!("Failed to serialize Insomnia v5 YAML: {e}"))
}

fn export_nodes_v5(nodes: &[CollectionNode], now_ms: i64) -> Result<Vec<Value>, String> {
    let mut items = Vec::new();

    for node in nodes {
        match node {
            CollectionNode::Folder { name, children, .. }
            | CollectionNode::Collection { name, children, .. } => {
                let folder_id = format!("fld_{}", uuid::Uuid::new_v4().simple());
                let sub_items = export_nodes_v5(children, now_ms)?;
                items.push(json!({
                    "name": name,
                    "meta": {
                        "id": folder_id,
                        "created": now_ms,
                        "modified": now_ms,
                        "description": ""
                    },
                    "children": sub_items
                }));
            }
            CollectionNode::Request { name, path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        items.push(export_request_v5(name, &req, now_ms));
                    }
                    Err(e) => {
                        tracing::warn!("Skipping request {name}: {e}");
                    }
                }
            }
        }
    }

    Ok(items)
}

fn export_request_v5(name: &str, req: &RequestFile, now_ms: i64) -> Value {
    let req_id = format!("req_{}", uuid::Uuid::new_v4().simple());

    let headers: Vec<Value> = req
        .headers
        .iter()
        .map(|(k, v)| {
            json!({
                "name": k,
                "value": add_insomnia_env_prefix(v),
                "disabled": false
            })
        })
        .collect();

    let mut request = json!({
        "url": add_insomnia_env_prefix(&req.url),
        "name": name,
        "meta": {
            "id": req_id,
            "created": now_ms,
            "modified": now_ms,
            "isPrivate": false,
            "description": req.description.clone().unwrap_or_default()
        },
        "method": format!("{:?}", req.method),
        "headers": headers,
        "settings": {
            "renderRequestBody": true,
            "encodeUrl": true,
            "followRedirects": "global",
            "cookies": {
                "send": true,
                "store": true
            },
            "rebuildPath": true
        }
    });

    if let Some(params_map) = &req.params {
        if !params_map.is_empty() {
            let params_arr: Vec<Value> = params_map
                .iter()
                .map(|(k, v)| {
                    json!({
                        "name": k,
                        "value": add_insomnia_env_prefix(v),
                        "disabled": false
                    })
                })
                .collect();
            request["parameters"] = json!(params_arr);
        }
    }

    if let Some(body) = &req.body {
        let mime_type = match body.body_type.as_str() {
            "json" => "application/json",
            "xml" => "application/xml",
            "graphql" => "application/graphql",
            "urlencoded" | "form-urlencoded" => "application/x-www-form-urlencoded",
            "form-data" => "multipart/form-data",
            _ => "text/plain",
        };
        request["body"] = json!({
            "mimeType": mime_type,
            "text": add_insomnia_env_prefix(&body.content)
        });
    }

    if let Some(auth) = req.auth.as_ref().and_then(export_auth_v5) {
        request["authentication"] = auth;
    }

    let mut scripts = json!({});
    if let Some(pre) = &req.pre_request_script {
        if !pre.is_empty() {
            scripts["preRequest"] = json!(pre);
        }
    }
    if let Some(post) = &req.post_response_script {
        if !post.is_empty() {
            scripts["afterResponse"] = json!(post);
        }
    }
    if scripts.as_object().map(|o| !o.is_empty()).unwrap_or(false) {
        request["scripts"] = scripts;
    }

    request
}

fn export_auth_v5(auth: &AuthConfig) -> Option<Value> {
    match auth {
        AuthConfig::Bearer { token } => Some(json!({
            "type": "bearer",
            "token": add_insomnia_env_prefix(token),
            "disabled": false
        })),
        AuthConfig::Basic { username, password } => Some(json!({
            "type": "basic",
            "username": add_insomnia_env_prefix(username),
            "password": add_insomnia_env_prefix(password),
            "disabled": false
        })),
        AuthConfig::ApiKey { key, value, .. } => Some(json!({
            "type": "apikey",
            "key": add_insomnia_env_prefix(key),
            "value": add_insomnia_env_prefix(value),
            "disabled": false
        })),
        AuthConfig::None => None,
        _ => None,
    }
}

fn export_environments_v5(collection_path: &Path, now_ms: i64) -> Option<Value> {
    let env_files = crate::storage::environment::load_environments(collection_path).ok()?;
    let shared_envs: Vec<_> = env_files
        .into_iter()
        .filter(|e| matches!(e.scope, crate::models::environment::EnvironmentScope::Shared))
        .collect();
    if shared_envs.is_empty() {
        return None;
    }

    let base_env = shared_envs.iter().find(|e| e.name.eq_ignore_ascii_case("base"));
    let base_data = base_env
        .map(|e| json!(e.variables))
        .unwrap_or_else(|| json!({}));

    let mut sub_envs = Vec::new();
    for env in &shared_envs {
        if env.name.eq_ignore_ascii_case("base") {
            continue;
        }
        let env_id = format!("env_{}", uuid::Uuid::new_v4().simple());
        sub_envs.push(json!({
            "name": env.name,
            "meta": {
                "id": env_id,
                "created": now_ms,
                "modified": now_ms,
                "isPrivate": false
            },
            "data": env.variables
        }));
    }

    let root_env_id = format!("env_{}", uuid::Uuid::new_v4().simple());
    Some(json!({
        "name": "Base Environment",
        "meta": {
            "id": root_env_id,
            "created": now_ms,
            "modified": now_ms,
            "isPrivate": false
        },
        "data": base_data,
        "subEnvironments": sub_envs
    }))
}

// ──────────────────────────────────────────
// Insomnia v4 Exporter (Legacy)
// ──────────────────────────────────────────

/// Export an ApiArk collection to Insomnia v4 JSON format.
pub fn export_to_insomnia_v4(collection_path: &Path) -> Result<String, String> {
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
    export_nodes_v4(&mut resources, children, &workspace_id)?;

    let export = json!({
        "_type": "export",
        "__export_format": 4,
        "__export_source": "apiark",
        "resources": resources
    });

    serde_json::to_string_pretty(&export)
        .map_err(|e| format!("Failed to serialize Insomnia JSON: {e}"))
}

fn export_nodes_v4(
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
                export_nodes_v4(resources, children, &folder_id)?;
            }
            CollectionNode::Request { name, path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        resources.push(export_request_v4(name, &req, parent_id));
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

fn export_request_v4(name: &str, req: &RequestFile, parent_id: &str) -> Value {
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

    let auth = req.auth.as_ref().and_then(export_auth_v4);

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

fn export_auth_v4(auth: &AuthConfig) -> Option<Value> {
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_add_insomnia_env_prefix() {
        assert_eq!(
            add_insomnia_env_prefix("{{base_url}}/users/{{id}}"),
            "{{ _.base_url }}/users/{{ _.id }}"
        );
        assert_eq!(
            add_insomnia_env_prefix("{{$uuid}}/users"),
            "{{$uuid}}/users"
        );
        assert_eq!(
            add_insomnia_env_prefix("{{ _.already_prefixed }}"),
            "{{ _.already_prefixed }}"
        );
    }
}
