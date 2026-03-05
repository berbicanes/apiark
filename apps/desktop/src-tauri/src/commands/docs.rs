use crate::docs::generator;
use crate::docs::DocsFormat;

#[tauri::command]
pub fn generate_docs(
    collection_path: &str,
    format: DocsFormat,
    output_path: Option<String>,
) -> Result<String, String> {
    let content = generator::generate_docs(collection_path, &format)?;

    if let Some(ref path) = output_path {
        std::fs::write(path, &content).map_err(|e| format!("Failed to write docs file: {e}"))?;
        Ok(path.clone())
    } else {
        Ok(content)
    }
}

#[tauri::command]
pub fn preview_docs(collection_path: &str) -> Result<String, String> {
    generator::generate_docs(collection_path, &DocsFormat::Html)
}
