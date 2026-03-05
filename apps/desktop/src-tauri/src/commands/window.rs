use tauri::{AppHandle, Manager, WebviewUrl, WebviewWindowBuilder};

/// Open a new application window.
#[tauri::command]
pub async fn open_new_window(app: AppHandle) -> Result<String, String> {
    let label = format!("window-{}", uuid::Uuid::new_v4());
    let url = WebviewUrl::App("index.html".into());

    WebviewWindowBuilder::new(&app, &label, url)
        .title("ApiArk")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 600.0)
        .build()
        .map_err(|e| format!("Failed to create window: {e}"))?;

    Ok(label)
}
