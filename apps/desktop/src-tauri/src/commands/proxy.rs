use crate::proxy::ca;
use crate::proxy::capture::{CapturedRequest, ProxyCaptureManager, ProxyStatus};

#[tauri::command]
pub async fn proxy_start(
    port: u16,
    app: tauri::AppHandle,
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<ProxyStatus, String> {
    state.start(port, app).await?;
    Ok(state.status())
}

#[tauri::command]
pub async fn proxy_stop(
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<ProxyStatus, String> {
    state.stop();
    Ok(state.status())
}

#[tauri::command]
pub async fn proxy_status(
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<ProxyStatus, String> {
    Ok(state.status())
}

#[tauri::command]
pub async fn proxy_get_captures(
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<Vec<CapturedRequest>, String> {
    Ok(state.get_captures())
}

#[tauri::command]
pub async fn proxy_clear_captures(
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<(), String> {
    state.clear_captures();
    Ok(())
}

#[tauri::command]
pub async fn proxy_set_passthrough(
    domains: Vec<String>,
    state: tauri::State<'_, ProxyCaptureManager>,
) -> Result<(), String> {
    state.set_passthrough_domains(domains);
    Ok(())
}

/// Generate or retrieve the local CA certificate for HTTPS interception.
/// Returns the path to the CA cert PEM file.
#[tauri::command]
pub async fn proxy_generate_ca() -> Result<String, String> {
    let (cert_path, _key_path) = tokio::task::spawn_blocking(ca::ensure_ca)
        .await
        .map_err(|e| format!("Task join error: {e}"))??;
    Ok(cert_path.to_string_lossy().to_string())
}

/// Get the CA certificate PEM content for the user to install.
#[tauri::command]
pub async fn proxy_get_ca_cert() -> Result<String, String> {
    tokio::task::spawn_blocking(ca::read_ca_cert_pem)
        .await
        .map_err(|e| format!("Task join error: {e}"))?
}

/// Check if a CA certificate has been generated.
#[tauri::command]
pub async fn proxy_ca_exists() -> Result<bool, String> {
    Ok(ca::ca_exists())
}
