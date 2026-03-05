use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use prost::Message;
use prost_reflect::{DescriptorPool, DynamicMessage, MessageDescriptor};
use tauri::{AppHandle, Emitter};
use tonic::transport::Channel;
use tonic::IntoRequest;

use super::{GrpcMetadata, GrpcResponse, GrpcStreamMessage};

pub struct GrpcManager {
    /// Active channels keyed by address
    channels: Mutex<HashMap<String, Channel>>,
    /// Descriptor pools keyed by connection ID
    pools: Mutex<HashMap<String, DescriptorPool>>,
}

impl GrpcManager {
    pub fn new() -> Self {
        Self {
            channels: Mutex::new(HashMap::new()),
            pools: Mutex::new(HashMap::new()),
        }
    }

    /// Store a descriptor pool for a connection
    pub fn store_pool(&self, connection_id: &str, pool: DescriptorPool) -> Result<(), String> {
        let mut pools = self.pools.lock().map_err(|e| format!("Lock error: {e}"))?;
        pools.insert(connection_id.to_string(), pool);
        Ok(())
    }

    /// Get or create a channel to the given address
    async fn get_channel(&self, address: &str) -> Result<Channel, String> {
        {
            let channels = self
                .channels
                .lock()
                .map_err(|e| format!("Lock error: {e}"))?;
            if let Some(ch) = channels.get(address) {
                return Ok(ch.clone());
            }
        }

        let channel = Channel::from_shared(address.to_string())
            .map_err(|e| format!("Invalid gRPC address: {e}"))?
            .connect()
            .await
            .map_err(|e| format!("Failed to connect to gRPC server: {e}"))?;

        let mut channels = self
            .channels
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        channels.insert(address.to_string(), channel.clone());
        Ok(channel)
    }

    /// Make a unary gRPC call
    pub async fn call_unary(
        &self,
        connection_id: &str,
        address: &str,
        service_name: &str,
        method_name: &str,
        request_json: &str,
        metadata: Vec<GrpcMetadata>,
    ) -> Result<GrpcResponse, String> {
        let channel = self.get_channel(address).await?;

        let pool = {
            let pools = self.pools.lock().map_err(|e| format!("Lock error: {e}"))?;
            pools.get(connection_id).cloned().ok_or_else(|| {
                "No proto schema loaded for this connection. Load a .proto file first.".to_string()
            })?
        };

        // Find the method descriptor
        let full_method = format!("{service_name}.{method_name}");
        let svc_desc = pool
            .services()
            .find(|s| s.full_name() == service_name)
            .ok_or_else(|| format!("Service not found: {service_name}"))?;

        let method_desc = svc_desc
            .methods()
            .find(|m| m.name() == method_name)
            .ok_or_else(|| format!("Method not found: {method_name}"))?;

        let input_desc = method_desc.input();

        // Parse JSON to DynamicMessage
        let json_value: serde_json::Value =
            serde_json::from_str(request_json).map_err(|e| format!("Invalid JSON: {e}"))?;
        let request_msg = json_to_dynamic_message(&input_desc, &json_value)?;

        // Encode to bytes
        let mut request_bytes = Vec::new();
        request_msg
            .encode(&mut request_bytes)
            .map_err(|e| format!("Failed to encode request: {e}"))?;

        // Build the path: /{package.ServiceName}/{MethodName}
        let path = format!("/{}/{}", service_name, method_name);

        let start = Instant::now();

        // Make raw gRPC call using tonic's codec
        let mut grpc_client = tonic::client::Grpc::new(channel);
        grpc_client
            .ready()
            .await
            .map_err(|e| format!("Channel not ready: {e}"))?;

        let codec = tonic::codec::ProstCodec::<Vec<u8>, Vec<u8>>::default();

        let mut request = tonic::Request::new(request_bytes);

        // Add metadata
        for m in &metadata {
            if let Ok(val) = m.value.parse() {
                request.metadata_mut().insert(
                    tonic::metadata::MetadataKey::from_bytes(m.key.as_bytes())
                        .map_err(|e| format!("Invalid metadata key: {e}"))?,
                    val,
                );
            }
        }

        let response = grpc_client
            .unary(
                request,
                path.parse().map_err(|e| format!("Invalid path: {e}"))?,
                codec,
            )
            .await
            .map_err(|e| format!("gRPC call failed: {e}"))?;

        let elapsed_ms = start.elapsed().as_millis() as u64;

        // Decode response
        let response_bytes = response.into_inner();
        let output_desc = method_desc.output();
        let response_msg = DynamicMessage::decode(output_desc, response_bytes.as_slice())
            .map_err(|e| format!("Failed to decode response: {e}"))?;

        // Serialize response to JSON
        let response_json = serde_json::to_string_pretty(&response_msg)
            .map_err(|e| format!("Failed to serialize response: {e}"))?;

        Ok(GrpcResponse {
            status_code: 0, // OK
            status_message: "OK".to_string(),
            body: response_json,
            time_ms: elapsed_ms,
            metadata: vec![],
        })
    }

    /// Disconnect from a gRPC server
    pub fn disconnect(&self, address: &str) -> Result<(), String> {
        let mut channels = self
            .channels
            .lock()
            .map_err(|e| format!("Lock error: {e}"))?;
        channels.remove(address);
        Ok(())
    }
}

/// Convert a JSON value to a DynamicMessage using the serde feature.
fn json_to_dynamic_message(
    desc: &MessageDescriptor,
    value: &serde_json::Value,
) -> Result<DynamicMessage, String> {
    // Create an empty message and set fields from JSON
    let mut msg = DynamicMessage::new(desc.clone());

    if let serde_json::Value::Object(map) = value {
        for field in desc.fields() {
            let field_name = field.name();
            if let Some(val) = map.get(field_name) {
                // For simplicity, convert basic types
                match val {
                    serde_json::Value::String(s) => {
                        msg.set_field(&field, prost_reflect::Value::String(s.clone()));
                    }
                    serde_json::Value::Number(n) => {
                        if let Some(i) = n.as_i64() {
                            msg.set_field(&field, prost_reflect::Value::I64(i));
                        } else if let Some(f) = n.as_f64() {
                            msg.set_field(&field, prost_reflect::Value::F64(f));
                        }
                    }
                    serde_json::Value::Bool(b) => {
                        msg.set_field(&field, prost_reflect::Value::Bool(*b));
                    }
                    _ => {} // Skip complex types for now
                }
            }
        }
    }

    Ok(msg)
}
