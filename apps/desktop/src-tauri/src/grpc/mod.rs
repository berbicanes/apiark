pub mod client;
pub mod proto_parser;
pub mod reflection;

use std::collections::HashSet;

use prost_reflect::{Kind, MessageDescriptor};
use serde::{Deserialize, Serialize};
use serde_json::json;

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
    /// Example request body (JSON) with zero values for every field of the
    /// input message, generated from the descriptor so the editor can be
    /// pre-filled instead of showing an empty `{}`.
    pub example_json: String,
}

/// Build an example JSON object for a message descriptor, using zero values for
/// every field (`""` for strings, `0` for numbers, `false` for bools, `[]` for
/// repeated, `{}` for maps, the first variant for enums, and a recursively
/// generated object for nested messages).
///
/// `visited` guards against infinite recursion on self-referential or mutually
/// recursive messages: a message already on the current path collapses to `{}`.
pub fn generate_example_json(
    desc: &MessageDescriptor,
    visited: &mut HashSet<String>,
) -> serde_json::Value {
    if !visited.insert(desc.full_name().to_string()) {
        // Cycle detected — stop recursing and emit an empty object.
        return serde_json::Value::Object(Default::default());
    }

    let mut map = serde_json::Map::new();
    for field in desc.fields() {
        let value = if field.is_list() {
            serde_json::Value::Array(vec![])
        } else if field.is_map() {
            serde_json::Value::Object(Default::default())
        } else {
            match field.kind() {
                Kind::String | Kind::Bytes => json!(""),
                Kind::Bool => json!(false),
                Kind::Float | Kind::Double => json!(0.0),
                Kind::Int32
                | Kind::Int64
                | Kind::Uint32
                | Kind::Uint64
                | Kind::Sint32
                | Kind::Sint64
                | Kind::Fixed32
                | Kind::Fixed64
                | Kind::Sfixed32
                | Kind::Sfixed64 => json!(0),
                Kind::Enum(e) => e
                    .values()
                    .next()
                    .map(|v| json!(v.name()))
                    .unwrap_or_else(|| json!(0)),
                Kind::Message(m) => generate_example_json(&m, visited),
            }
        };
        map.insert(field.name().to_string(), value);
    }

    visited.remove(desc.full_name());
    serde_json::Value::Object(map)
}

/// Convenience wrapper: generate the example JSON for `desc` as a pretty string,
/// starting with a fresh cycle-tracking set.
pub fn example_json_for(desc: &MessageDescriptor) -> String {
    let mut visited = HashSet::new();
    generate_example_json(desc, &mut visited).to_string()
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
