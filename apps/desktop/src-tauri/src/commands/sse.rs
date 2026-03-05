use std::collections::HashMap;
use std::sync::Mutex;

use tauri::{AppHandle, State};
use tokio::sync::watch;

use crate::sse::client::connect_sse;
use crate::sse::SseConnectParams;

pub struct SseManager {
    connections: Mutex<HashMap<String, watch::Sender<bool>>>,
}

impl SseManager {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub async fn sse_connect(
    app: AppHandle,
    state: State<'_, SseManager>,
    connection_id: String,
    params: SseConnectParams,
) -> Result<(), String> {
    let (cancel_tx, cancel_rx) = watch::channel(false);

    {
        let mut connections = state
            .connections
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        // Cancel existing connection if any
        if let Some(old) = connections.remove(&connection_id) {
            let _ = old.send(true);
        }
        connections.insert(connection_id.clone(), cancel_tx);
    }

    let conn_id = connection_id.clone();
    let app_clone = app.clone();
    let state_inner = state
        .inner()
        .connections
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    drop(state_inner); // release lock before spawning

    tokio::spawn(async move {
        connect_sse(app_clone, conn_id, params, cancel_rx).await;
    });

    Ok(())
}

#[tauri::command]
pub async fn sse_disconnect(
    state: State<'_, SseManager>,
    connection_id: String,
) -> Result<(), String> {
    let mut connections = state
        .connections
        .lock()
        .map_err(|e| format!("Lock error: {e}"))?;
    if let Some(cancel) = connections.remove(&connection_id) {
        let _ = cancel.send(true);
    }
    Ok(())
}
