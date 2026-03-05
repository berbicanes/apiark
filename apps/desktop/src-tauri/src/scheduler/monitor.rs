use std::collections::HashMap;
use std::str::FromStr;
use std::sync::{Arc, Mutex};

use cron::Schedule;
use tauri::{AppHandle, Emitter};
use tokio::sync::oneshot;

use tauri::Manager;

use crate::oauth::OAuthTokenStore;
use crate::runner::collection_runner;
use crate::runner::RunConfig;
use crate::storage::history::HistoryDb;

use super::{MonitorConfig, MonitorResult, MonitorStatus};

struct MonitorHandle {
    status: MonitorStatus,
    shutdown_tx: oneshot::Sender<()>,
}

pub struct MonitorManager {
    monitors: Arc<Mutex<HashMap<String, MonitorHandle>>>,
}

impl MonitorManager {
    pub fn new() -> Self {
        Self {
            monitors: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub fn create(
        &self,
        config: MonitorConfig,
        app: AppHandle,
        history_db: Arc<HistoryDb>,
    ) -> Result<MonitorStatus, String> {
        // Validate cron expression
        Schedule::from_str(&config.cron_expression)
            .map_err(|e| format!("Invalid cron expression: {e}"))?;

        let monitor_id = format!(
            "monitor_{}_{}",
            config.name.replace(' ', "_").to_lowercase(),
            chrono::Utc::now().timestamp_millis()
        );

        let status = MonitorStatus {
            id: monitor_id.clone(),
            name: config.name.clone(),
            collection_path: config.collection_path.clone(),
            cron_expression: config.cron_expression.clone(),
            enabled: true,
            last_run: None,
            last_status: None,
            run_count: 0,
        };

        let (shutdown_tx, shutdown_rx) = oneshot::channel::<()>();

        let monitors_ref = self.monitors.clone();
        let task_config = config.clone();
        let task_id = monitor_id.clone();

        tokio::spawn(async move {
            run_monitor_loop(
                task_id,
                task_config,
                app,
                history_db,
                monitors_ref,
                shutdown_rx,
            )
            .await;
        });

        let mut monitors = self
            .monitors
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        monitors.insert(
            monitor_id.clone(),
            MonitorHandle {
                status: status.clone(),
                shutdown_tx,
            },
        );

        tracing::info!(id = %monitor_id, "Monitor created");
        Ok(status)
    }

    pub fn delete(&self, monitor_id: &str) -> Result<(), String> {
        let mut monitors = self
            .monitors
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        if let Some(handle) = monitors.remove(monitor_id) {
            let _ = handle.shutdown_tx.send(());
            tracing::info!(id = monitor_id, "Monitor deleted");
        }
        Ok(())
    }

    pub fn toggle(&self, monitor_id: &str) -> Result<MonitorStatus, String> {
        let mut monitors = self
            .monitors
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        if let Some(handle) = monitors.get_mut(monitor_id) {
            handle.status.enabled = !handle.status.enabled;
            Ok(handle.status.clone())
        } else {
            Err(format!("Monitor not found: {monitor_id}"))
        }
    }

    pub fn list(&self) -> Result<Vec<MonitorStatus>, String> {
        let monitors = self
            .monitors
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        Ok(monitors.values().map(|h| h.status.clone()).collect())
    }
}

fn update_monitor_status(
    monitors: &Mutex<HashMap<String, MonitorHandle>>,
    monitor_id: &str,
    last_run: String,
    last_status: String,
) {
    if let Ok(mut m) = monitors.lock() {
        if let Some(handle) = m.get_mut(monitor_id) {
            handle.status.last_run = Some(last_run);
            handle.status.last_status = Some(last_status);
            handle.status.run_count += 1;
        }
    }
}

fn is_monitor_enabled(monitors: &Mutex<HashMap<String, MonitorHandle>>, monitor_id: &str) -> bool {
    monitors
        .lock()
        .ok()
        .and_then(|m| m.get(monitor_id).map(|h| h.status.enabled))
        .unwrap_or(false)
}

async fn run_monitor_loop(
    monitor_id: String,
    config: MonitorConfig,
    app: AppHandle,
    history_db: Arc<HistoryDb>,
    monitors: Arc<Mutex<HashMap<String, MonitorHandle>>>,
    mut shutdown_rx: oneshot::Receiver<()>,
) {
    let schedule = match Schedule::from_str(&config.cron_expression) {
        Ok(s) => s,
        Err(e) => {
            tracing::error!(id = %monitor_id, "Invalid cron: {e}");
            return;
        }
    };

    loop {
        // Find next scheduled time
        let next = match schedule.upcoming(chrono::Utc).next() {
            Some(t) => t,
            None => {
                tracing::warn!(id = %monitor_id, "No upcoming schedule");
                return;
            }
        };

        let now = chrono::Utc::now();
        let wait_duration = (next - now)
            .to_std()
            .unwrap_or(std::time::Duration::from_secs(60));

        // Wait until next run or shutdown
        tokio::select! {
            _ = tokio::time::sleep(wait_duration) => {},
            _ = &mut shutdown_rx => {
                tracing::info!(id = %monitor_id, "Monitor shutdown");
                return;
            }
        }

        // Check if monitor is still enabled
        if !is_monitor_enabled(&monitors, &monitor_id) {
            continue;
        }

        // Run the collection
        let run_config = RunConfig {
            collection_path: config.collection_path.clone(),
            folder_path: config.folder_path.clone(),
            environment_name: config.environment_name.clone(),
            delay_ms: 0,
            iterations: 1,
            data_file: None,
            stop_on_error: false,
        };

        let oauth_store: tauri::State<'_, OAuthTokenStore> = app.state();
        let result = collection_runner::run_collection(
            app.clone(),
            run_config,
            history_db.clone(),
            &oauth_store,
        )
        .await;

        let timestamp = chrono::Utc::now().to_rfc3339();
        let (status_str, summary) = match &result {
            Ok(summary) => {
                let s = if summary.total_failed == 0 {
                    "pass"
                } else {
                    "fail"
                };
                (s.to_string(), Some(summary.clone()))
            }
            Err(_) => ("fail".to_string(), None),
        };

        // Update monitor status
        update_monitor_status(
            &monitors,
            &monitor_id,
            timestamp.clone(),
            status_str.clone(),
        );

        // Build result event
        let monitor_result = MonitorResult {
            id: 0,
            monitor_id: monitor_id.clone(),
            timestamp: timestamp.clone(),
            total_requests: summary.as_ref().map(|s| s.total_requests).unwrap_or(0),
            total_passed: summary.as_ref().map(|s| s.total_passed).unwrap_or(0),
            total_failed: summary.as_ref().map(|s| s.total_failed).unwrap_or(0),
            total_time_ms: summary.as_ref().map(|s| s.total_time_ms).unwrap_or(0),
            status: status_str.clone(),
            error: result.err(),
        };

        // Store result in DB
        if let Err(e) = history_db.insert_monitor_result(&monitor_result) {
            tracing::error!(id = %monitor_id, "Failed to store monitor result: {e}");
        }

        // Emit event to frontend
        let _ = app.emit(&format!("monitor:result:{monitor_id}"), &monitor_result);

        // Desktop notification on failure
        if status_str == "fail" && config.notify_on_failure {
            let _ = app.emit(
                "monitor:failure",
                serde_json::json!({
                    "monitorId": monitor_id,
                    "name": config.name,
                    "timestamp": timestamp,
                }),
            );
        }

        // Webhook on failure
        if status_str == "fail" {
            if let Some(ref webhook_url) = config.webhook_url {
                let payload = serde_json::json!({
                    "monitor": config.name,
                    "status": "fail",
                    "timestamp": timestamp,
                    "totalRequests": monitor_result.total_requests,
                    "totalFailed": monitor_result.total_failed,
                });
                let url = webhook_url.clone();
                tokio::spawn(async move {
                    let client = reqwest::Client::new();
                    if let Err(e) = client.post(&url).json(&payload).send().await {
                        tracing::warn!("Webhook failed: {e}");
                    }
                });
            }
        }

        tracing::info!(
            id = %monitor_id,
            status = %status_str,
            "Monitor run complete"
        );
    }
}
