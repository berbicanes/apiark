//! ApiArk MCP Server
//!
//! Implements the Model Context Protocol (MCP) over stdio for AI editor integration.
//! Exposes ApiArk collections as resources and provides tools for API operations.

use std::io::{self, BufRead, Write};

use serde_json::{json, Value};

mod collection;

fn main() {
    let stdin = io::stdin();
    let stdout = io::stdout();
    let mut stdout = stdout.lock();

    for line in stdin.lock().lines() {
        let line = match line {
            Ok(l) => l,
            Err(_) => break,
        };

        if line.trim().is_empty() {
            continue;
        }

        let request: Value = match serde_json::from_str(&line) {
            Ok(v) => v,
            Err(e) => {
                let error_response = json!({
                    "jsonrpc": "2.0",
                    "error": { "code": -32700, "message": format!("Parse error: {e}") },
                    "id": null
                });
                let _ = writeln!(stdout, "{}", error_response);
                let _ = stdout.flush();
                continue;
            }
        };

        let response = handle_request(&request);
        let _ = writeln!(stdout, "{}", response);
        let _ = stdout.flush();
    }
}

fn handle_request(request: &Value) -> Value {
    let id = request.get("id").cloned().unwrap_or(Value::Null);
    let method = request
        .get("method")
        .and_then(|m| m.as_str())
        .unwrap_or("");

    match method {
        "initialize" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {},
                    "resources": {}
                },
                "serverInfo": {
                    "name": "apiark-mcp",
                    "version": env!("CARGO_PKG_VERSION")
                }
            }
        }),

        "initialized" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {}
        }),

        "tools/list" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": {
                "tools": [
                    {
                        "name": "list_collections",
                        "description": "List ApiArk collections found in a directory",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "directory": { "type": "string", "description": "Directory to scan for collections" }
                            },
                            "required": ["directory"]
                        }
                    },
                    {
                        "name": "list_requests",
                        "description": "List all requests in an ApiArk collection",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "collection_path": { "type": "string", "description": "Path to the collection directory" }
                            },
                            "required": ["collection_path"]
                        }
                    },
                    {
                        "name": "read_request",
                        "description": "Read a specific API request file from a collection",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "file_path": { "type": "string", "description": "Path to the .yaml request file" }
                            },
                            "required": ["file_path"]
                        }
                    },
                    {
                        "name": "send_request",
                        "description": "Send an HTTP request and return the response",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "method": { "type": "string", "description": "HTTP method (GET, POST, PUT, etc.)" },
                                "url": { "type": "string", "description": "Request URL" },
                                "headers": {
                                    "type": "object",
                                    "description": "Request headers as key-value pairs",
                                    "additionalProperties": { "type": "string" }
                                },
                                "body": { "type": "string", "description": "Request body" }
                            },
                            "required": ["method", "url"]
                        }
                    },
                    {
                        "name": "list_environments",
                        "description": "List environments for a collection",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "collection_path": { "type": "string", "description": "Path to the collection directory" }
                            },
                            "required": ["collection_path"]
                        }
                    },
                    {
                        "name": "create_request",
                        "description": "Create a new API request YAML file in a collection",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "collection_path": { "type": "string", "description": "Path to the collection directory" },
                                "name": { "type": "string", "description": "Request name" },
                                "method": { "type": "string", "description": "HTTP method" },
                                "url": { "type": "string", "description": "Request URL" },
                                "folder": { "type": "string", "description": "Optional subfolder within collection" }
                            },
                            "required": ["collection_path", "name", "method", "url"]
                        }
                    },
                    {
                        "name": "duplicate_item",
                        "description": "Duplicate a file or folder in a collection with '(copy)' suffix",
                        "inputSchema": {
                            "type": "object",
                            "properties": {
                                "path": { "type": "string", "description": "Path to the file or folder to duplicate" }
                            },
                            "required": ["path"]
                        }
                    }
                ]
            }
        }),

        "tools/call" => {
            let params = request.get("params").cloned().unwrap_or(json!({}));
            let tool_name = params.get("name").and_then(|n| n.as_str()).unwrap_or("");
            let arguments = params.get("arguments").cloned().unwrap_or(json!({}));

            let result = match tool_name {
                "list_collections" => collection::list_collections(&arguments),
                "list_requests" => collection::list_requests(&arguments),
                "read_request" => collection::read_request(&arguments),
                "send_request" => collection::send_http_request(&arguments),
                "list_environments" => collection::list_environments(&arguments),
                "create_request" => collection::create_request(&arguments),
                "duplicate_item" => collection::duplicate_item(&arguments),
                _ => Err(format!("Unknown tool: {tool_name}")),
            };

            match result {
                Ok(content) => json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "content": [{ "type": "text", "text": content }]
                    }
                }),
                Err(e) => json!({
                    "jsonrpc": "2.0",
                    "id": id,
                    "result": {
                        "content": [{ "type": "text", "text": format!("Error: {e}") }],
                        "isError": true
                    }
                }),
            }
        }

        "resources/list" => json!({
            "jsonrpc": "2.0",
            "id": id,
            "result": { "resources": [] }
        }),

        _ => json!({
            "jsonrpc": "2.0",
            "id": id,
            "error": { "code": -32601, "message": format!("Method not found: {method}") }
        }),
    }
}
