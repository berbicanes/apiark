use std::fs;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrashItem {
    pub name: String,
    pub collection_name: String,
    pub trash_path: String,
    pub deleted_at: String,
    pub is_folder: bool,
}

fn trash_base() -> Result<PathBuf, String> {
    Ok(dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".apiark")
        .join("trash"))
}

#[tauri::command]
pub async fn list_trash() -> Result<Vec<TrashItem>, String> {
    let base = trash_base()?;
    if !base.exists() {
        return Ok(vec![]);
    }

    let mut items = Vec::new();

    // Iterate collection directories inside trash
    let collections = fs::read_dir(&base).map_err(|e| format!("Failed to read trash dir: {e}"))?;

    for col_entry in collections {
        let col_entry = col_entry.map_err(|e| format!("Read error: {e}"))?;
        let col_name = col_entry.file_name().to_string_lossy().to_string();
        if !col_entry.path().is_dir() {
            continue;
        }

        // Iterate timestamped items inside each collection
        let entries = fs::read_dir(col_entry.path())
            .map_err(|e| format!("Failed to read trash subdir: {e}"))?;

        for entry in entries {
            let entry = entry.map_err(|e| format!("Read error: {e}"))?;
            let dir_name = entry.file_name().to_string_lossy().to_string();
            if !entry.path().is_dir() {
                continue;
            }

            // Parse timestamp from directory name (format: YYYYMMDD_HHMMSS_itemname)
            let deleted_at = if dir_name.len() >= 15 {
                dir_name[..15].to_string()
            } else {
                dir_name.clone()
            };

            // Find the actual item inside the timestamped directory
            if let Ok(inner) = fs::read_dir(entry.path()) {
                for inner_entry in inner {
                    if let Ok(inner_entry) = inner_entry {
                        let name = inner_entry.file_name().to_string_lossy().to_string();
                        items.push(TrashItem {
                            name,
                            collection_name: col_name.clone(),
                            trash_path: entry.path().to_string_lossy().to_string(),
                            deleted_at: deleted_at.clone(),
                            is_folder: inner_entry.path().is_dir(),
                        });
                    }
                }
            }
        }
    }

    // Sort by most recently deleted first
    items.sort_by(|a, b| b.deleted_at.cmp(&a.deleted_at));
    Ok(items)
}

#[tauri::command]
pub async fn restore_from_trash(trash_path: String, restore_to: String) -> Result<(), String> {
    let trash_dir = PathBuf::from(&trash_path);
    let restore_dir = PathBuf::from(&restore_to);

    if !trash_dir.exists() {
        return Err("Trash item not found".to_string());
    }

    // Move each item from trash dir back to restore location
    let entries = fs::read_dir(&trash_dir).map_err(|e| format!("Failed to read trash dir: {e}"))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Read error: {e}"))?;
        let dest = restore_dir.join(entry.file_name());

        if dest.exists() {
            return Err(format!(
                "Cannot restore: {} already exists at destination",
                entry.file_name().to_string_lossy()
            ));
        }

        fs::rename(entry.path(), &dest).map_err(|e| format!("Failed to restore: {e}"))?;
    }

    // Remove the now-empty trash directory
    let _ = fs::remove_dir_all(&trash_dir);

    tracing::info!(trash = %trash_path, restore = %restore_to, "Restored item from trash");
    Ok(())
}

#[tauri::command]
pub async fn empty_trash() -> Result<(), String> {
    let base = trash_base()?;
    if base.exists() {
        fs::remove_dir_all(&base).map_err(|e| format!("Failed to empty trash: {e}"))?;
    }
    tracing::info!("Trash emptied");
    Ok(())
}
