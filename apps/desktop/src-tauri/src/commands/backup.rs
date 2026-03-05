use std::fs;
use std::io::{Read, Write};
use std::path::Path;

use serde::{Deserialize, Serialize};

/// Export app state as a .zip file to the given path.
/// Includes: settings.json, state.json, optionally data.db (history).
#[tauri::command]
pub async fn export_app_state(
    output_path: String,
    include_history: bool,
) -> Result<ExportSummary, String> {
    let apiark_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".apiark");

    let file =
        fs::File::create(&output_path).map_err(|e| format!("Failed to create export file: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let mut files_included = Vec::new();

    // settings.json
    let settings_path = apiark_dir.join("settings.json");
    if settings_path.exists() {
        let content = fs::read_to_string(&settings_path)
            .map_err(|e| format!("Failed to read settings: {e}"))?;
        zip.start_file("settings.json", options)
            .map_err(|e| format!("Zip error: {e}"))?;
        zip.write_all(content.as_bytes())
            .map_err(|e| format!("Zip write error: {e}"))?;
        files_included.push("settings.json".to_string());
    }

    // state.json (open tabs, window state)
    let state_path = apiark_dir.join("state.json");
    if state_path.exists() {
        let content =
            fs::read_to_string(&state_path).map_err(|e| format!("Failed to read state: {e}"))?;
        zip.start_file("state.json", options)
            .map_err(|e| format!("Zip error: {e}"))?;
        zip.write_all(content.as_bytes())
            .map_err(|e| format!("Zip write error: {e}"))?;
        files_included.push("state.json".to_string());
    }

    // data.db (history) — optional
    if include_history {
        let db_path = apiark_dir.join("data.db");
        if db_path.exists() {
            let content =
                fs::read(&db_path).map_err(|e| format!("Failed to read history DB: {e}"))?;
            zip.start_file("data.db", options)
                .map_err(|e| format!("Zip error: {e}"))?;
            zip.write_all(&content)
                .map_err(|e| format!("Zip write error: {e}"))?;
            files_included.push("data.db".to_string());
        }
    }

    zip.finish().map_err(|e| format!("Zip finish error: {e}"))?;

    Ok(ExportSummary {
        path: output_path,
        files_included,
    })
}

/// Import app state from a .zip file.
/// Merges settings (new values override old), replaces history if present.
#[tauri::command]
pub async fn import_app_state(zip_path: String) -> Result<ImportSummary, String> {
    let apiark_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?
        .join(".apiark");

    let _ = fs::create_dir_all(&apiark_dir);

    let file = fs::File::open(&zip_path).map_err(|e| format!("Failed to open import file: {e}"))?;
    let mut archive = zip::ZipArchive::new(file).map_err(|e| format!("Invalid zip file: {e}"))?;

    let mut files_restored = Vec::new();
    let mut history_entries: Option<String> = None;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Zip entry error: {e}"))?;
        let name = entry.name().to_string();

        match name.as_str() {
            "settings.json" => {
                let mut content = String::new();
                entry
                    .read_to_string(&mut content)
                    .map_err(|e| format!("Failed to read settings from zip: {e}"))?;

                // Merge: parse both old and new, new values override old
                let target = apiark_dir.join("settings.json");
                let merged = if target.exists() {
                    let existing = fs::read_to_string(&target).unwrap_or_default();
                    merge_json(&existing, &content)
                } else {
                    content
                };

                fs::write(&target, merged).map_err(|e| format!("Failed to write settings: {e}"))?;
                files_restored.push("settings.json".to_string());
            }
            "state.json" => {
                let mut content = String::new();
                entry
                    .read_to_string(&mut content)
                    .map_err(|e| format!("Failed to read state from zip: {e}"))?;
                fs::write(apiark_dir.join("state.json"), content)
                    .map_err(|e| format!("Failed to write state: {e}"))?;
                files_restored.push("state.json".to_string());
            }
            "data.db" => {
                let mut content = Vec::new();
                entry
                    .read_to_end(&mut content)
                    .map_err(|e| format!("Failed to read history DB from zip: {e}"))?;

                // Back up existing DB
                let db_path = apiark_dir.join("data.db");
                if db_path.exists() {
                    let backup = apiark_dir.join("data.db.backup");
                    let _ = fs::copy(&db_path, &backup);
                }

                fs::write(&db_path, content)
                    .map_err(|e| format!("Failed to write history DB: {e}"))?;

                // Count entries for summary
                if let Ok(conn) = rusqlite::Connection::open(&db_path) {
                    if let Ok(count) =
                        conn.query_row("SELECT COUNT(*) FROM history", [], |r| r.get::<_, i64>(0))
                    {
                        history_entries = Some(format!("{count} entries"));
                    }
                }
                files_restored.push("data.db".to_string());
            }
            _ => {
                // Skip unknown files
            }
        }
    }

    Ok(ImportSummary {
        files_restored,
        history_entries,
    })
}

/// Merge two JSON objects: new values override old, unrecognized keys preserved.
fn merge_json(existing: &str, incoming: &str) -> String {
    let mut base: serde_json::Value =
        serde_json::from_str(existing).unwrap_or(serde_json::Value::Object(serde_json::Map::new()));
    let overlay: serde_json::Value =
        serde_json::from_str(incoming).unwrap_or(serde_json::Value::Object(serde_json::Map::new()));

    if let (serde_json::Value::Object(ref mut base_map), serde_json::Value::Object(overlay_map)) =
        (&mut base, overlay)
    {
        for (k, v) in overlay_map {
            base_map.insert(k, v);
        }
    }

    serde_json::to_string_pretty(&base).unwrap_or_else(|_| incoming.to_string())
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExportSummary {
    pub path: String,
    pub files_included: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ImportSummary {
    pub files_restored: Vec<String>,
    pub history_entries: Option<String>,
}
