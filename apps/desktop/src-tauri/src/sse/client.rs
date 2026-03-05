use futures_util::StreamExt;
use tauri::{AppHandle, Emitter};
use tokio::sync::watch;

use super::{SseConnectParams, SseEvent, SseStatus};

/// Connect to an SSE endpoint and stream events to the frontend.
pub async fn connect_sse(
    app: AppHandle,
    connection_id: String,
    params: SseConnectParams,
    mut cancel_rx: watch::Receiver<bool>,
) {
    // Emit connecting
    let _ = app.emit(
        "sse:status",
        SseStatus {
            connection_id: connection_id.clone(),
            state: "connecting".to_string(),
            error: None,
        },
    );

    // Build request
    let client = reqwest::Client::new();
    let mut req = client
        .get(&params.url)
        .header("Accept", "text/event-stream")
        .header("Cache-Control", "no-cache");

    for h in &params.headers {
        if h.enabled && !h.key.is_empty() {
            req = req.header(&h.key, &h.value);
        }
    }

    let response = match req.send().await {
        Ok(r) => r,
        Err(e) => {
            let _ = app.emit(
                "sse:status",
                SseStatus {
                    connection_id,
                    state: "disconnected".to_string(),
                    error: Some(format!("Connection failed: {e}")),
                },
            );
            return;
        }
    };

    if !response.status().is_success() {
        let _ = app.emit(
            "sse:status",
            SseStatus {
                connection_id,
                state: "disconnected".to_string(),
                error: Some(format!("HTTP {}", response.status())),
            },
        );
        return;
    }

    // Connected
    let _ = app.emit(
        "sse:status",
        SseStatus {
            connection_id: connection_id.clone(),
            state: "connected".to_string(),
            error: None,
        },
    );

    // Parse SSE stream
    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut event_type = String::from("message");
    let mut event_data = String::new();
    let mut event_id: Option<String> = None;

    loop {
        tokio::select! {
            _ = cancel_rx.changed() => {
                break;
            }
            chunk = stream.next() => {
                match chunk {
                    Some(Ok(bytes)) => {
                        buffer.push_str(&String::from_utf8_lossy(&bytes));

                        // Process complete lines
                        while let Some(newline_pos) = buffer.find('\n') {
                            let line = buffer[..newline_pos].trim_end_matches('\r').to_string();
                            buffer = buffer[newline_pos + 1..].to_string();

                            if line.is_empty() {
                                // Empty line = dispatch event
                                if !event_data.is_empty() {
                                    // Remove trailing newline from data
                                    if event_data.ends_with('\n') {
                                        event_data.pop();
                                    }

                                    let _ = app.emit("sse:event", SseEvent {
                                        connection_id: connection_id.clone(),
                                        event_type: event_type.clone(),
                                        data: event_data.clone(),
                                        id: event_id.clone(),
                                        timestamp: chrono::Utc::now().to_rfc3339(),
                                    });
                                }

                                // Reset for next event
                                event_type = "message".to_string();
                                event_data.clear();
                                event_id = None;
                            } else if let Some(value) = line.strip_prefix("data:") {
                                let value = value.strip_prefix(' ').unwrap_or(value);
                                event_data.push_str(value);
                                event_data.push('\n');
                            } else if let Some(value) = line.strip_prefix("event:") {
                                event_type = value.strip_prefix(' ').unwrap_or(value).to_string();
                            } else if let Some(value) = line.strip_prefix("id:") {
                                event_id = Some(value.strip_prefix(' ').unwrap_or(value).to_string());
                            }
                            // Ignore "retry:" and comments (lines starting with ':')
                        }
                    }
                    Some(Err(e)) => {
                        let _ = app.emit("sse:status", SseStatus {
                            connection_id: connection_id.clone(),
                            state: "disconnected".to_string(),
                            error: Some(format!("Stream error: {e}")),
                        });
                        return;
                    }
                    None => {
                        // Stream ended
                        break;
                    }
                }
            }
        }
    }

    // Disconnected
    let _ = app.emit(
        "sse:status",
        SseStatus {
            connection_id,
            state: "disconnected".to_string(),
            error: None,
        },
    );
}
