pub mod client;
pub mod proto_parser;
#[allow(dead_code, unused_imports, unused_variables)]
pub mod reflection;

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcServiceInfo {
    pub name: String,
    pub full_name: String,
    pub methods: Vec<GrpcMethodInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcMethodInfo {
    pub name: String,
    pub full_name: String,
    pub input_type: String,
    pub output_type: String,
    pub call_type: GrpcCallType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum GrpcCallType {
    Unary,
    ServerStreaming,
    ClientStreaming,
    BidiStreaming,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcResponse {
    pub status_code: i32,
    pub status_message: String,
    pub body: String,
    pub time_ms: u64,
    pub metadata: Vec<GrpcMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GrpcMetadata {
    pub key: String,
    pub value: String,
}
