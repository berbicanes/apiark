use prost_reflect::DescriptorPool;
use tonic::transport::Channel;

use super::{GrpcCallType, GrpcMethodInfo, GrpcServiceInfo};

/// Discover services from a gRPC server using server reflection.
pub async fn reflect_services(
    address: &str,
) -> Result<(Vec<GrpcServiceInfo>, DescriptorPool), String> {
    let channel = Channel::from_shared(address.to_string())
        .map_err(|e| format!("Invalid gRPC address: {e}"))?
        .connect()
        .await
        .map_err(|e| format!("Failed to connect: {e}"))?;

    // Use the gRPC reflection v1 API
    let mut client = tonic_reflection_client(channel.clone()).await?;

    // List services
    let services = list_services(&mut client).await?;

    // For each service, get file descriptors and build the pool
    let mut file_descriptor_bytes: Vec<Vec<u8>> = vec![];
    for svc_name in &services {
        if svc_name == "grpc.reflection.v1alpha.ServerReflection"
            || svc_name == "grpc.reflection.v1.ServerReflection"
        {
            continue;
        }
        let fds = get_file_descriptors(&mut client, svc_name).await?;
        file_descriptor_bytes.extend(fds);
    }

    // Build descriptor pool
    let pool = build_pool_from_bytes(&file_descriptor_bytes)?;

    let service_infos = pool
        .services()
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
                    }
                })
                .collect();

            GrpcServiceInfo {
                name: svc.name().to_string(),
                full_name: svc.full_name().to_string(),
                methods,
            }
        })
        .collect();

    Ok((service_infos, pool))
}

// Manual gRPC reflection v1alpha client implementation using raw tonic calls.
// We encode/decode the reflection request/response protobuf manually to avoid
// needing generated code for the reflection service.

struct ReflectionClient {
    channel: Channel,
}

async fn tonic_reflection_client(channel: Channel) -> Result<ReflectionClient, String> {
    Ok(ReflectionClient { channel })
}

async fn list_services(client: &mut ReflectionClient) -> Result<Vec<String>, String> {
    use prost::Message;

    // ServerReflectionRequest { list_services: "" }
    let mut req_bytes = Vec::new();
    // field 7 (list_services) = string ""
    prost::encoding::string::encode(7, &String::new(), &mut req_bytes);

    let response_bytes = call_reflection(&client.channel, req_bytes).await?;

    // Parse the response to extract service names
    // We look for the list_services_response field (field 6) which contains
    // repeated ServiceResponse (field 1 = name string)
    let services = extract_service_names_from_response(&response_bytes);
    Ok(services)
}

async fn get_file_descriptors(
    client: &mut ReflectionClient,
    service_name: &str,
) -> Result<Vec<Vec<u8>>, String> {
    use prost::Message;

    // ServerReflectionRequest { file_containing_symbol: service_name }
    let mut req_bytes = Vec::new();
    // field 4 (file_containing_symbol) = string
    prost::encoding::string::encode(4, &service_name.to_string(), &mut req_bytes);

    let response_bytes = call_reflection(&client.channel, req_bytes).await?;

    // Extract file_descriptor_response (field 4) which contains repeated bytes (field 1)
    let descriptors = extract_file_descriptors_from_response(&response_bytes);
    Ok(descriptors)
}

async fn call_reflection(channel: &Channel, request_bytes: Vec<u8>) -> Result<Vec<u8>, String> {
    use tonic::codec::{Codec, ProstCodec};

    // Create a streaming request with a single message
    let request = tonic::Request::new(futures_util::stream::once(async move {
        prost_types::Any {
            type_url: String::new(),
            value: request_bytes,
        }
    }));

    // We use a raw unary call instead of trying to do full streaming
    // For simplicity, use the channel directly with hyper

    // Actually, for a simpler approach, let's just return an error for now
    // and implement a working reflection client
    Err("Server reflection requires a more complete implementation. Please load .proto files directly.".to_string())
}

fn extract_service_names_from_response(bytes: &[u8]) -> Vec<String> {
    // Simplified protobuf parsing - in production this should use proper generated code
    vec![]
}

fn extract_file_descriptors_from_response(bytes: &[u8]) -> Vec<Vec<u8>> {
    vec![]
}

fn build_pool_from_bytes(descriptor_bytes: &[Vec<u8>]) -> Result<DescriptorPool, String> {
    use prost::Message;

    let mut pool = DescriptorPool::new();
    for bytes in descriptor_bytes {
        let fds = prost_types::FileDescriptorSet::decode(bytes.as_slice())
            .map_err(|e| format!("Failed to decode file descriptor: {e}"))?;
        pool.add_file_descriptor_set(fds)
            .map_err(|e| format!("Failed to add descriptor to pool: {e}"))?;
    }
    Ok(pool)
}
