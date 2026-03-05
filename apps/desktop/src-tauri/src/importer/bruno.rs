use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::{ImportBody, ImportData, ImportEnvironment, ImportItem, ImportWarning};
use crate::models::auth::AuthConfig;

/// Parse a Bruno collection directory into ImportData.
pub fn parse_bruno_dir(dir_path: &str) -> Result<ImportData, String> {
    let root = Path::new(dir_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {dir_path}"));
    }

    let mut warnings = Vec::new();

    // Try to read collection name from collection.bru or bruno.json
    let collection_name = read_collection_name(root).unwrap_or_else(|| {
        root.file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "Imported Bruno Collection".to_string())
    });

    let items = scan_bruno_dir(root, &mut warnings)?;

    // Read environments from environments/ directory
    let mut environments = Vec::new();
    let env_dir = root.join("environments");
    if env_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&env_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.extension().map(|e| e == "bru").unwrap_or(false) {
                    if let Ok(content) = fs::read_to_string(&path) {
                        if let Some(env) = parse_bru_environment(&content) {
                            environments.push(env);
                        }
                    }
                }
            }
        }
    }

    Ok(ImportData {
        collection_name,
        items,
        environments,
        warnings,
    })
}

fn read_collection_name(root: &Path) -> Option<String> {
    // Try bruno.json first
    let bruno_json = root.join("bruno.json");
    if bruno_json.exists() {
        if let Ok(content) = fs::read_to_string(&bruno_json) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(name) = val.get("name").and_then(|v| v.as_str()) {
                    return Some(name.to_string());
                }
            }
        }
    }
    // Try collection.bru
    let collection_bru = root.join("collection.bru");
    if collection_bru.exists() {
        if let Ok(content) = fs::read_to_string(&collection_bru) {
            let blocks = parse_bru_blocks(&content);
            if let Some(meta) = blocks.get("meta") {
                if let Some(name) = extract_field(meta, "name") {
                    return Some(name);
                }
            }
        }
    }
    None
}

fn scan_bruno_dir(
    dir: &Path,
    warnings: &mut Vec<ImportWarning>,
) -> Result<Vec<ImportItem>, String> {
    let mut folders = Vec::new();
    let mut requests = Vec::new();

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {e}", dir.display()))?;

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden, environments dir, collection.bru, bruno.json
        if file_name.starts_with('.')
            || file_name == "environments"
            || file_name == "collection.bru"
            || file_name == "bruno.json"
            || file_name == "node_modules"
        {
            continue;
        }

        if path.is_dir() {
            let sub_items = scan_bruno_dir(&path, warnings)?;
            if !sub_items.is_empty() {
                folders.push(ImportItem::Folder {
                    name: file_name,
                    items: sub_items,
                });
            }
        } else if file_name.ends_with(".bru") {
            match fs::read_to_string(&path) {
                Ok(content) => match parse_bru_request(&content) {
                    Some(item) => requests.push(item),
                    None => {
                        warnings.push(ImportWarning {
                            item_name: file_name.clone(),
                            message: "Could not parse .bru file — skipped.".to_string(),
                        });
                    }
                },
                Err(e) => {
                    warnings.push(ImportWarning {
                        item_name: file_name.clone(),
                        message: format!("Could not read file: {e}"),
                    });
                }
            }
        }
    }

    folders.extend(requests);
    Ok(folders)
}

/// Parse a .bru file into an ImportItem::Request.
fn parse_bru_request(content: &str) -> Option<ImportItem> {
    let blocks = parse_bru_blocks(content);

    // Get name from meta block
    let name = blocks
        .get("meta")
        .and_then(|b| extract_field(b, "name"))
        .unwrap_or_else(|| "Untitled".to_string());

    // Get method and URL — look for method blocks (get, post, put, etc.)
    let (method, url) = find_method_url(&blocks)?;

    // Headers
    let mut headers = HashMap::new();
    if let Some(header_block) = blocks.get("headers") {
        for line in header_block.lines() {
            let line = line.trim();
            if line.is_empty() {
                continue;
            }
            if let Some((key, val)) = line.split_once(':') {
                headers.insert(key.trim().to_string(), val.trim().to_string());
            }
        }
    }

    // Body
    let body = parse_bru_body(&blocks);

    // Auth
    let auth = parse_bru_auth(&blocks);

    // Scripts
    let pre_request_script = blocks.get("script:pre-request").map(|s| s.to_string());
    let post_response_script = blocks.get("script:post-response").map(|s| s.to_string());

    // Tests
    let tests = blocks.get("tests").map(|s| s.to_string());

    Some(ImportItem::Request {
        name,
        method,
        url,
        headers,
        body: Box::new(body),
        auth: Box::new(auth),
        description: None,
        pre_request_script,
        post_response_script,
        tests,
    })
}

fn find_method_url(blocks: &HashMap<String, String>) -> Option<(String, String)> {
    let methods = ["get", "post", "put", "patch", "delete", "head", "options"];
    for m in &methods {
        if let Some(block) = blocks.get(*m) {
            let url = block
                .lines()
                .find_map(|line| {
                    let line = line.trim();
                    if let Some(rest) = line.strip_prefix("url:") {
                        Some(rest.trim().to_string())
                    } else if !line.is_empty() && !line.contains(':') {
                        // Some .bru files have just the URL on a line
                        Some(line.to_string())
                    } else {
                        None
                    }
                })
                .unwrap_or_default();
            return Some((m.to_uppercase(), url));
        }
    }
    None
}

fn parse_bru_body(blocks: &HashMap<String, String>) -> Option<ImportBody> {
    if let Some(content) = blocks.get("body:json") {
        if !content.trim().is_empty() {
            return Some(ImportBody {
                body_type: "json".to_string(),
                content: content.to_string(),
            });
        }
    }
    if let Some(content) = blocks.get("body:xml") {
        if !content.trim().is_empty() {
            return Some(ImportBody {
                body_type: "xml".to_string(),
                content: content.to_string(),
            });
        }
    }
    if let Some(content) = blocks.get("body:text") {
        if !content.trim().is_empty() {
            return Some(ImportBody {
                body_type: "raw".to_string(),
                content: content.to_string(),
            });
        }
    }
    if let Some(content) = blocks.get("body:form-urlencoded") {
        if !content.trim().is_empty() {
            return Some(ImportBody {
                body_type: "urlencoded".to_string(),
                content: content.to_string(),
            });
        }
    }
    None
}

fn parse_bru_auth(blocks: &HashMap<String, String>) -> Option<AuthConfig> {
    if let Some(bearer_block) = blocks.get("auth:bearer") {
        let token = extract_field(bearer_block, "token").unwrap_or_default();
        return Some(AuthConfig::Bearer { token });
    }
    if let Some(basic_block) = blocks.get("auth:basic") {
        let username = extract_field(basic_block, "username").unwrap_or_default();
        let password = extract_field(basic_block, "password").unwrap_or_default();
        return Some(AuthConfig::Basic { username, password });
    }
    None
}

fn parse_bru_environment(content: &str) -> Option<ImportEnvironment> {
    let blocks = parse_bru_blocks(content);

    let name = blocks
        .get("meta")
        .and_then(|b| extract_field(b, "name"))
        .unwrap_or_else(|| "Untitled".to_string());

    let mut variables = HashMap::new();
    if let Some(vars_block) = blocks.get("vars") {
        for line in vars_block.lines() {
            let line = line.trim();
            if line.is_empty() || line.starts_with('~') {
                continue;
            }
            if let Some((key, val)) = line.split_once(':') {
                variables.insert(key.trim().to_string(), val.trim().to_string());
            }
        }
    }

    if variables.is_empty() {
        return None;
    }

    Some(ImportEnvironment { name, variables })
}

/// Parse .bru block syntax: `blockname { ... }`
/// Returns map of block_name → block_content.
fn parse_bru_blocks(content: &str) -> HashMap<String, String> {
    let mut blocks = HashMap::new();
    let mut current_block: Option<String> = None;
    let mut current_content = String::new();
    let mut brace_depth = 0;

    for line in content.lines() {
        let trimmed = line.trim();

        if let Some(ref block_name) = current_block {
            if trimmed == "}" && brace_depth == 1 {
                blocks.insert(block_name.clone(), current_content.trim().to_string());
                current_block = None;
                current_content.clear();
                brace_depth = 0;
                continue;
            }

            // Track nested braces (e.g., in JSON bodies)
            for ch in trimmed.chars() {
                match ch {
                    '{' => brace_depth += 1,
                    '}' => brace_depth -= 1,
                    _ => {}
                }
            }

            current_content.push_str(line);
            current_content.push('\n');
        } else if trimmed.ends_with('{') {
            let name = trimmed.trim_end_matches('{').trim().to_string();
            if !name.is_empty() {
                current_block = Some(name);
                current_content.clear();
                brace_depth = 1;
            }
        }
    }

    blocks
}

/// Extract a field value from a block's key-value lines.
fn extract_field(block_content: &str, field: &str) -> Option<String> {
    for line in block_content.lines() {
        let line = line.trim();
        if let Some(rest) = line.strip_prefix(field) {
            let rest = rest.trim();
            if let Some(value) = rest.strip_prefix(':') {
                return Some(value.trim().to_string());
            }
        }
    }
    None
}
