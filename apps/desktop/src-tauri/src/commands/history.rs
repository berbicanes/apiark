use std::sync::Arc;

use tauri::State;

use crate::storage::history::{HistoryDb, HistoryEntry};

pub struct AppState {
    pub history_db: Arc<HistoryDb>,
}

#[tauri::command]
pub async fn get_history(
    state: State<'_, AppState>,
    limit: Option<i64>,
    offset: Option<i64>,
    collection_path: Option<String>,
) -> Result<Vec<HistoryEntry>, String> {
    state
        .history_db
        .list(
            limit.unwrap_or(50),
            offset.unwrap_or(0),
            collection_path.as_deref(),
        )
}

#[tauri::command]
pub async fn search_history(
    state: State<'_, AppState>,
    query: String,
    limit: Option<i64>,
    collection_path: Option<String>,
) -> Result<Vec<HistoryEntry>, String> {
    state
        .history_db
        .search(
            &query,
            limit.unwrap_or(50),
            collection_path.as_deref(),
        )
}

#[tauri::command]
pub async fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    tracing::info!("Clearing all history");
    state.history_db.clear()
}

#[tauri::command]
pub async fn delete_history_entry(state: State<'_, AppState>, id: i64) -> Result<(), String> {
    state.history_db.delete(id)
}
