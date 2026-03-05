use std::collections::HashMap;
use std::fs;
use std::path::Path;

use super::{ImportBody, ImportData, ImportItem};
use crate::models::auth::AuthConfig;
use crate::models::collection::{
    CollectionConfig, CollectionDefaults, RequestBodyFile, RequestFile,
};
use crate::models::request::HttpMethod;

/// Write ImportData to disk as an ApiArk collection.
/// Returns the path to the created collection directory.
pub fn write_import(data: &ImportData, target_dir: &Path) -> Result<String, String> {
    let collection_dir = target_dir.join(sanitize_filename(&data.collection_name));

    if collection_dir.exists() {
        return Err(format!(
            "Directory already exists: {}",
            collection_dir.display()
        ));
    }

    // Create collection structure
    let apiark_dir = collection_dir.join(".apiark");
    fs::create_dir_all(&apiark_dir)
        .map_err(|e| format!("Failed to create collection directory: {e}"))?;

    // Write apiark.yaml
    let config = CollectionConfig {
        name: data.collection_name.clone(),
        version: 1,
        defaults: CollectionDefaults::default(),
    };
    let config_yaml =
        serde_yaml::to_string(&config).map_err(|e| format!("Failed to serialize config: {e}"))?;
    atomic_write(&apiark_dir.join("apiark.yaml"), &config_yaml)?;

    // Write .gitignore
    atomic_write(&apiark_dir.join(".gitignore"), ".env\n")?;

    // Write environments
    if !data.environments.is_empty() {
        let env_dir = apiark_dir.join("environments");
        fs::create_dir_all(&env_dir)
            .map_err(|e| format!("Failed to create environments directory: {e}"))?;

        for env in &data.environments {
            let env_data = serde_yaml::to_string(
                &serde_yaml::to_value(&EnvFile {
                    name: &env.name,
                    variables: &env.variables,
                })
                .map_err(|e| format!("Failed to serialize environment: {e}"))?,
            )
            .map_err(|e| format!("Failed to serialize environment: {e}"))?;

            let env_filename = sanitize_filename(&env.name);
            atomic_write(&env_dir.join(format!("{env_filename}.yaml")), &env_data)?;
        }
    }

    // Write items recursively
    write_items(&data.items, &collection_dir)?;

    Ok(collection_dir.to_string_lossy().to_string())
}

fn write_items(items: &[ImportItem], parent_dir: &Path) -> Result<(), String> {
    // Track filenames for collision avoidance
    let mut used_names: HashMap<String, usize> = HashMap::new();

    for item in items {
        match item {
            ImportItem::Folder { name, items } => {
                let dirname = unique_name(&sanitize_filename(name), &mut used_names);
                let folder_path = parent_dir.join(&dirname);
                fs::create_dir_all(&folder_path)
                    .map_err(|e| format!("Failed to create folder: {e}"))?;
                write_items(items, &folder_path)?;
            }
            ImportItem::Request {
                name,
                method,
                url,
                headers,
                body,
                auth,
                description,
                pre_request_script,
                post_response_script,
                tests,
            } => {
                let filename = unique_name(&sanitize_filename(name), &mut used_names);

                let request_file = RequestFile {
                    name: name.clone(),
                    method: parse_method(method),
                    url: url.clone(),
                    description: description.clone(),
                    headers: headers.clone(),
                    auth: convert_auth(auth),
                    body: convert_body(body),
                    params: None,
                    assert: None,
                    tests: tests.clone(),
                    pre_request_script: pre_request_script.clone(),
                    post_response_script: post_response_script.clone(),
                    cookies: None,
                };

                let yaml = serde_yaml::to_string(&request_file)
                    .map_err(|e| format!("Failed to serialize request: {e}"))?;
                atomic_write(&parent_dir.join(format!("{filename}.yaml")), &yaml)?;
            }
        }
    }
    Ok(())
}

fn parse_method(method: &str) -> HttpMethod {
    match method.to_uppercase().as_str() {
        "GET" => HttpMethod::GET,
        "POST" => HttpMethod::POST,
        "PUT" => HttpMethod::PUT,
        "PATCH" => HttpMethod::PATCH,
        "DELETE" => HttpMethod::DELETE,
        "HEAD" => HttpMethod::HEAD,
        "OPTIONS" => HttpMethod::OPTIONS,
        _ => HttpMethod::GET,
    }
}

fn convert_auth(auth: &Option<AuthConfig>) -> Option<AuthConfig> {
    match auth {
        Some(AuthConfig::None) => None,
        other => other.clone(),
    }
}

fn convert_body(body: &Option<ImportBody>) -> Option<RequestBodyFile> {
    body.as_ref().map(|b| RequestBodyFile {
        body_type: b.body_type.clone(),
        content: b.content.clone(),
    })
}

/// Sanitize a string for use as a filename.
fn sanitize_filename(name: &str) -> String {
    let sanitized: String = name
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || c == '-' || c == '_' || c == '.' {
                c
            } else if c == ' ' {
                '-'
            } else {
                '_'
            }
        })
        .collect();

    let sanitized = sanitized
        .trim_matches(|c: char| c == '-' || c == '_' || c == '.')
        .to_string();

    if sanitized.is_empty() {
        "untitled".to_string()
    } else {
        sanitized.to_lowercase()
    }
}

/// Ensure unique name within a directory by appending -1, -2, etc.
fn unique_name(base: &str, used: &mut HashMap<String, usize>) -> String {
    let count = used.entry(base.to_string()).or_insert(0);
    let name = if *count == 0 {
        base.to_string()
    } else {
        format!("{base}-{count}")
    };
    *count += 1;
    name
}

fn atomic_write(path: &Path, content: &str) -> Result<(), String> {
    let tmp_path = path.with_extension("apiark.tmp");
    fs::write(&tmp_path, content).map_err(|e| format!("Failed to write temp file: {e}"))?;
    fs::rename(&tmp_path, path).map_err(|e| {
        let _ = fs::remove_file(&tmp_path);
        format!("Failed to rename temp file: {e}")
    })
}

#[derive(serde::Serialize)]
struct EnvFile<'a> {
    name: &'a str,
    variables: &'a HashMap<String, String>,
}
