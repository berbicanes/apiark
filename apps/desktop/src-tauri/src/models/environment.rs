use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// On-disk environment file (environments/development.yaml)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EnvironmentFile {
    pub name: String,
    #[serde(default)]
    pub variables: HashMap<String, String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub secrets: Vec<String>,
    /// Whether this environment is shared (committed to git) or personal (gitignored).
    /// Determined by which directory the file is in.
    #[serde(default)]
    pub scope: EnvironmentScope,
    /// Optional hex colour (e.g. "#10b981") for visual identification.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum EnvironmentScope {
    #[default]
    Shared,
    Personal,
}
