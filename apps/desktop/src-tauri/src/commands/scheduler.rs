use tauri::{AppHandle, State};

use crate::commands::history::AppState;
use crate::scheduler::monitor::MonitorManager;
use crate::scheduler::{MonitorConfig, MonitorResult, MonitorStatus};

#[tauri::command]
pub fn create_monitor(
    config: MonitorConfig,
    app: AppHandle,
    state: State<'_, AppState>,
    manager: State<'_, MonitorManager>,
) -> Result<MonitorStatus, String> {
    let history_db = state.history_db.clone();
    manager.create(config, app, history_db)
}

#[tauri::command]
pub fn delete_monitor(monitor_id: &str, manager: State<'_, MonitorManager>) -> Result<(), String> {
    manager.delete(monitor_id)
}

#[tauri::command]
pub fn toggle_monitor(
    monitor_id: &str,
    manager: State<'_, MonitorManager>,
) -> Result<MonitorStatus, String> {
    manager.toggle(monitor_id)
}

#[tauri::command]
pub fn list_monitors(manager: State<'_, MonitorManager>) -> Result<Vec<MonitorStatus>, String> {
    manager.list()
}

#[tauri::command]
pub fn get_monitor_results(
    monitor_id: &str,
    state: State<'_, AppState>,
) -> Result<Vec<MonitorResult>, String> {
    state.history_db.get_monitor_results(monitor_id, 50)
}
