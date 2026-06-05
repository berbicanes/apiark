use tauri::{AppHandle, WebviewUrl, WebviewWindowBuilder};

/// Open a new application window.
#[tauri::command]
pub async fn open_new_window(app: AppHandle) -> Result<String, String> {
    let label = format!("window-{}", uuid::Uuid::new_v4());
    let url = WebviewUrl::App("index.html".into());

    let builder = WebviewWindowBuilder::new(&app, &label, url)
        .title("ApiArk")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 600.0);

    // Match the main window: a custom frontend title bar replaces the native
    // decorations on Windows/Linux (issue #65), while macOS keeps its native
    // traffic-light controls via the overlay title-bar style.
    #[cfg(not(target_os = "macos"))]
    let builder = builder.decorations(false);
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);

    builder
        .build()
        .map_err(|e| format!("Failed to create window: {e}"))?;

    Ok(label)
}
