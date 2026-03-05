use serde::{Deserialize, Serialize};

/// Socket.IO is implemented client-side (frontend) on top of the existing
/// WebSocket transport. The Rust backend provides the raw WS connection,
/// and the frontend handles the Socket.IO protocol framing (EIO/SIO packets).
///
/// This module provides helper commands for Socket.IO-specific operations.

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SocketIoConnectParams {
    pub url: String,
    pub namespace: String,
    #[serde(default)]
    pub auth: Option<serde_json::Value>,
    #[serde(default)]
    pub transports: Vec<String>,
}

/// Build the Socket.IO handshake URL from the base URL.
/// Appends EIO version and transport parameters.
#[tauri::command]
pub fn socketio_build_url(url: String, namespace: String) -> Result<String, String> {
    let mut parsed = url::Url::parse(&url).map_err(|e| format!("Invalid URL: {e}"))?;

    // Socket.IO path
    if !parsed.path().contains("socket.io") {
        parsed.set_path(&format!(
            "{}/socket.io/",
            parsed.path().trim_end_matches('/')
        ));
    }

    // Add EIO version and transport
    parsed
        .query_pairs_mut()
        .append_pair("EIO", "4")
        .append_pair("transport", "websocket");

    if namespace != "/" {
        parsed.query_pairs_mut().append_pair("nsp", &namespace);
    }

    // Convert http(s) to ws(s)
    let ws_url = parsed
        .to_string()
        .replace("http://", "ws://")
        .replace("https://", "wss://");

    Ok(ws_url)
}
