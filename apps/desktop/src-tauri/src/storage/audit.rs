use std::path::Path;
use std::sync::Mutex;

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuditEntry {
    pub id: i64,
    pub action: String,
    pub target: String,
    pub detail: String,
    pub timestamp: String,
}

pub struct AuditDb {
    conn: Mutex<Connection>,
}

impl AuditDb {
    /// Open (or create) the audit database at the given path.
    pub fn open(db_path: &Path) -> Result<Self, String> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| format!("Failed to create data directory: {e}"))?;
        }

        let conn =
            Connection::open(db_path).map_err(|e| format!("Failed to open audit database: {e}"))?;

        conn.execute_batch("PRAGMA journal_mode=WAL;")
            .map_err(|e| format!("Failed to set WAL mode: {e}"))?;

        let integrity: String = conn
            .query_row("PRAGMA integrity_check;", [], |row| row.get(0))
            .map_err(|e| format!("Integrity check failed: {e}"))?;

        if integrity != "ok" {
            tracing::error!("Audit database integrity check failed: {integrity}");
            return Err(format!("Database corruption detected: {integrity}"));
        }

        let db = Self {
            conn: Mutex::new(conn),
        };
        db.migrate()?;
        Ok(db)
    }

    fn migrate(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute_batch(
            "CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                action TEXT NOT NULL,
                target TEXT NOT NULL,
                detail TEXT NOT NULL DEFAULT '',
                timestamp TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
            CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);",
        )
        .map_err(|e| format!("Audit migration failed: {e}"))?;
        Ok(())
    }

    /// Insert a new audit entry.
    pub fn insert(&self, entry: &AuditEntry) -> Result<i64, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute(
            "INSERT INTO audit_log (action, target, detail, timestamp)
             VALUES (?1, ?2, ?3, ?4)",
            params![entry.action, entry.target, entry.detail, entry.timestamp,],
        )
        .map_err(|e| format!("Failed to insert audit entry: {e}"))?;
        Ok(conn.last_insert_rowid())
    }

    /// List recent audit entries (most recent first).
    pub fn list(&self, limit: i64, offset: i64) -> Result<Vec<AuditEntry>, String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        let mut stmt = conn
            .prepare(
                "SELECT id, action, target, detail, timestamp
                 FROM audit_log ORDER BY timestamp DESC LIMIT ?1 OFFSET ?2",
            )
            .map_err(|e| format!("Query prepare failed: {e}"))?;

        let entries = stmt
            .query_map(params![limit, offset], |row| {
                Ok(AuditEntry {
                    id: row.get(0)?,
                    action: row.get(1)?,
                    target: row.get(2)?,
                    detail: row.get(3)?,
                    timestamp: row.get(4)?,
                })
            })
            .map_err(|e| format!("Query failed: {e}"))?
            .collect::<Result<Vec<_>, _>>()
            .map_err(|e| format!("Row mapping failed: {e}"))?;

        Ok(entries)
    }

    /// Clear all audit logs.
    pub fn clear(&self) -> Result<(), String> {
        let conn = self.conn.lock().map_err(|e| format!("Lock error: {e}"))?;
        conn.execute("DELETE FROM audit_log", [])
            .map_err(|e| format!("Failed to clear audit log: {e}"))?;
        Ok(())
    }
}
