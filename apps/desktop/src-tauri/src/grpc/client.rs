use std::collections::HashMap;
use std::sync::Mutex;
use std::time::Instant;

use bytes::{Buf, BufMut};
use futures_util::StreamExt;
use prost::Message;
use prost_reflect::{DescriptorPool, DynamicMessage, MessageDescriptor};
use tauri::{AppHandle, Emitter};
use tonic::transport::Channel;

use super::{GrpcMetadata, GrpcResponse};

/// A raw codec that passes bytes through without protobuf re-encoding.
/// gRPC uses length-prefixed framing; this codec treats each frame's payload
/// as raw bytes, which we encode/decode ourselves with DynamicMessage.
#[derive(Debug, Clone, Default)]
struct RawBytesCodec;

impl tonic::codec::Codec for RawBytesCodec {
    type Encode = Vec<u8>;
    type Decode = Vec<u8>;
    type Encoder = RawBytesEncoder;
    type Decoder = RawBytesDecoder;

    fn encoder(&mut self) -> Self::Encoder {
        RawBytesEncoder
    }
    fn decoder(&mut self) -> Self::Decoder {
        RawBytesDecoder
    }
}

#[derive(Debug, Clone)]
struct RawBytesEncoder;

impl tonic::codec::Encoder for RawBytesEncoder {
    type Item = Vec<u8>;
    type Error = tonic::Status;

    fn encode(
        &mut self,
        item: Self::Item,
        dst: &mut tonic::codec::EncodeBuf<'_>,
    ) -> Result<(), Self::Error> {
        dst.put_slice(&item);
        Ok(())
    }
}

#[derive(Debug, Clone)]
struct RawBytesDecoder;

impl tonic::codec::Decoder for RawBytesDecoder {
    type Item = Vec<u8>;
    type Error = tonic::Status;

    fn decode(
        &mut self,
        src: &mut tonic::codec::DecodeBuf<'_>,
    ) -> Result<Option<Self::Item>, Self::Error> {
        let remaining = src.remaining();
        if remaining == 0 {
            return Ok(None);
        }
        let mut buf = vec![0u8; remaining];
        src.copy_to_slice(&mut buf);
        Ok(Some(buf))
    }
}

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

        let codec = RawBytesCodec;

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

    /// Make a server streaming gRPC call — spawns a background task that emits events
    pub async fn call_server_streaming(
        &self,
        connection_id: &str,
        address: &str,
        service_name: &str,
        method_name: &str,
        request_json: &str,
        metadata: Vec<GrpcMetadata>,
        app: AppHandle,
    ) -> Result<(), String> {
        let channel = self.get_channel(address).await?;

        let (_pool, method_desc, input_desc) =
            self.resolve_method(connection_id, service_name, method_name)?;

        let request_msg = json_to_dynamic_message(
            &input_desc,
            &serde_json::from_str(request_json).map_err(|e| format!("Invalid JSON: {e}"))?,
        )?;
        let mut request_bytes = Vec::new();
        request_msg
            .encode(&mut request_bytes)
            .map_err(|e| format!("Encode error: {e}"))?;

        let path = format!("/{}/{}", service_name, method_name);

        let mut grpc_client = tonic::client::Grpc::new(channel);
        grpc_client
            .ready()
            .await
            .map_err(|e| format!("Channel not ready: {e}"))?;

        let codec = RawBytesCodec;
        let mut request = tonic::Request::new(request_bytes);
        for m in &metadata {
            if let Ok(val) = m.value.parse() {
                if let Ok(key) = tonic::metadata::MetadataKey::from_bytes(m.key.as_bytes()) {
                    request.metadata_mut().insert(key, val);
                }
            }
        }

        let response = grpc_client
            .server_streaming(
                request,
                path.parse().map_err(|e| format!("Invalid path: {e}"))?,
                codec,
            )
            .await
            .map_err(|e| format!("gRPC streaming call failed: {e}"))?;

        let output_desc = method_desc.output();
        let event_name = format!("grpc:stream:{connection_id}");

        // Spawn background task to consume the stream
        tokio::spawn(async move {
            let start = Instant::now();
            let mut stream = response.into_inner();
            let mut message_count = 0u64;

            while let Some(result) = stream.next().await {
                match result {
                    Ok(bytes) => {
                        match DynamicMessage::decode(output_desc.clone(), bytes.as_slice()) {
                            Ok(msg) => {
                                let json = serde_json::to_string_pretty(&msg).unwrap_or_default();
                                let _ = app.emit(
                                    &event_name,
                                    serde_json::json!({
                                        "type": "message",
                                        "body": json,
                                        "index": message_count,
                                        "timeMs": start.elapsed().as_millis() as u64,
                                    }),
                                );
                                message_count += 1;
                            }
                            Err(e) => {
                                let _ = app.emit(
                                    &event_name,
                                    serde_json::json!({
                                        "type": "error",
                                        "message": format!("Decode error: {e}"),
                                    }),
                                );
                            }
                        }
                    }
                    Err(e) => {
                        let _ = app.emit(
                            &event_name,
                            serde_json::json!({
                                "type": "error",
                                "message": format!("Stream error: {e}"),
                            }),
                        );
                        break;
                    }
                }
            }

            let elapsed_ms = start.elapsed().as_millis() as u64;
            let _ = app.emit(
                &event_name,
                serde_json::json!({
                    "type": "complete",
                    "messageCount": message_count,
                    "timeMs": elapsed_ms,
                }),
            );
        });

        Ok(())
    }

    /// Make a client streaming gRPC call — sends multiple messages, receives one response
    pub async fn call_client_streaming(
        &self,
        connection_id: &str,
        address: &str,
        service_name: &str,
        method_name: &str,
        messages_json: Vec<String>,
        metadata: Vec<GrpcMetadata>,
        app: AppHandle,
    ) -> Result<GrpcResponse, String> {
        let channel = self.get_channel(address).await?;
        let (_pool, method_desc, input_desc) =
            self.resolve_method(connection_id, service_name, method_name)?;

        // Encode all messages
        let mut encoded_messages = Vec::new();
        for (i, json_str) in messages_json.iter().enumerate() {
            let json_value: serde_json::Value = serde_json::from_str(json_str)
                .map_err(|e| format!("Invalid JSON in message {i}: {e}"))?;
            let msg = json_to_dynamic_message(&input_desc, &json_value)?;
            let mut bytes = Vec::new();
            msg.encode(&mut bytes)
                .map_err(|e| format!("Encode error in message {i}: {e}"))?;
            encoded_messages.push(bytes);
        }

        let path = format!("/{}/{}", service_name, method_name);
        let start = Instant::now();
        let event_name = format!("grpc:stream:{connection_id}");

        let mut grpc_client = tonic::client::Grpc::new(channel);
        grpc_client
            .ready()
            .await
            .map_err(|e| format!("Channel not ready: {e}"))?;

        let codec = RawBytesCodec;

        // Create stream from messages
        let app_cs = app.clone();
        let event_cs = event_name.clone();
        let stream = futures_util::stream::iter(encoded_messages.into_iter().enumerate().map(
            move |(i, bytes)| {
                let _ = app_cs.emit(
                    &event_cs,
                    serde_json::json!({
                        "type": "sent",
                        "index": i,
                        "timeMs": start.elapsed().as_millis() as u64,
                    }),
                );
                bytes
            },
        ));

        let mut request = tonic::Request::new(stream);
        for m in &metadata {
            if let Ok(val) = m.value.parse() {
                if let Ok(key) = tonic::metadata::MetadataKey::from_bytes(m.key.as_bytes()) {
                    request.metadata_mut().insert(key, val);
                }
            }
        }

        let response = grpc_client
            .client_streaming(
                request,
                path.parse().map_err(|e| format!("Invalid path: {e}"))?,
                codec,
            )
            .await
            .map_err(|e| format!("gRPC client streaming failed: {e}"))?;

        let elapsed_ms = start.elapsed().as_millis() as u64;
        let output_desc = method_desc.output();
        let response_bytes = response.into_inner();
        let response_msg = DynamicMessage::decode(output_desc, response_bytes.as_slice())
            .map_err(|e| format!("Failed to decode response: {e}"))?;
        let response_json = serde_json::to_string_pretty(&response_msg)
            .map_err(|e| format!("Failed to serialize response: {e}"))?;

        let _ = app.emit(
            &event_name,
            serde_json::json!({
                "type": "complete",
                "messageCount": messages_json.len(),
                "timeMs": elapsed_ms,
            }),
        );

        Ok(GrpcResponse {
            status_code: 0,
            status_message: "OK".to_string(),
            body: response_json,
            time_ms: elapsed_ms,
            metadata: vec![],
        })
    }

    /// Make a bidirectional streaming gRPC call
    pub async fn call_bidi_streaming(
        &self,
        connection_id: &str,
        address: &str,
        service_name: &str,
        method_name: &str,
        messages_json: Vec<String>,
        metadata: Vec<GrpcMetadata>,
        app: AppHandle,
    ) -> Result<GrpcResponse, String> {
        let channel = self.get_channel(address).await?;
        let (_pool, method_desc, input_desc) =
            self.resolve_method(connection_id, service_name, method_name)?;

        let mut encoded_messages = Vec::new();
        for (i, json_str) in messages_json.iter().enumerate() {
            let json_value: serde_json::Value = serde_json::from_str(json_str)
                .map_err(|e| format!("Invalid JSON in message {i}: {e}"))?;
            let msg = json_to_dynamic_message(&input_desc, &json_value)?;
            let mut bytes = Vec::new();
            msg.encode(&mut bytes)
                .map_err(|e| format!("Encode error in message {i}: {e}"))?;
            encoded_messages.push(bytes);
        }

        let path = format!("/{}/{}", service_name, method_name);
        let start = Instant::now();
        let event_name = format!("grpc:stream:{connection_id}");
        let sent_count = encoded_messages.len();

        let mut grpc_client = tonic::client::Grpc::new(channel);
        grpc_client
            .ready()
            .await
            .map_err(|e| format!("Channel not ready: {e}"))?;

        let codec = RawBytesCodec;

        let app_clone = app.clone();
        let event_clone = event_name.clone();
        let start_clone = start;
        let stream = futures_util::stream::iter(encoded_messages.into_iter().enumerate().map(
            move |(i, bytes)| {
                let _ = app_clone.emit(
                    &event_clone,
                    serde_json::json!({
                        "type": "sent",
                        "index": i,
                        "timeMs": start_clone.elapsed().as_millis() as u64,
                    }),
                );
                bytes
            },
        ));

        let mut request = tonic::Request::new(stream);
        for m in &metadata {
            if let Ok(val) = m.value.parse() {
                if let Ok(key) = tonic::metadata::MetadataKey::from_bytes(m.key.as_bytes()) {
                    request.metadata_mut().insert(key, val);
                }
            }
        }

        let response = grpc_client
            .streaming(
                request,
                path.parse().map_err(|e| format!("Invalid path: {e}"))?,
                codec,
            )
            .await
            .map_err(|e| format!("gRPC bidi streaming failed: {e}"))?;

        let output_desc = method_desc.output();
        let mut response_stream = response.into_inner();
        let mut received_count = 0u64;

        while let Some(result) = response_stream.next().await {
            match result {
                Ok(bytes) => match DynamicMessage::decode(output_desc.clone(), bytes.as_slice()) {
                    Ok(msg) => {
                        let json = serde_json::to_string_pretty(&msg).unwrap_or_default();
                        let _ = app.emit(
                            &event_name,
                            serde_json::json!({
                                "type": "message",
                                "body": json,
                                "index": received_count,
                                "timeMs": start.elapsed().as_millis() as u64,
                            }),
                        );
                        received_count += 1;
                    }
                    Err(e) => {
                        let _ = app.emit(
                            &event_name,
                            serde_json::json!({
                                "type": "error",
                                "message": format!("Decode error: {e}"),
                            }),
                        );
                    }
                },
                Err(e) => {
                    let _ = app.emit(
                        &event_name,
                        serde_json::json!({
                            "type": "error",
                            "message": format!("Stream error: {e}"),
                        }),
                    );
                    break;
                }
            }
        }

        let elapsed_ms = start.elapsed().as_millis() as u64;
        let _ = app.emit(
            &event_name,
            serde_json::json!({
                "type": "complete",
                "messageCount": received_count,
                "timeMs": elapsed_ms,
            }),
        );

        Ok(GrpcResponse {
            status_code: 0,
            status_message: format!("Bidi complete (sent {sent_count}, received {received_count})"),
            body: format!("{{\"sent\": {sent_count}, \"received\": {received_count}}}"),
            time_ms: elapsed_ms,
            metadata: vec![],
        })
    }

    /// Resolve method descriptor from stored pool
    fn resolve_method(
        &self,
        connection_id: &str,
        service_name: &str,
        method_name: &str,
    ) -> Result<
        (
            DescriptorPool,
            prost_reflect::MethodDescriptor,
            MessageDescriptor,
        ),
        String,
    > {
        let pool = {
            let pools = self.pools.lock().map_err(|e| format!("Lock error: {e}"))?;
            pools
                .get(connection_id)
                .cloned()
                .ok_or_else(|| "No proto schema loaded. Load a .proto file first.".to_string())?
        };
        let svc_desc = pool
            .services()
            .find(|s| s.full_name() == service_name)
            .ok_or_else(|| format!("Service not found: {service_name}"))?;
        let method_desc = svc_desc
            .methods()
            .find(|m| m.name() == method_name)
            .ok_or_else(|| format!("Method not found: {method_name}"))?;
        let input_desc = method_desc.input();
        Ok((pool, method_desc, input_desc))
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
    let mut msg = DynamicMessage::new(desc.clone());

    if let serde_json::Value::Object(map) = value {
        for field in desc.fields() {
            let field_name = field.name();
            if let Some(val) = map.get(field_name) {
                if let Some(pv) = json_to_prost_value(&field, val) {
                    msg.set_field(&field, pv);
                }
            }
        }
    }

    Ok(msg)
}

fn json_to_prost_value(
    field: &prost_reflect::FieldDescriptor,
    val: &serde_json::Value,
) -> Option<prost_reflect::Value> {
    use prost_reflect::Kind;

    match val {
        serde_json::Value::String(s) => Some(prost_reflect::Value::String(s.clone())),
        serde_json::Value::Bool(b) => Some(prost_reflect::Value::Bool(*b)),
        serde_json::Value::Number(n) => match field.kind() {
            Kind::Int32 | Kind::Sint32 | Kind::Sfixed32 => {
                n.as_i64().map(|v| prost_reflect::Value::I32(v as i32))
            }
            Kind::Int64 | Kind::Sint64 | Kind::Sfixed64 => {
                n.as_i64().map(prost_reflect::Value::I64)
            }
            Kind::Uint32 | Kind::Fixed32 => n.as_u64().map(|v| prost_reflect::Value::U32(v as u32)),
            Kind::Uint64 | Kind::Fixed64 => n.as_u64().map(prost_reflect::Value::U64),
            Kind::Float => n.as_f64().map(|v| prost_reflect::Value::F32(v as f32)),
            Kind::Double => n.as_f64().map(prost_reflect::Value::F64),
            _ => n.as_i64().map(prost_reflect::Value::I64),
        },
        _ => None,
    }
}
