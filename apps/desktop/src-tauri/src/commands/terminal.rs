use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};

/// Manages terminal PTY sessions.
pub struct TerminalManager {
    sessions: Mutex<HashMap<String, TerminalSession>>,
}

struct TerminalSession {
    writer: Box<dyn Write + Send>,
    pair: portable_pty::PtyPair,
}

impl TerminalManager {
    pub fn new() -> Self {
        Self {
            sessions: Mutex::new(HashMap::new()),
        }
    }
}

#[tauri::command]
pub fn terminal_create(
    id: String,
    cols: u16,
    rows: u16,
    cwd: Option<String>,
    app: AppHandle,
    manager: tauri::State<'_, TerminalManager>,
) -> Result<(), String> {
    let pty_system = native_pty_system();

    let size = PtySize {
        rows,
        cols,
        pixel_width: 0,
        pixel_height: 0,
    };

    let pair = pty_system
        .openpty(size)
        .map_err(|e| format!("Failed to open PTY: {e}"))?;

    // Detect shell
    let shell = if cfg!(target_os = "windows") {
        std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".to_string())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string())
    };

    let mut cmd = CommandBuilder::new(&shell);

    // Set working directory
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = dirs::home_dir() {
        cmd.cwd(home);
    }

    // Spawn the shell process
    let _child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {e}"))?;

    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {e}"))?;

    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {e}"))?;

    // Store session
    {
        let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
        sessions.insert(id.clone(), TerminalSession { writer, pair });
    }

    // Spawn reader thread to emit output events
    let event_id = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app.emit(&format!("terminal-output-{event_id}"), data);
                }
                Err(_) => break,
            }
        }
        // Terminal exited
        let _ = app.emit(&format!("terminal-exit-{event_id}"), ());
    });

    Ok(())
}

#[tauri::command]
pub fn terminal_write(
    id: String,
    data: String,
    manager: tauri::State<'_, TerminalManager>,
) -> Result<(), String> {
    let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to PTY: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn terminal_resize(
    id: String,
    cols: u16,
    rows: u16,
    manager: tauri::State<'_, TerminalManager>,
) -> Result<(), String> {
    let sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    let session = sessions
        .get(&id)
        .ok_or_else(|| "Terminal session not found".to_string())?;
    session
        .pair
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize PTY: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn terminal_close(
    id: String,
    manager: tauri::State<'_, TerminalManager>,
) -> Result<(), String> {
    let mut sessions = manager.sessions.lock().map_err(|e| e.to_string())?;
    sessions.remove(&id);
    Ok(())
}
