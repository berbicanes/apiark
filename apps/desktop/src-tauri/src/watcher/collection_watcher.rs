use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::Duration;

use notify::{Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use notify_debouncer_mini::{new_debouncer, DebouncedEvent};
use tauri::{AppHandle, Emitter};

use super::{FileChangeEvent, FileChangeType};

pub struct CollectionWatcher {
    watchers: Mutex<HashMap<String, RecommendedWatcher>>,
}

impl CollectionWatcher {
    pub fn new() -> Self {
        Self {
            watchers: Mutex::new(HashMap::new()),
        }
    }

    pub fn watch(&self, collection_path: &str, app: AppHandle) -> Result<(), String> {
        let mut watchers = self
            .watchers
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;

        // Don't watch the same collection twice
        if watchers.contains_key(collection_path) {
            return Ok(());
        }

        let path = PathBuf::from(collection_path);
        if !path.exists() {
            return Err(format!("Path does not exist: {collection_path}"));
        }

        let col_path = collection_path.to_string();

        let mut watcher = notify::recommended_watcher(move |res: Result<Event, notify::Error>| {
            match res {
                Ok(event) => {
                    for path in &event.paths {
                        // Skip .tmp files and hidden files (except .apiark)
                        if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                            if name.ends_with(".tmp") || name.starts_with(".tmp") {
                                continue;
                            }
                        }

                        // Only watch .yaml files and directories
                        let is_yaml = path
                            .extension()
                            .map(|e| e == "yaml" || e == "yml")
                            .unwrap_or(false);
                        let is_dir = path.is_dir();

                        if !is_yaml && !is_dir {
                            continue;
                        }

                        let change_type = match event.kind {
                            EventKind::Create(_) => FileChangeType::Created,
                            EventKind::Modify(_) => FileChangeType::Modified,
                            EventKind::Remove(_) => FileChangeType::Deleted,
                            _ => continue,
                        };

                        let event = FileChangeEvent {
                            path: path.to_string_lossy().to_string(),
                            change_type,
                            collection_path: col_path.clone(),
                        };

                        if let Err(e) = app.emit("watcher:file-changed", &event) {
                            tracing::warn!("Failed to emit file change event: {e}");
                        }
                    }
                }
                Err(e) => {
                    tracing::warn!("File watcher error: {e}");
                }
            }
        })
        .map_err(|e| format!("Failed to create watcher: {e}"))?;

        watcher
            .watch(Path::new(collection_path), RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch path: {e}"))?;

        tracing::info!(path = %collection_path, "Started watching collection");
        watchers.insert(collection_path.to_string(), watcher);
        Ok(())
    }

    pub fn unwatch(&self, collection_path: &str) -> Result<(), String> {
        let mut watchers = self
            .watchers
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        if let Some(mut watcher) = watchers.remove(collection_path) {
            let _ = watcher.unwatch(Path::new(collection_path));
            tracing::info!(path = %collection_path, "Stopped watching collection");
        }
        Ok(())
    }
}
