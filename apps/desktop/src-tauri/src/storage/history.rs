use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryEntry {
    pub id: i64,
    pub method: String,
    pub url: String,
    pub status: Option<i32>,
    pub status_text: Option<String>,
    pub time_ms: Option<i64>,
    pub size_bytes: Option<i64>,
    pub timestamp: String,
    pub collection_path: Option<String>,
    pub request_name: Option<String>,
    pub request_json: String,
}

pub struct HistoryDb {
    conn: Mutex<Connection>,
}

impl HistoryDb {
    /// Open (or create) the history database at the given path.
    pub fn open(db_path: &Path) -> Result<Self, String> {
        // Ensure parent directory exists
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {e}"))?;
        }

        let conn =
            Connection::open(db_path).map_err(|e| format!("Failed to open database: {e}"))?;

        // Enable WAL mode for crash resilience
        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| format!("Failed to set WAL mode: {e}"))?;

        // Integrity check
        let integrity: String = conn
            .query_row("PRAGMA integrity_check;", [], |row| row.get(0))
            .map_err(|e| format!("Integrity check failed: {e}"))?;

        if integrity != "ok" {
            tracing::error!("Database integrity check failed: {integrity}");
            return Err(format!("Database corruption detected: {integrity}"));
        }

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    /// Run database migrations.
    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                status INTEGER,
                status_text TEXT,
                time_ms INTEGER,
                size_bytes INTEGER,
                timestamp TEXT NOT NULL,
                collection_path TEXT,
                request_name TEXT,
                request_json TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);

            CREATE TABLE IF NOT EXISTS monitor_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                monitor_id TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                total_requests INTEGER NOT NULL,
                total_passed INTEGER NOT NULL,
                total_failed INTEGER NOT NULL,
                total_time_ms INTEGER NOT NULL,
                status TEXT NOT NULL,
                error TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_monitor_results_monitor ON monitor_results(monitor_id, timestamp DESC);",
        )
        .map_err(|e| format!("Migration failed: {e}"))?;
        Ok(())
    }

    /// Insert a new history entry.
    pub fn insert(&self, entry: &HistoryEntry) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute(
            "INSERT INTO history (method, url, status, status_text, time_ms, size_bytes, timestamp, collection_path, request_name, request_json)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                entry.method,
                entry.url,
                entry.status,
                entry.status_text,
                entry.time_ms,
                entry.size_bytes,
                entry.timestamp,
                entry.collection_path,
                entry.request_name,
                entry.request_json,
            ],
        )
        .map_err(|e| format!("Failed to insert history: {e}"))?;
        Ok(conn.last_insert_rowid())
    }

    /// List recent history entries (most recent first).
    pub fn list(&self, limit: i64, offset: i64) -> Result<Vec<HistoryEntry>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, method, url, status, status_text, time_ms, size_bytes, timestamp, collection_path, request_name, request_json
                 FROM history ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| format!("Query prepare failed: {e}"))?;

        let entries = stmt
            .query_map(params![limit, offset], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    method: row.get(1)?,
                    url: row.get(2)?,
                    status: row.get(3)?,
                    status_text: row.get(4)?,
                    time_ms: row.get(5)?,
                    size_bytes: row.get(6)?,
                    timestamp: row.get(7)?,
                    collection_path: row.get(8)?,
                    request_name: row.get(9)?,
                    request_json: row.get(10)?,
                })
            })
            .map_err(|e| format!("Query failed: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row mapping failed: {e}"))?;

        Ok(entries)
    }

    /// Search history by URL substring.
    pub fn search(&self, query: &str, limit: i64) -> Result<Vec<HistoryEntry>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        let pattern = format!("%{query}%");
        let mut stmt = conn
            .prepare(
                "SELECT id, method, url, status, status_text, time_ms, size_bytes, timestamp, collection_path, request_name, request_json
                 FROM history WHERE url LIKE ?1 OR method LIKE ?1 OR request_name LIKE ?1
                 ORDER BY timestamp DESC LIMIT ?2",
            )
            .map_err(|e| format!("Query prepare failed: {e}"))?;

        let entries = stmt
            .query_map(params![pattern, limit], |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    method: row.get(1)?,
                    url: row.get(2)?,
                    status: row.get(3)?,
                    status_text: row.get(4)?,
                    time_ms: row.get(5)?,
                    size_bytes: row.get(6)?,
                    timestamp: row.get(7)?,
                    collection_path: row.get(8)?,
                    request_name: row.get(9)?,
                    request_json: row.get(10)?,
                })
            })
            .map_err(|e| format!("Query failed: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row mapping failed: {e}"))?;

        Ok(entries)
    }

    /// Get a single history entry by ID.
    pub fn get(&self, id: i64) -> Result<HistoryEntry, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.query_row(
            "SELECT id, method, url, status, status_text, time_ms, size_bytes, timestamp, collection_path, request_name, request_json
             FROM history WHERE id = ?1",
            params![id],
            |row| {
                Ok(HistoryEntry {
                    id: row.get(0)?,
                    method: row.get(1)?,
                    url: row.get(2)?,
                    status: row.get(3)?,
                    status_text: row.get(4)?,
                    time_ms: row.get(5)?,
                    size_bytes: row.get(6)?,
                    timestamp: row.get(7)?,
                    collection_path: row.get(8)?,
                    request_name: row.get(9)?,
                    request_json: row.get(10)?,
                })
            },
        )
        .map_err(|e| format!("History entry not found: {e}"))
    }

    /// Clear all history.
    pub fn clear(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute("DELETE FROM history", [])
            .map_err(|e| format!("Failed to clear history: {e}"))?;
        Ok(())
    }

    /// Delete a single history entry.
    pub fn delete(&self, id: i64) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute("DELETE FROM history WHERE id = ?1", params![id])
            .map_err(|e| format!("Failed to delete history entry: {e}"))?;
        Ok(())
    }

    /// Insert a monitor result.
    pub fn insert_monitor_result(
        &self,
        result: &crate::scheduler::MonitorResult,
    ) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute(
            "INSERT INTO monitor_results (monitor_id, timestamp, total_requests, total_passed, total_failed, total_time_ms, status, error)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                result.monitor_id,
                result.timestamp,
                result.total_requests as i64,
                result.total_passed as i64,
                result.total_failed as i64,
                result.total_time_ms as i64,
                result.status,
                result.error,
            ],
        )
        .map_err(|e| format!("Failed to insert monitor result: {e}"))?;
        Ok(())
    }

    /// Get monitor results for a specific monitor.
    pub fn get_monitor_results(
        &self,
        monitor_id: &str,
        limit: usize,
    ) -> Result<Vec<crate::scheduler::MonitorResult>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, monitor_id, timestamp, total_requests, total_passed, total_failed, total_time_ms, status, error
                 FROM monitor_results WHERE monitor_id = ?1 ORDER BY timestamp DESC LIMIT ?2",
            )
            .map_err(|e| format!("Prepare failed: {e}"))?;

        let results = stmt
            .query_map(params![monitor_id, limit as i64], |row| {
                Ok(crate::scheduler::MonitorResult {
                    id: row.get(0)?,
                    monitor_id: row.get(1)?,
                    timestamp: row.get(2)?,
                    total_requests: row.get::<_, i64>(3)? as usize,
                    total_passed: row.get::<_, i64>(4)? as usize,
                    total_failed: row.get::<_, i64>(5)? as usize,
                    total_time_ms: row.get::<_, i64>(6)? as u64,
                    status: row.get(7)?,
                    error: row.get(8)?,
                })
            })
            .map_err(|e| format!("Query failed: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row error: {e}"))?;

        Ok(results)
    }
}
