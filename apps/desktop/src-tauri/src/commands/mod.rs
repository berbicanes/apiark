pub mod ai;
pub mod backup;
pub mod collection;
pub mod cookies;
pub mod curl;
pub mod docs;
pub mod environment;
pub mod grpc;
pub mod history;
pub mod http;
pub mod import_export;
pub mod license;
pub mod migration;
pub mod mock;
pub mod mqtt;
pub mod oauth;
pub mod plugins;
pub mod proxy;
pub mod runner;
pub mod scheduler;
pub mod settings;
pub mod socketio;
pub mod sse;
pub mod state;
pub mod terminal;
pub mod trash;
pub mod updater;
pub mod watcher;
pub mod websocket;
pub mod window;

#[tauri::command]
pub fn greet(name: &str) -> String {
    format!("Hello, {}! Welcome to ApiArk.", name)
}
