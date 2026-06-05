fn main() {
    // Compile the gRPC server reflection proto into a tonic client.
    // We parse the .proto with protox (pure-Rust) instead of relying on a
    // system `protoc` binary, then feed the FileDescriptorSet to tonic-build.
    let fds = protox::compile(["proto/reflection.proto"], ["proto"])
        .expect("failed to compile reflection.proto with protox");

    tonic_build::configure()
        .build_server(false)
        .compile_fds(fds)
        .expect("failed to generate reflection client");

    println!("cargo:rerun-if-changed=proto/reflection.proto");

    tauri_build::build();
}
