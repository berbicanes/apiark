use std::path::Path;

use crate::importer::{self, ImportPreview};

/// Detect the format of an import file.
/// Returns: "postman", "insomnia", "openapi", "bruno", or error.
#[tauri::command]
pub fn detect_import_format(file_path: &str) -> Result<String, String> {
    let path = Path::new(file_path);

    // Bruno is a directory
    if path.is_dir() {
        // Check for bruno.json or collection.bru
        if path.join("bruno.json").exists() || path.join("collection.bru").exists() {
            return Ok("bruno".to_string());
        }
        // Check for .bru files
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                if entry
                    .path()
                    .extension()
                    .map(|e| e == "bru")
                    .unwrap_or(false)
                {
                    return Ok("bruno".to_string());
                }
            }
        }
        return Err("Directory does not appear to be a Bruno collection".to_string());
    }

    let content = std::fs::read_to_string(path).map_err(|e| format!("Failed to read file: {e}"))?;

    // Check for Postman v2.1
    if content.contains("\"schema\"") && content.contains("getpostman.com") {
        return Ok("postman".to_string());
    }
    // Also detect by info.schema field
    if content.contains("\"info\"") && content.contains("\"item\"") {
        // Could be Postman without full schema URL — check for typical structure
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if val.get("info").is_some() && val.get("item").is_some() {
                return Ok("postman".to_string());
            }
        }
    }

    // Check for Insomnia
    if content.contains("\"_type\"") && content.contains("\"resources\"") {
        return Ok("insomnia".to_string());
    }
    // Insomnia YAML
    if content.contains("_type:") && content.contains("resources:") {
        return Ok("insomnia".to_string());
    }

    // Check for Hoppscotch (has "v" field + "folders"/"requests" arrays, no "item" like Postman)
    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
        if val.get("v").is_some()
            && (val.get("folders").is_some() || val.get("requests").is_some())
            && val.get("item").is_none()
        {
            return Ok("hoppscotch".to_string());
        }
    }

    // Check for HAR (HTTP Archive)
    if content.contains("\"log\"") && content.contains("\"entries\"") {
        if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
            if val.get("log").and_then(|l| l.get("entries")).is_some() {
                return Ok("har".to_string());
            }
        }
    }

    // Check for OpenAPI
    if content.contains("\"openapi\"") || content.contains("openapi:") {
        return Ok("openapi".to_string());
    }
    // Swagger 2.0 (not fully supported but we can detect it)
    if content.contains("\"swagger\"") || content.contains("swagger:") {
        return Err("Swagger 2.0 detected. Only OpenAPI 3.x is supported.".to_string());
    }

    Err("Could not detect import format. Supported: Postman v2.1, Insomnia v4, OpenAPI 3.x, Bruno, Hoppscotch, HAR."
        .to_string())
}

/// Parse an import file and return a preview (counts, warnings) without writing.
#[tauri::command]
pub fn import_preview(file_path: &str, format: &str) -> Result<ImportPreview, String> {
    let data = parse_import(file_path, format)?;
    Ok(data.preview())
}

/// Parse and write an imported collection to disk.
/// Returns the path to the created collection directory.
#[tauri::command]
pub fn import_collection(
    file_path: &str,
    format: &str,
    target_dir: &str,
) -> Result<String, String> {
    let data = parse_import(file_path, format)?;
    let target = Path::new(target_dir);

    if !target.exists() {
        std::fs::create_dir_all(target)
            .map_err(|e| format!("Failed to create target directory: {e}"))?;
    }

    importer::writer::write_import(&data, target)
}

/// Export a collection in the specified format.
/// Returns the exported content as a string.
#[tauri::command]
pub fn export_collection(collection_path: &str, format: &str) -> Result<String, String> {
    let path = Path::new(collection_path);

    match format {
        "postman" => crate::exporter::postman::export_to_postman(path),
        "openapi" => crate::exporter::openapi::export_to_openapi(path),
        "apiark" => crate::exporter::apiark::export_to_apiark_zip(path),
        _ => Err(format!("Unsupported export format: {format}")),
    }
}

fn parse_import(file_path: &str, format: &str) -> Result<importer::ImportData, String> {
    match format {
        "postman" => {
            let content = std::fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            importer::postman::parse_postman(&content)
        }
        "insomnia" => {
            let content = std::fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            importer::insomnia::parse_insomnia(&content)
        }
        "bruno" => importer::bruno::parse_bruno_dir(file_path),
        "openapi" => {
            let content = std::fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            importer::openapi::parse_openapi(&content)
        }
        "hoppscotch" => {
            let content = std::fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            importer::hoppscotch::parse_hoppscotch(&content)
        }
        "har" => {
            let content = std::fs::read_to_string(file_path)
                .map_err(|e| format!("Failed to read file: {e}"))?;
            importer::har::parse_har(&content)
        }
        _ => Err(format!("Unsupported import format: {format}")),
    }
}
