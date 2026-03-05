use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

use crate::models::collection::{
    CollectionConfig, CollectionNode, FolderConfig, RequestFile, RequestMeta,
};

/// Load a collection tree from a directory containing `.apiark/apiark.yaml`.
pub fn load_collection_tree(collection_path: &Path) -> Result<CollectionNode, String> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    if !config_path.exists() {
        return Err(format!(
            "Not a valid collection: {} (missing .apiark/apiark.yaml)",
            collection_path.display()
        ));
    }

    let config_content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read collection config: {e}"))?;
    let config: CollectionConfig = serde_yaml::from_str(&config_content)
        .map_err(|e| format!("Invalid collection config YAML: {e}"))?;

    let children = scan_directory(collection_path)?;

    Ok(CollectionNode::Collection {
        name: config.name,
        path: collection_path.to_string_lossy().to_string(),
        children,
    })
}

/// Recursively scan a directory for request YAML files and subfolders.
fn scan_directory(dir: &Path) -> Result<Vec<CollectionNode>, String> {
    let mut folders = Vec::new();
    let mut requests = Vec::new();

    let entries = fs::read_dir(dir)
        .map_err(|e| format!("Failed to read directory {}: {e}", dir.display()))?;

    // Check for folder ordering
    let folder_config = load_folder_config(dir);
    let order_map: HashMap<String, usize> = folder_config
        .as_ref()
        .map(|fc| {
            fc.order
                .iter()
                .enumerate()
                .map(|(i, name)| (name.clone(), i))
                .collect()
        })
        .unwrap_or_default();

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read dir entry: {e}"))?;
        let path = entry.path();
        let file_name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden dirs/files and special files
        if file_name.starts_with('.') || file_name == "_folder.yaml" {
            continue;
        }

        if path.is_dir() {
            let folder_name = file_name.clone();

            let children = scan_directory(&path)?;
            folders.push((
                order_map.get(&file_name).copied().unwrap_or(usize::MAX),
                CollectionNode::Folder {
                    name: folder_name,
                    path: path.to_string_lossy().to_string(),
                    children,
                },
            ));
        } else if file_name.ends_with(".yaml") || file_name.ends_with(".yml") {
            match read_request_meta(&path) {
                Ok(meta) => {
                    let stem = path
                        .file_stem()
                        .map(|s| s.to_string_lossy().to_string())
                        .unwrap_or_default();
                    requests.push((
                        order_map.get(&stem).copied().unwrap_or(usize::MAX),
                        CollectionNode::Request {
                            name: meta.name,
                            method: meta.method,
                            path: path.to_string_lossy().to_string(),
                        },
                    ));
                }
                Err(e) => {
                    tracing::warn!("Skipping invalid request file {}: {e}", path.display());
                }
            }
        }
    }

    // Sort: folders first (by order then alpha), then requests (by order then alpha)
    folders.sort_by(|a, b| {
        a.0.cmp(&b.0)
            .then_with(|| node_name(&a.1).cmp(node_name(&b.1)))
    });
    requests.sort_by(|a, b| {
        a.0.cmp(&b.0)
            .then_with(|| node_name(&a.1).cmp(node_name(&b.1)))
    });

    let mut result: Vec<CollectionNode> = folders.into_iter().map(|(_, n)| n).collect();
    result.extend(requests.into_iter().map(|(_, n)| n));
    Ok(result)
}

fn node_name(node: &CollectionNode) -> &str {
    match node {
        CollectionNode::Collection { name, .. }
        | CollectionNode::Folder { name, .. }
        | CollectionNode::Request { name, .. } => name,
    }
}

fn load_folder_config(dir: &Path) -> Option<FolderConfig> {
    let path = dir.join("_folder.yaml");
    if !path.exists() {
        return None;
    }
    let content = fs::read_to_string(&path).ok()?;
    serde_yaml::from_str(&content).ok()
}

/// Read only name + method from a request YAML (lightweight).
fn read_request_meta(path: &Path) -> Result<RequestMeta, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    serde_yaml::from_str::<RequestMeta>(&content)
        .map_err(|e| format!("Invalid request YAML {}: {e}", path.display()))
}

/// Check if a file contains Git merge conflict markers.
fn has_merge_conflicts(content: &str) -> bool {
    content.contains("<<<<<<<") && content.contains(">>>>>>>")
}

/// Read the full request file.
pub fn read_request(path: &Path) -> Result<RequestFile, String> {
    let content =
        fs::read_to_string(path).map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
    if has_merge_conflicts(&content) {
        return Err(format!("MERGE_CONFLICT:{}", path.display()));
    }
    serde_yaml::from_str::<RequestFile>(&content)
        .map_err(|e| format!("Invalid request YAML {}: {e}", path.display()))
}

/// Write a request file atomically (write to .tmp, then rename).
pub fn write_request(path: &Path, request: &RequestFile) -> Result<(), String> {
    let yaml =
        serde_yaml::to_string(request).map_err(|e| format!("Failed to serialize request: {e}"))?;
    atomic_write(path, &yaml)
}

/// Create a new request YAML file.
pub fn create_request_file(
    dir: &Path,
    filename: &str,
    request: &RequestFile,
) -> Result<PathBuf, String> {
    let file_path = dir.join(format!("{filename}.yaml"));
    if file_path.exists() {
        return Err(format!("File already exists: {}", file_path.display()));
    }
    write_request(&file_path, request)?;
    Ok(file_path)
}

/// Create a folder in a collection.
pub fn create_folder(parent: &Path, name: &str) -> Result<PathBuf, String> {
    let folder_path = parent.join(name);
    if folder_path.exists() {
        return Err(format!("Folder already exists: {}", folder_path.display()));
    }
    fs::create_dir_all(&folder_path).map_err(|e| format!("Failed to create folder: {e}"))?;
    Ok(folder_path)
}

/// Delete an item (file or folder) by moving it to trash.
/// Moves an item to trash. Returns the trash directory path for undo support.
pub fn delete_item(path: &Path, collection_name: &str) -> Result<String, String> {
    let trash_base = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".apiark")
        .join("trash")
        .join(collection_name);

    let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
    let item_name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string());
    let trash_dir = trash_base.join(format!("{timestamp}_{item_name}"));

    fs::create_dir_all(&trash_dir).map_err(|e| format!("Failed to create trash dir: {e}"))?;

    let dest = trash_dir.join(&item_name);
    if path.is_dir() {
        copy_dir_all(path, &dest)?;
        fs::remove_dir_all(path).map_err(|e| format!("Failed to remove original dir: {e}"))?;
    } else {
        fs::copy(path, &dest).map_err(|e| format!("Failed to copy to trash: {e}"))?;
        fs::remove_file(path).map_err(|e| format!("Failed to remove original file: {e}"))?;
    }

    Ok(trash_dir.to_string_lossy().to_string())
}

fn copy_dir_all(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {e}"))?;
    for entry in fs::read_dir(src).map_err(|e| format!("Failed to read dir: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let dest_path = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir_all(&entry.path(), &dest_path)?;
        } else {
            fs::copy(entry.path(), &dest_path).map_err(|e| format!("Failed to copy file: {e}"))?;
        }
    }
    Ok(())
}

/// Rename a file or folder.
pub fn rename_item(path: &Path, new_name: &str) -> Result<PathBuf, String> {
    let parent = path.parent().ok_or("Cannot get parent directory")?;

    let new_path = if path.is_dir() {
        parent.join(new_name)
    } else {
        // Preserve .yaml extension for request files
        let ext = path.extension().map(|e| e.to_string_lossy().to_string());
        if let Some(ext) = ext {
            parent.join(format!("{new_name}.{ext}"))
        } else {
            parent.join(new_name)
        }
    };

    if new_path.exists() {
        return Err("A file or folder with that name already exists".to_string());
    }

    fs::rename(path, &new_path).map_err(|e| format!("Failed to rename: {e}"))?;

    // If it's a request YAML, also update the name field inside
    if new_path.is_file() {
        if let Ok(mut request) = read_request(&new_path) {
            request.name = new_name.to_string();
            let _ = write_request(&new_path, &request);
        }
    }

    Ok(new_path)
}

/// Save the ordering of items within a folder by writing/updating `_folder.yaml`.
pub fn save_folder_order(dir: &Path, order: &[String]) -> Result<(), String> {
    let config_path = dir.join("_folder.yaml");

    // Load existing config or create new
    let mut config = load_folder_config(dir).unwrap_or(FolderConfig {
        name: None,
        auth: None,
        order: Vec::new(),
    });
    config.order = order.to_vec();

    let yaml = serde_yaml::to_string(&config)
        .map_err(|e| format!("Failed to serialize folder config: {e}"))?;
    atomic_write(&config_path, &yaml)
}

/// Load the collection config from .apiark/apiark.yaml.
pub fn load_collection_config(collection_path: &Path) -> Result<CollectionConfig, String> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    let content = fs::read_to_string(&config_path)
        .map_err(|e| format!("Failed to read collection config: {e}"))?;
    serde_yaml::from_str(&content).map_err(|e| format!("Invalid collection config YAML: {e}"))
}

/// Save the collection config to .apiark/apiark.yaml (atomic write).
pub fn save_collection_config(
    collection_path: &Path,
    config: &CollectionConfig,
) -> Result<(), String> {
    let config_path = collection_path.join(".apiark").join("apiark.yaml");
    let yaml = serde_yaml::to_string(config)
        .map_err(|e| format!("Failed to serialize collection config: {e}"))?;
    atomic_write(&config_path, &yaml)
}

/// Write content atomically: write to .tmp file, then rename.
fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let tmp_path = path.with_extension("apiark.tmp");
    fs::write(&tmp_path, content).map_err(|e| format!("Failed to write temp file: {e}"))?;
    fs::rename(&tmp_path, path).map_err(|e| {
        // Clean up tmp file on rename failure
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename temp file: {e}")
    })
}
