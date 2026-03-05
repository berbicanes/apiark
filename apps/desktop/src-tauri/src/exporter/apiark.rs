use std::fs::File;
use std::io::Write;
use std::path::Path;

/// Export a collection as a .zip archive of its directory.
/// Returns the path to the generated zip file.
pub fn export_to_apiark_zip(collection_path: &Path) -> Result<String, String> {
    let collection_name = collection_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| "collection".to_string());

    let tmp_dir = std::env::temp_dir();
    let zip_path = tmp_dir.join(format!("{collection_name}.apiark.zip"));

    let file = File::create(&zip_path).map_err(|e| format!("Failed to create zip file: {e}"))?;
    let mut zip = zip::ZipWriter::new(file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for entry in walkdir::WalkDir::new(collection_path) {
        let entry = entry.map_err(|e| format!("Walk error: {e}"))?;
        let path = entry.path();
        let relative = path
            .strip_prefix(collection_path)
            .map_err(|e| format!("Strip prefix error: {e}"))?;

        // Skip hidden files except .apiark directory
        let rel_str = relative.to_string_lossy();
        if rel_str.starts_with('.') && !rel_str.starts_with(".apiark") {
            continue;
        }
        // Skip .env files (secrets)
        if path.file_name().map(|n| n == ".env").unwrap_or(false) {
            continue;
        }

        if path.is_file() {
            zip.start_file(rel_str.to_string(), options)
                .map_err(|e| format!("Zip start_file error: {e}"))?;
            let content = std::fs::read(path)
                .map_err(|e| format!("Failed to read {}: {e}", path.display()))?;
            zip.write_all(&content)
                .map_err(|e| format!("Zip write error: {e}"))?;
        } else if !relative.as_os_str().is_empty() {
            zip.add_directory(rel_str.to_string(), options)
                .map_err(|e| format!("Zip add_directory error: {e}"))?;
        }
    }

    zip.finish().map_err(|e| format!("Zip finish error: {e}"))?;

    Ok(zip_path.to_string_lossy().to_string())
}
