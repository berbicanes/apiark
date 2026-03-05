use std::path::Path;

use prost_reflect::DescriptorPool;
use protox::Compiler;

use super::{GrpcCallType, GrpcMethodInfo, GrpcServiceInfo};

/// Parse .proto files from a path (file or directory) and return service info.
pub fn parse_proto_file(
    proto_path: &str,
) -> Result<(Vec<GrpcServiceInfo>, DescriptorPool), String> {
    let path = Path::new(proto_path);

    if !path.exists() {
        return Err(format!("Proto file not found: {proto_path}"));
    }

    // Collect proto files
    let proto_files = if path.is_dir() {
        collect_proto_files(path)?
    } else {
        vec![path.to_path_buf()]
    };

    if proto_files.is_empty() {
        return Err("No .proto files found".to_string());
    }

    // Use protox to compile protos into FileDescriptorSet
    let mut compiler = Compiler::new(vec![path.parent().unwrap_or(Path::new(".")).to_path_buf()])
        .map_err(|e| format!("Failed to create proto compiler: {e}"))?;

    for proto in &proto_files {
        let name = proto
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string();
        compiler
            .open_file(name.as_str())
            .map_err(|e| format!("Failed to open proto {name}: {e}"))?;
    }

    let fds = compiler.file_descriptor_set();

    let pool = DescriptorPool::from_file_descriptor_set(fds)
        .map_err(|e| format!("Failed to build descriptor pool: {e}"))?;

    let services = extract_services(&pool);

    Ok((services, pool))
}

fn extract_services(pool: &DescriptorPool) -> Vec<GrpcServiceInfo> {
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

fn collect_proto_files(dir: &Path) -> Result<Vec<std::path::PathBuf>, String> {
    let mut files = vec![];
    for entry in std::fs::read_dir(dir).map_err(|e| format!("Failed to read directory: {e}"))? {
        let entry = entry.map_err(|e| format!("Dir entry error: {e}"))?;
        let path = entry.path();
        if path.is_file() && path.extension().map(|e| e == "proto").unwrap_or(false) {
            files.push(path);
        }
    }
    Ok(files)
}
