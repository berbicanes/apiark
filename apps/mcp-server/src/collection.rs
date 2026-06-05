use std::collections::HashMap;
use std::fs;
use std::path::Path;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize)]
struct RequestFile {
    name: String,
    method: String,
    url: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    headers: HashMap<String, String>,
    #[serde(default)]
    body: Option<RequestBody>,
}

#[derive(Debug, Serialize, Deserialize)]
struct RequestBody {
    #[serde(rename = "type")]
    body_type: String,
    content: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct EnvironmentFile {
    name: String,
    #[serde(default)]
    variables: HashMap<String, String>,
    #[serde(default)]
    secrets: Vec<String>,
}

/// List collections found in a directory by looking for .apiark/apiark.yaml
pub fn list_collections(args: &Value) -> Result<String, String> {
    let dir = args
        .get("directory")
        .and_then(|d| d.as_str())
        .ok_or("Missing 'directory' argument")?;

    let path = Path::new(dir);
    if !path.exists() {
        return Err(format!("Directory does not exist: {dir}"));
    }

    let mut collections = Vec::new();

    for entry in WalkDir::new(path).max_depth(3).into_iter().flatten() {
        if entry.file_name() == "apiark.yaml" {
            if let Some(parent) = entry.path().parent() {
                if parent.file_name().map_or(false, |n| n == ".apiark") {
                    if let Some(collection_dir) = parent.parent() {
                        collections.push(collection_dir.to_string_lossy().to_string());
                    }
                }
            }
        }
    }

    Ok(serde_json::to_string_pretty(&collections).unwrap_or_default())
}

/// List all .yaml request files in a collection
pub fn list_requests(args: &Value) -> Result<String, String> {
    let collection_path = args
        .get("collection_path")
        .and_then(|p| p.as_str())
        .ok_or("Missing 'collection_path' argument")?;

    let path = Path::new(collection_path);
    if !path.exists() {
        return Err(format!("Collection not found: {collection_path}"));
    }

    let mut requests = Vec::new();

    for entry in WalkDir::new(path).into_iter().flatten() {
        let file_path = entry.path();
        if file_path.extension().map_or(false, |e| e == "yaml" || e == "yml") {
            // Skip config files
            let name = file_path.file_name().unwrap_or_default().to_string_lossy();
            if name == "apiark.yaml" || name.starts_with('_') || name.starts_with('.') {
                continue;
            }
            // Skip environment files
            if file_path.to_string_lossy().contains(".apiark/environments") {
                continue;
            }

            // Try to parse as a request
            if let Ok(content) = fs::read_to_string(file_path) {
                if let Ok(req) = serde_yaml::from_str::<RequestFile>(&content) {
                    requests.push(serde_json::json!({
                        "name": req.name,
                        "method": req.method,
                        "url": req.url,
                        "path": file_path.to_string_lossy(),
                        "description": req.description,
                    }));
                }
            }
        }
    }

    Ok(serde_json::to_string_pretty(&requests).unwrap_or_default())
}

/// Read a specific request file
pub fn read_request(args: &Value) -> Result<String, String> {
    let file_path = args
        .get("file_path")
        .and_then(|p| p.as_str())
        .ok_or("Missing 'file_path' argument")?;

    let content = fs::read_to_string(file_path)
        .map_err(|e| format!("Failed to read file: {e}"))?;

    Ok(content)
}

/// Send an HTTP request
pub fn send_http_request(args: &Value) -> Result<String, String> {
    let method = args
        .get("method")
        .and_then(|m| m.as_str())
        .ok_or("Missing 'method' argument")?;
    let url = args
        .get("url")
        .and_then(|u| u.as_str())
        .ok_or("Missing 'url' argument")?;

    let headers: HashMap<String, String> = args
        .get("headers")
        .and_then(|h| serde_json::from_value(h.clone()).ok())
        .unwrap_or_default();

    let body = args.get("body").and_then(|b| b.as_str());

    // Use a runtime to execute the async request
    let rt = tokio::runtime::Runtime::new()
        .map_err(|e| format!("Failed to create runtime: {e}"))?;

    rt.block_on(async {
        let client = reqwest::Client::new();
        let mut builder = client.request(
            method.parse().map_err(|_| format!("Invalid method: {method}"))?,
            url,
        );

        for (k, v) in &headers {
            builder = builder.header(k.as_str(), v.as_str());
        }

        if let Some(body_str) = body {
            builder = builder.body(body_str.to_string());
        }

        let response = builder.send().await
            .map_err(|e| format!("Request failed: {e}"))?;

        let status = response.status().as_u16();
        let status_text = response.status().canonical_reason().unwrap_or("").to_string();
        let resp_headers: HashMap<String, String> = response
            .headers()
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_str().unwrap_or("").to_string()))
            .collect();
        let body_text = response.text().await
            .map_err(|e| format!("Failed to read response: {e}"))?;

        let result = serde_json::json!({
            "status": status,
            "statusText": status_text,
            "headers": resp_headers,
            "body": if body_text.len() > 10000 {
                format!("{}... (truncated, {} bytes total)", &body_text[..10000], body_text.len())
            } else {
                body_text
            }
        });

        Ok(serde_json::to_string_pretty(&result).unwrap_or_default())
    })
}

/// List environments for a collection
pub fn list_environments(args: &Value) -> Result<String, String> {
    let collection_path = args
        .get("collection_path")
        .and_then(|p| p.as_str())
        .ok_or("Missing 'collection_path' argument")?;

    let env_dir = Path::new(collection_path)
        .join(".apiark")
        .join("environments");

    if !env_dir.exists() {
        return Ok("[]".to_string());
    }

    let mut envs = Vec::new();

    let entries = fs::read_dir(&env_dir)
        .map_err(|e| format!("Failed to read environments: {e}"))?;

    for entry in entries.flatten() {
        let path = entry.path();
        if path.extension().map_or(false, |e| e == "yaml" || e == "yml") {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(env) = serde_yaml::from_str::<EnvironmentFile>(&content) {
                    envs.push(serde_json::json!({
                        "name": env.name,
                        "variableCount": env.variables.len(),
                        "secretCount": env.secrets.len(),
                    }));
                }
            }
        }
    }

    Ok(serde_json::to_string_pretty(&envs).unwrap_or_default())
}

/// Create a new request file in a collection
pub fn create_request(args: &Value) -> Result<String, String> {
    let collection_path = args
        .get("collection_path")
        .and_then(|p| p.as_str())
        .ok_or("Missing 'collection_path' argument")?;
    let name = args
        .get("name")
        .and_then(|n| n.as_str())
        .ok_or("Missing 'name' argument")?;
    let method = args
        .get("method")
        .and_then(|m| m.as_str())
        .ok_or("Missing 'method' argument")?;
    let url = args
        .get("url")
        .and_then(|u| u.as_str())
        .ok_or("Missing 'url' argument")?;
    let folder = args.get("folder").and_then(|f| f.as_str());

    let target_dir = if let Some(f) = folder {
        Path::new(collection_path).join(f)
    } else {
        Path::new(collection_path).to_path_buf()
    };

    fs::create_dir_all(&target_dir)
        .map_err(|e| format!("Failed to create directory: {e}"))?;

    let filename = name.to_lowercase().replace(' ', "-");
    let file_path = target_dir.join(format!("{filename}.yaml"));

    let request = RequestFile {
        name: name.to_string(),
        method: method.to_uppercase(),
        url: url.to_string(),
        description: None,
        headers: HashMap::new(),
        body: None,
    };

    let yaml = serde_yaml::to_string(&request)
        .map_err(|e| format!("Failed to serialize: {e}"))?;

    fs::write(&file_path, &yaml)
        .map_err(|e| format!("Failed to write file: {e}"))?;

    Ok(format!("Created request at {}", file_path.display()))
}

/// Duplicate a file or folder (copy with "(copy)" suffix)
pub fn duplicate_item(args: &Value) -> Result<String, String> {
    let source_path = args
        .get("path")
        .and_then(|p| p.as_str())
        .ok_or("Missing 'path' argument")?;

    let source = Path::new(source_path);
    if !source.exists() {
        return Err(format!("Item not found: {source_path}"));
    }

    let parent = source.parent().ok_or("Cannot get parent directory")?;

    let base_name = if source.is_dir() {
        source.file_name().and_then(|n| n.to_str()).unwrap_or("folder")
    } else {
        source.file_stem().and_then(|n| n.to_str()).unwrap_or("request")
    };

    let mut copy_name = format!("{} (copy)", base_name);
    let mut new_path = if source.is_dir() {
        parent.join(&copy_name)
    } else {
        let ext = source.extension().map(|e| e.to_string_lossy().to_string());
        if let Some(ref ext) = ext {
            parent.join(format!("{copy_name}.{ext}"))
        } else {
            parent.join(&copy_name)
        }
    };

    let mut counter = 2;
    while new_path.exists() {
        copy_name = format!("{} (copy {})", base_name, counter);
        new_path = if source.is_dir() {
            parent.join(&copy_name)
        } else {
            let ext = source.extension().map(|e| e.to_string_lossy().to_string());
            if let Some(ref ext) = ext {
                parent.join(format!("{copy_name}.{ext}"))
            } else {
                parent.join(&copy_name)
            }
        };
        counter += 1;
    }

    if source.is_dir() {
        copy_dir_all(source, &new_path)?;

        let config_path = new_path.join(".apiark").join("apiark.yaml");
        if config_path.exists() {
            if let Ok(content) = fs::read_to_string(&config_path) {
                if let Ok(mut config) = serde_yaml::from_str::<serde_yaml::Value>(&content) {
                    if let Some(mapping) = config.as_mapping_mut() {
                        mapping.insert(
                            serde_yaml::Value::String("name".into()),
                            serde_yaml::Value::String(copy_name.clone()),
                        );
                        if let Ok(yaml) = serde_yaml::to_string(&config) {
                            let _ = fs::write(&config_path, yaml);
                        }
                    }
                }
            }
        }
    } else {
        fs::copy(source, &new_path)
            .map_err(|e| format!("Failed to copy file: {e}"))?;

        if let Ok(content) = fs::read_to_string(&new_path) {
            if let Ok(mut doc) = serde_yaml::from_str::<serde_yaml::Value>(&content) {
                if let Some(mapping) = doc.as_mapping_mut() {
                    mapping.insert(
                        serde_yaml::Value::String("name".into()),
                        serde_yaml::Value::String(copy_name.clone()),
                    );
                    if let Ok(yaml) = serde_yaml::to_string(&doc) {
                        let _ = fs::write(&new_path, yaml);
                    }
                }
            }
        }
    }

    Ok(serde_json::to_string_pretty(&serde_json::json!({
        "path": new_path.to_string_lossy(),
        "message": format!("Duplicated to {}", new_path.display())
    })).unwrap_or_default())
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {e}"))?;
    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read dir: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let dest_path = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir_all(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), &dest_path)
                .map_err(|e| format!("Failed to copy file: {e}"))?;
        }
    }
    Ok(())
}
