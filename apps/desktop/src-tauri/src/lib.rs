mod commands;
mod docs;
mod exporter;
mod grpc;
pub mod http;
mod importer;
mod mock;
pub mod models;
mod mqtt;
mod oauth;
mod plugins;
mod proxy;
mod runner;
mod scheduler;
pub mod scripting;
mod sse;
pub mod storage;
mod watcher;
mod websocket;

use std::sync::{Arc, Mutex};

use commands::ai::{ai_generate_request, ai_generate_tests};
use commands::backup::{export_app_state, import_app_state};
use commands::collection::{
    create_folder, create_request, create_sample_collection, delete_item, get_collection_defaults,
    open_collection, read_request_file, rename_item, save_folder_order, save_request_file,
    update_collection_defaults,
};
use commands::cookies::{clear_cookie_jar, delete_cookie, get_cookie_jar};
use commands::curl::{export_curl_command, parse_curl_command};
use commands::docs::{generate_docs, preview_docs};
use commands::environment::{
    get_resolved_variables, load_environments, load_root_dotenv, save_environment,
};
use commands::greet;
use commands::grpc::{grpc_call_unary, grpc_disconnect, grpc_load_proto};
use commands::history::{
    clear_history, delete_history_entry, get_history, search_history, AppState,
};
use commands::http::{read_full_response, send_request, send_request_with_scripts};
use commands::import_export::{
    detect_import_format, export_collection, import_collection, import_preview,
};
use commands::license::{activate_license, deactivate_license, get_license_status, LicenseState};
use commands::migration::{check_collection_version, migrate_collection};
use commands::mock::{list_mock_servers, start_mock_server, stop_mock_server};
use commands::mqtt::{mqtt_connect, mqtt_disconnect, mqtt_publish, mqtt_subscribe};
use commands::oauth::{oauth_clear_token, oauth_get_token_status, oauth_start_flow};
use commands::plugins::{install_plugin, list_plugins, toggle_plugin, uninstall_plugin};
use commands::proxy::{
    proxy_ca_exists, proxy_clear_captures, proxy_generate_ca, proxy_get_ca_cert,
    proxy_get_captures, proxy_set_passthrough, proxy_start, proxy_status, proxy_stop,
};
use commands::runner::run_collection_command;
use commands::scheduler::{
    create_monitor, delete_monitor, get_monitor_results, list_monitors, toggle_monitor,
};
use commands::settings::{get_settings, update_settings, SettingsState};
use commands::socketio::socketio_build_url;
use commands::sse::{sse_connect, sse_disconnect, SseManager};
use commands::state::{load_persisted_state, save_persisted_state};
use commands::terminal::{
    terminal_close, terminal_create, terminal_resize, terminal_write, TerminalManager,
};
use commands::trash::{empty_trash, list_trash, restore_from_trash};
use commands::updater::{backup_current_binary, clear_backups, list_rollback_versions};
use commands::watcher::{unwatch_collection, watch_collection};
use commands::websocket::{ws_connect, ws_disconnect, ws_send};
use commands::window::open_new_window;
use grpc::client::GrpcManager;
use http::cookies::CookieJarManager;
use mock::server::MockServerManager;
use mqtt::client::MqttManager;
use oauth::OAuthTokenStore;
use plugins::manager::PluginManager;
use proxy::capture::ProxyCaptureManager;
use scheduler::monitor::MonitorManager;
use storage::history::HistoryDb;
use storage::settings;
use watcher::collection_watcher::CollectionWatcher;
use websocket::manager::WsManager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize history database
    let apiark_dir = dirs::home_dir()
        .expect("Could not determine home directory")
        .join(".apiark");

    // Set up logging with file rotation
    let log_dir = apiark_dir.join("logs");
    let _ = std::fs::create_dir_all(&log_dir);
    let file_appender = tracing_appender::rolling::daily(&log_dir, "apiark.log");
    // _guard must be kept alive for the app's lifetime to flush logs
    let (non_blocking, _log_guard) = tracing_appender::non_blocking(file_appender);

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "apiark=info".into()),
        )
        .with_writer(non_blocking)
        .with_ansi(false)
        .init();

    // Install panic hook for crash reports
    let crash_dir = apiark_dir.join("crash-reports");
    let _ = std::fs::create_dir_all(&crash_dir);
    let default_hook = std::panic::take_hook();
    std::panic::set_hook(Box::new(move |info| {
        let timestamp = chrono::Utc::now().format("%Y%m%d_%H%M%S").to_string();
        let location = info
            .location()
            .map(|l| format!("{}:{}:{}", l.file(), l.line(), l.column()))
            .unwrap_or_else(|| "unknown".to_string());
        let payload = if let Some(s) = info.payload().downcast_ref::<&str>() {
            s.to_string()
        } else if let Some(s) = info.payload().downcast_ref::<String>() {
            s.clone()
        } else {
            "Unknown panic".to_string()
        };
        let report = serde_json::json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "appVersion": env!("CARGO_PKG_VERSION"),
            "os": std::env::consts::OS,
            "arch": std::env::consts::ARCH,
            "location": location,
            "message": payload,
        });
        let path = crash_dir.join(format!("crash_{timestamp}.json"));
        let _ = std::fs::write(
            &path,
            serde_json::to_string_pretty(&report).unwrap_or_default(),
        );
        tracing::error!("PANIC at {location}: {payload}");
        default_hook(info);
    }));

    let db_path = apiark_dir.join("data.db");

    let history_db = match HistoryDb::open(&db_path) {
        Ok(db) => Arc::new(db),
        Err(e) => {
            tracing::error!("Failed to open history database: {e}");
            // Try to recover: rename corrupt DB and create fresh
            if db_path.exists() {
                let backup = db_path.with_extension(format!(
                    "db.corrupt.{}",
                    chrono::Utc::now().format("%Y%m%d_%H%M%S")
                ));
                let _ = std::fs::rename(&db_path, &backup);
                tracing::info!("Renamed corrupt DB to {}", backup.display());
            }
            Arc::new(HistoryDb::open(&db_path).expect("Failed to create fresh history database"))
        }
    };

    // Load settings
    let settings_path = apiark_dir.join("settings.json");
    let app_settings = settings::load_settings(&settings_path);
    tracing::info!("Settings loaded (theme: {})", app_settings.theme);

    let app_state = AppState { history_db };
    let settings_state = SettingsState {
        settings: Mutex::new(app_settings),
        settings_path,
    };

    let license_state = LicenseState::new(&apiark_dir);
    tracing::info!(
        "License tier: {:?}",
        license_state.status.lock().unwrap().tier
    );

    tauri::Builder::default()
        .manage(app_state)
        .manage(settings_state)
        .manage(license_state)
        .manage(WsManager::new())
        .manage(SseManager::new())
        .manage(OAuthTokenStore::new())
        .manage(CollectionWatcher::new())
        .manage(CookieJarManager::new())
        .manage(GrpcManager::new())
        .manage(MockServerManager::new())
        .manage(MonitorManager::new())
        .manage(PluginManager::new(&apiark_dir))
        .manage(MqttManager::new())
        .manage(ProxyCaptureManager::new())
        .manage(TerminalManager::new())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_deep_link::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            send_request,
            send_request_with_scripts,
            read_full_response,
            // Collection commands
            open_collection,
            read_request_file,
            save_request_file,
            create_request,
            create_folder,
            delete_item,
            rename_item,
            save_folder_order,
            create_sample_collection,
            get_collection_defaults,
            update_collection_defaults,
            // Migration commands
            check_collection_version,
            migrate_collection,
            // Backup commands
            export_app_state,
            import_app_state,
            // Environment commands
            load_environments,
            save_environment,
            get_resolved_variables,
            load_root_dotenv,
            // History commands
            get_history,
            search_history,
            clear_history,
            delete_history_entry,
            // cURL commands
            parse_curl_command,
            export_curl_command,
            // State persistence commands
            load_persisted_state,
            save_persisted_state,
            // Runner commands
            run_collection_command,
            // WebSocket commands
            ws_connect,
            ws_send,
            ws_disconnect,
            // SSE commands
            sse_connect,
            sse_disconnect,
            // OAuth commands
            oauth_start_flow,
            oauth_get_token_status,
            oauth_clear_token,
            // Import/Export commands
            detect_import_format,
            import_preview,
            import_collection,
            export_collection,
            // Settings commands
            get_settings,
            update_settings,
            // Watcher commands
            watch_collection,
            unwatch_collection,
            // gRPC commands
            grpc_load_proto,
            grpc_call_unary,
            grpc_disconnect,
            // Cookie Jar commands
            get_cookie_jar,
            delete_cookie,
            clear_cookie_jar,
            // Mock Server commands
            start_mock_server,
            stop_mock_server,
            list_mock_servers,
            // Docs commands
            generate_docs,
            preview_docs,
            // Monitor/Scheduler commands
            create_monitor,
            delete_monitor,
            toggle_monitor,
            list_monitors,
            get_monitor_results,
            // Trash commands
            list_trash,
            restore_from_trash,
            empty_trash,
            // License commands
            get_license_status,
            activate_license,
            deactivate_license,
            // Window commands
            open_new_window,
            // Socket.IO commands
            socketio_build_url,
            // MQTT commands
            mqtt_connect,
            mqtt_subscribe,
            mqtt_publish,
            mqtt_disconnect,
            // Proxy capture commands
            proxy_start,
            proxy_stop,
            proxy_status,
            proxy_get_captures,
            proxy_clear_captures,
            proxy_set_passthrough,
            proxy_generate_ca,
            proxy_get_ca_cert,
            proxy_ca_exists,
            // Plugin commands
            list_plugins,
            toggle_plugin,
            uninstall_plugin,
            install_plugin,
            // AI commands
            ai_generate_request,
            ai_generate_tests,
            // Terminal commands
            terminal_create,
            terminal_write,
            terminal_resize,
            terminal_close,
            // Updater/rollback commands
            list_rollback_versions,
            backup_current_binary,
            clear_backups,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
