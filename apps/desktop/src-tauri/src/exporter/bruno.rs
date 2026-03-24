use std::path::Path;

use crate::models::auth::AuthConfig;
use crate::models::collection::{CollectionNode, RequestFile};
use crate::storage::collection::{load_collection_tree, read_request};

/// Export an ApiArk collection to Bruno format (.bru files in a directory).
/// Returns the path to the created directory.
pub fn export_to_bruno(collection_path: &Path) -> Result<String, String> {
    let tree = load_collection_tree(collection_path)?;

    let (name, children) = match &tree {
        CollectionNode::Collection { name, children, .. } => (name.clone(), children),
        _ => return Err("Expected a collection node at root".to_string()),
    };

    let output_dir = std::env::temp_dir().join(format!("apiark-bruno-export-{name}"));
    if output_dir.exists() {
        let _ = std::fs::remove_dir_all(&output_dir);
    }
    std::fs::create_dir_all(&output_dir)
        .map_err(|e| format!("Failed to create output directory: {e}"))?;

    // Write bruno.json
    let bruno_json = serde_json::json!({
        "name": name,
        "version": "1",
        "type": "collection"
    });
    std::fs::write(
        output_dir.join("bruno.json"),
        serde_json::to_string_pretty(&bruno_json).unwrap_or_default(),
    )
    .map_err(|e| format!("Failed to write bruno.json: {e}"))?;

    // Export nodes recursively
    export_nodes_to_dir(children, &output_dir)?;

    Ok(output_dir.to_string_lossy().to_string())
}

fn export_nodes_to_dir(nodes: &[CollectionNode], dir: &Path) -> Result<(), String> {
    for node in nodes {
        match node {
            CollectionNode::Folder { name, children, .. }
            | CollectionNode::Collection { name, children, .. } => {
                let folder_dir = dir.join(sanitize_filename(name));
                std::fs::create_dir_all(&folder_dir)
                    .map_err(|e| format!("Failed to create folder {name}: {e}"))?;
                export_nodes_to_dir(children, &folder_dir)?;
            }
            CollectionNode::Request { name, path, .. } => {
                let request_path = Path::new(path);
                match read_request(request_path) {
                    Ok(req) => {
                        let bru_content = request_to_bru(name, &req);
                        let filename = format!("{}.bru", sanitize_filename(name));
                        std::fs::write(dir.join(&filename), bru_content)
                            .map_err(|e| format!("Failed to write {filename}: {e}"))?;
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

fn request_to_bru(name: &str, req: &RequestFile) -> String {
    let mut lines = Vec::new();

    // Meta block
    lines.push("meta {".to_string());
    lines.push(format!("  name: {name}"));
    lines.push("}".to_string());
    lines.push(String::new());

    // Method block
    let method = format!("{:?}", req.method).to_lowercase();
    lines.push(format!("{method} {{"));
    lines.push(format!("  url: {}", req.url));
    lines.push("}".to_string());
    lines.push(String::new());

    // Headers block
    if !req.headers.is_empty() {
        lines.push("headers {".to_string());
        for (key, value) in &req.headers {
            lines.push(format!("  {key}: {value}"));
        }
        lines.push("}".to_string());
        lines.push(String::new());
    }

    // Auth block
    if let Some(ref auth) = req.auth {
        if let Some(auth_block) = export_auth_bru(auth) {
            lines.push(auth_block);
            lines.push(String::new());
        }
    }

    // Body block
    if let Some(ref body) = req.body {
        let body_type = match body.body_type.as_str() {
            "json" => "json",
            "xml" => "xml",
            "urlencoded" | "form-urlencoded" => "form-urlencoded",
            "raw" | "text" => "text",
            _ => "text",
        };
        if !body.content.trim().is_empty() {
            lines.push(format!("body:{body_type} {{"));
            lines.push(body.content.clone());
            lines.push("}".to_string());
            lines.push(String::new());
        }
    }

    // Pre-request script
    if let Some(ref script) = req.pre_request_script {
        if !script.trim().is_empty() {
            lines.push("script:pre-request {".to_string());
            lines.push(script.clone());
            lines.push("}".to_string());
            lines.push(String::new());
        }
    }

    // Post-response script
    if let Some(ref script) = req.post_response_script {
        if !script.trim().is_empty() {
            lines.push("script:post-response {".to_string());
            lines.push(script.clone());
            lines.push("}".to_string());
            lines.push(String::new());
        }
    }

    // Tests
    if let Some(ref tests) = req.tests {
        if !tests.trim().is_empty() {
            lines.push("tests {".to_string());
            lines.push(tests.clone());
            lines.push("}".to_string());
            lines.push(String::new());
        }
    }

    lines.join("\n")
}

fn export_auth_bru(auth: &AuthConfig) -> Option<String> {
    match auth {
        AuthConfig::Bearer { token } => Some(format!("auth:bearer {{\n  token: {token}\n}}")),
        AuthConfig::Basic { username, password } => Some(format!(
            "auth:basic {{\n  username: {username}\n  password: {password}\n}}"
        )),
        AuthConfig::ApiKey { key, value, .. } => Some(format!("headers {{\n  {key}: {value}\n}}")),
        AuthConfig::None => None,
        _ => None, // Skip unsupported auth types
    }
}

fn sanitize_filename(name: &str) -> String {
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
