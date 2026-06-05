use std::collections::HashMap;

use futures_util::stream;
use prost::Message;
use prost_reflect::DescriptorPool;
use prost_types::FileDescriptorProto;
use tonic::transport::Channel;

use super::client::GrpcManager;
use super::{example_json_for, GrpcCallType, GrpcMethodInfo, GrpcServiceInfo};

// Generated gRPC server reflection (v1) client. The proto is compiled at build
// time (see build.rs) via protox -> tonic-build, so no system `protoc` is needed.
mod proto {
    #![allow(clippy::all)]
    #![allow(dead_code)]
    tonic::include_proto!("grpc.reflection.v1");
}

use proto::server_reflection_client::ServerReflectionClient;
use proto::server_reflection_request::MessageRequest;
use proto::server_reflection_response::MessageResponse;
use proto::ServerReflectionRequest;

/// Discover services from a gRPC server using server reflection (v1).
///
/// Reuses the [`GrpcManager`] channel for `address`, lists the server's
/// services, fetches the file descriptors for each, and builds a
/// [`DescriptorPool`] usable for dynamic message encoding/decoding — the same
/// pool produced by loading `.proto` files. Reusing the manager's channel means
/// subsequent `grpc_call_*` invocations share the connection opened here.
pub async fn reflect_services(
    grpc: &GrpcManager,
    address: &str,
) -> Result<(Vec<GrpcServiceInfo>, DescriptorPool), String> {
    let channel = grpc.get_channel(address).await?;
    let mut client = ServerReflectionClient::new(channel);

    let services = list_services(&mut client).await?;

    // Fetch the file descriptors that define each service. The server returns
    // each file together with its transitive dependencies as serialized
    // FileDescriptorProtos. We decode and dedupe by file name (the stable
    // identity) so the same file requested via two services is added once.
    let mut files: HashMap<String, FileDescriptorProto> = HashMap::new();
    for service in &services {
        if is_reflection_service(service) {
            continue;
        }
        for bytes in file_containing_symbol(&mut client, service).await? {
            let descriptor = FileDescriptorProto::decode(bytes.as_slice())
                .map_err(|e| format!("Failed to decode file descriptor: {e}"))?;
            files
                .entry(descriptor.name().to_string())
                .or_insert(descriptor);
        }
    }

    let pool = build_pool_from_reflection(files.into_values())?;
    let service_infos = pool_to_service_infos(&pool);

    Ok((service_infos, pool))
}

fn is_reflection_service(name: &str) -> bool {
    name == "grpc.reflection.v1.ServerReflection"
        || name == "grpc.reflection.v1alpha.ServerReflection"
}

/// Open a single-shot bidi reflection stream, send one request, and return the
/// server's first response payload.
async fn send_reflection_request(
    client: &mut ServerReflectionClient<Channel>,
    message_request: MessageRequest,
) -> Result<MessageResponse, String> {
    let request = ServerReflectionRequest {
        host: String::new(),
        message_request: Some(message_request),
    };

    let mut responses = client
        .server_reflection_info(stream::once(async move { request }))
        .await
        .map_err(|status| format!("Server reflection call failed: {status}"))?
        .into_inner();

    responses
        .message()
        .await
        .map_err(|status| format!("Server reflection stream error: {status}"))?
        .ok_or_else(|| "Server returned an empty reflection response".to_string())?
        .message_response
        .ok_or_else(|| "Server reflection response had no payload".to_string())
}

async fn list_services(
    client: &mut ServerReflectionClient<Channel>,
) -> Result<Vec<String>, String> {
    match send_reflection_request(client, MessageRequest::ListServices(String::new())).await? {
        MessageResponse::ListServicesResponse(resp) => {
            Ok(resp.service.into_iter().map(|s| s.name).collect())
        }
        MessageResponse::ErrorResponse(err) => Err(reflection_error("list services", &err)),
        _ => Err("Unexpected reflection response to list_services".to_string()),
    }
}

async fn file_containing_symbol(
    client: &mut ServerReflectionClient<Channel>,
    symbol: &str,
) -> Result<Vec<Vec<u8>>, String> {
    let request = MessageRequest::FileContainingSymbol(symbol.to_string());
    match send_reflection_request(client, request).await? {
        MessageResponse::FileDescriptorResponse(resp) => Ok(resp.file_descriptor_proto),
        MessageResponse::ErrorResponse(err) => {
            Err(reflection_error(&format!("resolve symbol {symbol}"), &err))
        }
        _ => Err(format!(
            "Unexpected reflection response to file_containing_symbol for {symbol}"
        )),
    }
}

fn reflection_error(action: &str, err: &proto::ErrorResponse) -> String {
    format!(
        "Server reflection error while trying to {action} (code {}): {}",
        err.error_code, err.error_message
    )
}

/// Build a [`DescriptorPool`] from the `FileDescriptorProto`s gathered via
/// reflection. Files may arrive in any order; `add_file_descriptor_protos`
/// resolves imports across the whole batch and skips duplicates by name.
fn build_pool_from_reflection(
    files: impl IntoIterator<Item = FileDescriptorProto>,
) -> Result<DescriptorPool, String> {
    let mut pool = DescriptorPool::new();
    pool.add_file_descriptor_protos(files)
        .map_err(|e| format!("Failed to build descriptor pool: {e}"))?;
    Ok(pool)
}

fn pool_to_service_infos(pool: &DescriptorPool) -> Vec<GrpcServiceInfo> {
    pool.services()
        .map(|svc| {
            let methods = svc
                .methods()
                .map(|m| {
                    let call_type = match (m.is_client_streaming(), m.is_server_streaming()) {
                        (false, false) => GrpcCallType::Unary,
                        (false, true) => GrpcCallType::ServerStreaming,
                        (true, false) => GrpcCallType::ClientStreaming,
                        (true, true) => GrpcCallType::BidiStreaming,
                    };
                    GrpcMethodInfo {
                        name: m.name().to_string(),
                        full_name: m.full_name().to_string(),
                        input_type: m.input().full_name().to_string(),
                        output_type: m.output().full_name().to_string(),
                        call_type,
                        example_json: example_json_for(&m.input()),
                    }
                })
                .collect();

            GrpcServiceInfo {
                name: svc.name().to_string(),
                full_name: svc.full_name().to_string(),
                methods,
            }
        })
        .collect()
}
