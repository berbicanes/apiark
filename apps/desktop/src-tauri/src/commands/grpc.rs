use tauri::State;

use crate::grpc::client::GrpcManager;
use crate::grpc::proto_parser;
use crate::grpc::{GrpcMetadata, GrpcResponse, GrpcServiceInfo};

#[tauri::command]
pub async fn grpc_load_proto(
    connection_id: String,
    proto_path: String,
    grpc: State<'_, GrpcManager>,
) -> Result<Vec<GrpcServiceInfo>, String> {
    let (services, pool) = proto_parser::parse_proto_file(&proto_path)?;
    grpc.store_pool(&connection_id, pool)?;
    Ok(services)
}

#[tauri::command]
pub async fn grpc_call_unary(
    connection_id: String,
    address: String,
    service_name: String,
    method_name: String,
    request_json: String,
    metadata: Vec<GrpcMetadata>,
    grpc: State<'_, GrpcManager>,
) -> Result<GrpcResponse, String> {
    grpc.call_unary(
        &connection_id,
        &address,
        &service_name,
        &method_name,
        &request_json,
        metadata,
    )
    .await
}

#[tauri::command]
pub async fn grpc_disconnect(address: String, grpc: State<'_, GrpcManager>) -> Result<(), String> {
    grpc.disconnect(&address)
}
