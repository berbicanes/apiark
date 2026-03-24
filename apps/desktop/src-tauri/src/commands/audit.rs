use tauri::State;

use crate::storage::audit::{AuditDb, AuditEntry};

pub struct AuditState {
    pub audit_db: std::sync::Arc<AuditDb>,
}

#[tauri::command]
pub async fn audit_get_logs(
    state: State<'_, AuditState>,
    limit: Option<i64>,
    offset: Option<i64>,
) -> Result<Vec<AuditEntry>, String> {
    state
        .audit_db
        .list(limit.unwrap_or(100), offset.unwrap_or(0))
}

#[tauri::command]
pub async fn audit_clear(state: State<'_, AuditState>) -> Result<(), String> {
    tracing::info!("Clearing all audit logs");
    state.audit_db.clear()
}

#[tauri::command]
pub async fn audit_log_action(
    state: State<'_, AuditState>,
    action: String,
    target: String,
    detail: Option<String>,
) -> Result<(), String> {
    let entry = AuditEntry {
        id: 0,
        action,
        target,
        detail: detail.unwrap_or_default(),
        timestamp: chrono::Utc::now().to_rfc3339(),
    };
    state.audit_db.insert(&entry)?;
    Ok(())
}
