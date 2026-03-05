use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

/// Plugin manifest (plugin.json in plugin directory).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub name: String,
    pub version: String,
    pub description: String,
    #[serde(default)]
    pub author: String,
    /// "js" or "wasm"
    pub runtime: String,
    /// Entry point file relative to plugin directory
    pub entry: String,
    /// Hooks this plugin subscribes to
    #[serde(default)]
    pub hooks: Vec<String>,
}

/// Plugin lifecycle hooks.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum PluginHook {
    /// Called before a request is sent
    PreRequest,
    /// Called after a response is received
    PostResponse,
    /// Called when the app starts
    OnStart,
    /// Called when a collection is opened
    OnCollectionOpen,
    /// Custom request header/auth provider
    AuthProvider,
}

impl PluginHook {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "preRequest" => Some(Self::PreRequest),
            "postResponse" => Some(Self::PostResponse),
            "onStart" => Some(Self::OnStart),
            "onCollectionOpen" => Some(Self::OnCollectionOpen),
            "authProvider" => Some(Self::AuthProvider),
            _ => None,
        }
    }
}

/// Installed plugin info.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginInfo {
    pub manifest: PluginManifest,
    pub path: String,
    pub enabled: bool,
}

/// Manages installed plugins.
pub struct PluginManager {
    plugins: Mutex<HashMap<String, PluginInfo>>,
    plugins_dir: PathBuf,
}

impl PluginManager {
    pub fn new(apiark_dir: &Path) -> Self {
        let plugins_dir = apiark_dir.join("plugins");
        let _ = std::fs::create_dir_all(&plugins_dir);

        let mut plugins = HashMap::new();

        // Scan plugins directory
        if let Ok(entries) = std::fs::read_dir(&plugins_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_dir() {
                    let manifest_path = path.join("plugin.json");
                    if manifest_path.exists() {
                        if let Ok(content) = std::fs::read_to_string(&manifest_path) {
                            if let Ok(manifest) = serde_json::from_str::<PluginManifest>(&content) {
                                let name = manifest.name.clone();
                                plugins.insert(
                                    name,
                                    PluginInfo {
                                        manifest,
                                        path: path.to_string_lossy().to_string(),
                                        enabled: true,
                                    },
                                );
                            }
                        }
                    }
                }
            }
        }

        tracing::info!("Loaded {} plugins", plugins.len());

        Self {
            plugins: Mutex::new(plugins),
            plugins_dir,
        }
    }

    pub fn list(&self) -> Vec<PluginInfo> {
        self.plugins.lock().unwrap().values().cloned().collect()
    }

    pub fn toggle(&self, name: &str) -> Result<bool, String> {
        let mut plugins = self.plugins.lock().unwrap();
        let plugin = plugins.get_mut(name).ok_or("Plugin not found")?;
        plugin.enabled = !plugin.enabled;
        Ok(plugin.enabled)
    }

    pub fn uninstall(&self, name: &str) -> Result<(), String> {
        let mut plugins = self.plugins.lock().unwrap();
        let plugin = plugins.remove(name).ok_or("Plugin not found")?;
        let path = std::path::Path::new(&plugin.path);
        if path.exists() {
            std::fs::remove_dir_all(path).map_err(|e| format!("Failed to remove plugin: {e}"))?;
        }
        Ok(())
    }

    pub fn install_from_dir(&self, source: &Path) -> Result<PluginInfo, String> {
        let manifest_path = source.join("plugin.json");
        let content = std::fs::read_to_string(&manifest_path)
            .map_err(|e| format!("Failed to read plugin.json: {e}"))?;
        let manifest: PluginManifest =
            serde_json::from_str(&content).map_err(|e| format!("Invalid plugin.json: {e}"))?;

        // Validate runtime
        if manifest.runtime != "js" && manifest.runtime != "wasm" {
            return Err(format!("Unsupported runtime: {}", manifest.runtime));
        }

        // Validate entry exists
        let entry_path = source.join(&manifest.entry);
        if !entry_path.exists() {
            return Err(format!("Entry file not found: {}", manifest.entry));
        }

        // Copy to plugins dir
        let dest = self.plugins_dir.join(&manifest.name);
        if dest.exists() {
            std::fs::remove_dir_all(&dest)
                .map_err(|e| format!("Failed to remove existing plugin: {e}"))?;
        }
        copy_dir_recursive(source, &dest)?;

        let info = PluginInfo {
            manifest: manifest.clone(),
            path: dest.to_string_lossy().to_string(),
            enabled: true,
        };

        self.plugins
            .lock()
            .unwrap()
            .insert(manifest.name.clone(), info.clone());

        Ok(info)
    }

    pub fn get_plugins_for_hook(&self, hook: PluginHook) -> Vec<PluginInfo> {
        let hook_str = match hook {
            PluginHook::PreRequest => "preRequest",
            PluginHook::PostResponse => "postResponse",
            PluginHook::OnStart => "onStart",
            PluginHook::OnCollectionOpen => "onCollectionOpen",
            PluginHook::AuthProvider => "authProvider",
        };

        self.plugins
            .lock()
            .unwrap()
            .values()
            .filter(|p| p.enabled && p.manifest.hooks.contains(&hook_str.to_string()))
            .cloned()
            .collect()
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    std::fs::create_dir_all(dst).map_err(|e| format!("Failed to create dir: {e}"))?;
    for entry in std::fs::read_dir(src).map_err(|e| format!("Failed to read dir: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());
        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            std::fs::copy(&src_path, &dst_path).map_err(|e| format!("Failed to copy file: {e}"))?;
        }
    }
    Ok(())
}
