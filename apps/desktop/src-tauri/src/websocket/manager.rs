use std::collections::HashMap;
use std::sync::Mutex;

use futures_util::{SinkExt, StreamExt};
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, watch};
use tokio_tungstenite::tungstenite;

use super::{WsConnectParams, WsMessage, WsStatus};

struct WsConnection {
    sender: mpsc::Sender<String>,
    cancel: watch::Sender<bool>,
}

pub struct WsManager {
    connections: Mutex<HashMap<String, WsConnection>>,
}

impl WsManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }

    pub fn connect(
        &self,
        app: AppHandle,
        connection_id: String,
        params: WsConnectParams,
    ) -> Result<(), String> {
        // Check for existing connection
        {
            let connections = self
                .connections
                .lock()
                .map_err(|e| format!("Lock error: {e}"))?;
            if connections.contains_key(&connection_id) {
                return Err("Connection already exists".to_string());
            }
        }

        let (msg_tx, mut msg_rx) = mpsc::channel::<String>(256);
        let (cancel_tx, cancel_rx) = watch::channel(false);

        // Store connection
        {
            let mut connections = self
                .connections
                .lock()
                .map_err(|e| format!("Lock error: {e}"))?;
            connections.insert(
                connection_id.clone(),
                WsConnection {
                    sender: msg_tx,
                    cancel: cancel_tx,
                },
            );
        }

        // Emit connecting status
        let _ = app.emit(
            "ws:status",
            WsStatus {
                connection_id: connection_id.clone(),
                state: "connecting".to_string(),
                error: None,
            },
        );

        let conn_id = connection_id.clone();
        let app_clone = app.clone();

        tokio::spawn(async move {
            // Build request with headers
            let mut request = match tungstenite::http::Request::builder()
                .uri(&params.url)
                .body(())
            {
                Ok(r) => r,
                Err(e) => {
                    let _ = app_clone.emit(
                        "ws:status",
                        WsStatus {
                            connection_id: conn_id,
                            state: "disconnected".to_string(),
                            error: Some(format!("Invalid URL: {e}")),
                        },
                    );
                    return;
                }
            };

            // Add custom headers
            let headers = request.headers_mut();
            for h in &params.headers {
                if h.enabled && !h.key.is_empty() {
                    if let (Ok(name), Ok(value)) = (
                        tungstenite::http::header::HeaderName::try_from(&h.key),
                        tungstenite::http::header::HeaderValue::try_from(&h.value),
                    ) {
                        headers.insert(name, value);
                    }
                }
            }

            // Connect
            let ws_stream = match tokio_tungstenite::connect_async(request).await {
                Ok((stream, _)) => stream,
                Err(e) => {
                    let _ = app_clone.emit(
                        "ws:status",
                        WsStatus {
                            connection_id: conn_id,
                            state: "disconnected".to_string(),
                            error: Some(format!("Connection failed: {e}")),
                        },
                    );
                    return;
                }
            };

            // Connected
            let _ = app_clone.emit(
                "ws:status",
                WsStatus {
                    connection_id: conn_id.clone(),
                    state: "connected".to_string(),
                    error: None,
                },
            );

            let (mut ws_sender, mut ws_receiver) = ws_stream.split();
            let mut cancel_rx = cancel_rx;

            loop {
                tokio::select! {
                    // Cancel signal
                    _ = cancel_rx.changed() => {
                        let _ = ws_sender.close().await;
                        break;
                    }
                    // Outgoing message from frontend
                    Some(msg) = msg_rx.recv() => {
                        let size = msg.len() as u64;
                        if ws_sender.send(tungstenite::Message::Text(msg.clone())).await.is_err() {
                            break;
                        }
                        let _ = app_clone.emit("ws:message", WsMessage {
                            connection_id: conn_id.clone(),
                            direction: "sent".to_string(),
                            content: msg,
                            message_type: "text".to_string(),
                            timestamp: chrono::Utc::now().to_rfc3339(),
                            size_bytes: size,
                        });
                    }
                    // Incoming message from server
                    Some(Ok(msg)) = ws_receiver.next() => {
                        match msg {
                            tungstenite::Message::Text(text) => {
                                let size = text.len() as u64;
                                let _ = app_clone.emit("ws:message", WsMessage {
                                    connection_id: conn_id.clone(),
                                    direction: "received".to_string(),
                                    content: text.to_string(),
                                    message_type: "text".to_string(),
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                    size_bytes: size,
                                });
                            }
                            tungstenite::Message::Binary(data) => {
                                let size = data.len() as u64;
                                let _ = app_clone.emit("ws:message", WsMessage {
                                    connection_id: conn_id.clone(),
                                    direction: "received".to_string(),
                                    content: format!("[Binary: {} bytes]", data.len()),
                                    message_type: "binary".to_string(),
                                    timestamp: chrono::Utc::now().to_rfc3339(),
                                    size_bytes: size,
                                });
                            }
                            tungstenite::Message::Close(_) => {
                                break;
                            }
                            _ => {} // Ping/Pong handled by tungstenite
                        }
                    }
                    else => break,
                }
            }

            // Disconnected
            let _ = app_clone.emit(
                "ws:status",
                WsStatus {
                    connection_id: conn_id,
                    state: "disconnected".to_string(),
                    error: None,
                },
            );
        });

        Ok(())
    }

    pub fn send(&self, connection_id: &str, message: String) -> Result<(), String> {
        let connections = self
            .connections
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        let conn = connections
            .get(connection_id)
            .ok_or_else(|| format!("No connection with id: {connection_id}"))?;
        conn.sender
            .try_send(message)
            .map_err(|e| format!("Failed to send: {e}"))
    }

    pub fn disconnect(&self, connection_id: &str) -> Result<(), String> {
        let mut connections = self
            .connections
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        if let Some(conn) = connections.remove(connection_id) {
            let _ = conn.cancel.send(true);
        }
        Ok(())
    }
}
