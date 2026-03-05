import type {
  SendRequestParams,
  ResponseData,
  ScriptedResponseData,
  HttpError,
  CollectionNode,
  RequestFile,
  EnvironmentData,
  HistoryEntry,
  AppSettings,
  ParsedCurlRequest,
  PersistedState,
  RunConfig,
  RunSummary,
  WsConnectParams,
  AuthConfig,
  OAuthTokenStatus,
  ImportPreview,
  ImportFormat,
  ExportFormat,
} from "@apiark/types";

// ── Tauri environment detection ──

// window.__TAURI_INTERNALS__ exists only inside the Tauri webview.
// When running via plain `pnpm dev` in a browser, invoke is unavailable.
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

let _invoke: typeof import("@tauri-apps/api/core").invoke | undefined;

async function getInvoke() {
  if (!isTauri()) {
    throw new Error("Not running in Tauri environment. Use `pnpm tauri dev` to run the app.");
  }
  if (!_invoke) {
    const mod = await import("@tauri-apps/api/core");
    _invoke = mod.invoke;
  }
  return _invoke;
}

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const fn = await getInvoke();
  return fn<T>(cmd, args);
}

// ── Error handling ──

function handleTauriError(err: unknown): never {
  if (typeof err === "string") {
    try {
      const httpError: HttpError = JSON.parse(err);
      throw httpError;
    } catch (parseErr) {
      if ((parseErr as HttpError).errorType) {
        throw parseErr;
      }
      throw {
        errorType: "unknown",
        message: err,
      } satisfies HttpError;
    }
  }
  throw {
    errorType: "unknown",
    message: String(err),
  } satisfies HttpError;
}

// ── HTTP ──

export async function sendRequest(
  params: SendRequestParams,
  variables?: Record<string, string>,
  collectionPath?: string,
  requestName?: string,
): Promise<ResponseData> {
  try {
    return await invoke<ResponseData>("send_request", {
      params,
      variables: variables ?? null,
      collectionPath: collectionPath ?? null,
      requestName: requestName ?? null,
    });
  } catch (err) {
    handleTauriError(err);
  }
}

export async function sendRequestWithScripts(
  params: SendRequestParams,
  variables?: Record<string, string>,
  collectionPath?: string,
  requestName?: string,
  preRequestScript?: string | null,
  postResponseScript?: string | null,
  testScript?: string | null,
  assertionsYaml?: string | null,
): Promise<ScriptedResponseData> {
  try {
    return await invoke<ScriptedResponseData>("send_request_with_scripts", {
      params,
      variables: variables ?? null,
      collectionPath: collectionPath ?? null,
      requestName: requestName ?? null,
      preRequestScript: preRequestScript ?? null,
      postResponseScript: postResponseScript ?? null,
      testScript: testScript ?? null,
      assertionsYaml: assertionsYaml ?? null,
    });
  } catch (err) {
    handleTauriError(err);
  }
}

export async function readFullResponse(path: string): Promise<string> {
  return await invoke<string>("read_full_response", { path });
}

// ── Collections ──

export async function openCollection(path: string): Promise<CollectionNode> {
  return await invoke<CollectionNode>("open_collection", { path });
}

export async function readRequestFile(path: string): Promise<RequestFile> {
  return await invoke<RequestFile>("read_request_file", { path });
}

export async function saveRequestFile(
  path: string,
  request: RequestFile,
): Promise<void> {
  return await invoke<void>("save_request_file", { path, request });
}

export async function createRequest(
  dir: string,
  filename: string,
  name: string,
): Promise<string> {
  return await invoke<string>("create_request", {
    dir,
    filename,
    name,
    method: "GET",
    url: "",
  });
}

export async function createFolder(
  parent: string,
  name: string,
): Promise<string> {
  return await invoke<string>("create_folder", { parent, name });
}

export async function deleteItem(
  path: string,
  collectionName: string,
): Promise<string> {
  return await invoke<string>("delete_item", { path, collectionName });
}

export async function saveFolderOrder(
  dir: string,
  order: string[],
): Promise<void> {
  return await invoke<void>("save_folder_order", { dir, order });
}

export async function renameItem(
  path: string,
  newName: string,
): Promise<string> {
  return await invoke<string>("rename_item", { path, newName });
}

// ── Environments ──

export async function loadEnvironments(
  collectionPath: string,
): Promise<EnvironmentData[]> {
  return await invoke<EnvironmentData[]>("load_environments", {
    collectionPath,
  });
}

export async function getResolvedVariables(
  collectionPath: string,
  environmentName: string,
): Promise<Record<string, string>> {
  return await invoke<Record<string, string>>("get_resolved_variables", {
    collectionPath,
    environmentName,
  });
}

export async function loadRootDotenv(
  collectionPath: string,
): Promise<Record<string, string>> {
  return await invoke<Record<string, string>>("load_root_dotenv", {
    collectionPath,
  });
}

// ── History ──

export async function getHistory(): Promise<HistoryEntry[]> {
  return await invoke<HistoryEntry[]>("get_history", {});
}

export async function searchHistory(query: string): Promise<HistoryEntry[]> {
  return await invoke<HistoryEntry[]>("search_history", { query });
}

export async function clearHistory(): Promise<void> {
  return await invoke<void>("clear_history", {});
}

// ── State Persistence ──

export async function loadPersistedState(): Promise<PersistedState> {
  return await invoke<PersistedState>("load_persisted_state", {});
}

export async function savePersistedState(state: PersistedState): Promise<void> {
  return await invoke<void>("save_persisted_state", { state });
}

// ── cURL ──

export async function parseCurlCommand(input: string): Promise<ParsedCurlRequest> {
  return await invoke<ParsedCurlRequest>("parse_curl_command", { input });
}

export async function exportCurlCommand(
  method: string,
  url: string,
  headers: Record<string, string>,
  body?: string,
  authBasic?: [string, string],
): Promise<string> {
  return await invoke<string>("export_curl_command", {
    method,
    url,
    headers,
    body: body ?? null,
    authBasic: authBasic ?? null,
  });
}

// ── Collection Runner ──

export async function runCollection(config: RunConfig): Promise<RunSummary> {
  try {
    return await invoke<RunSummary>("run_collection_command", { config });
  } catch (err) {
    handleTauriError(err);
  }
}

// ── WebSocket ──

export async function wsConnect(connectionId: string, params: WsConnectParams): Promise<void> {
  return await invoke<void>("ws_connect", { connectionId, params });
}

export async function wsSend(connectionId: string, message: string): Promise<void> {
  return await invoke<void>("ws_send", { connectionId, message });
}

export async function wsDisconnect(connectionId: string): Promise<void> {
  return await invoke<void>("ws_disconnect", { connectionId });
}

// ── SSE ──

export async function sseConnect(connectionId: string, params: { url: string; headers: import("@apiark/types").KeyValuePair[] }): Promise<void> {
  return await invoke<void>("sse_connect", { connectionId, params });
}

export async function sseDisconnect(connectionId: string): Promise<void> {
  return await invoke<void>("sse_disconnect", { connectionId });
}

// ── OAuth ──

export async function oauthStartFlow(authConfig: AuthConfig): Promise<string> {
  try {
    return await invoke<string>("oauth_start_flow", { authConfig });
  } catch (err) {
    handleTauriError(err);
  }
}

export async function oauthGetTokenStatus(key: string): Promise<OAuthTokenStatus> {
  return await invoke<OAuthTokenStatus>("oauth_get_token_status", { key });
}

export async function oauthClearToken(key: string): Promise<void> {
  return await invoke<void>("oauth_clear_token", { key });
}

// ── Import/Export ──

export async function detectImportFormat(filePath: string): Promise<string> {
  return await invoke<string>("detect_import_format", { filePath });
}

export async function importPreview(
  filePath: string,
  format: ImportFormat,
): Promise<ImportPreview> {
  return await invoke<ImportPreview>("import_preview", { filePath, format });
}

export async function importCollection(
  filePath: string,
  format: ImportFormat,
  targetDir: string,
): Promise<string> {
  return await invoke<string>("import_collection", { filePath, format, targetDir });
}

export async function exportCollection(
  collectionPath: string,
  format: ExportFormat,
): Promise<string> {
  return await invoke<string>("export_collection", { collectionPath, format });
}

// ── gRPC ──

export async function grpcLoadProto(connectionId: string, protoPath: string): Promise<import("@apiark/types").GrpcServiceInfo[]> {
  return await invoke<import("@apiark/types").GrpcServiceInfo[]>("grpc_load_proto", { connectionId, protoPath });
}

export async function grpcCallUnary(
  connectionId: string,
  address: string,
  serviceName: string,
  methodName: string,
  requestJson: string,
  metadata: import("@apiark/types").GrpcMetadataEntry[],
): Promise<import("@apiark/types").GrpcResponse> {
  try {
    return await invoke<import("@apiark/types").GrpcResponse>("grpc_call_unary", {
      connectionId, address, serviceName, methodName, requestJson, metadata,
    });
  } catch (err) {
    handleTauriError(err);
  }
}

export async function grpcDisconnect(address: string): Promise<void> {
  return await invoke<void>("grpc_disconnect", { address });
}

// ── API Docs ──

export async function generateDocs(
  collectionPath: string,
  format: import("@apiark/types").DocsFormat,
  outputPath?: string,
): Promise<string> {
  return await invoke<string>("generate_docs", {
    collectionPath,
    format,
    outputPath: outputPath ?? null,
  });
}

export async function previewDocs(collectionPath: string): Promise<string> {
  return await invoke<string>("preview_docs", { collectionPath });
}

// ── Monitors / Scheduler ──

export async function createMonitor(config: import("@apiark/types").MonitorConfig): Promise<import("@apiark/types").MonitorStatus> {
  return await invoke<import("@apiark/types").MonitorStatus>("create_monitor", { config });
}

export async function deleteMonitor(monitorId: string): Promise<void> {
  return await invoke<void>("delete_monitor", { monitorId });
}

export async function toggleMonitor(monitorId: string): Promise<import("@apiark/types").MonitorStatus> {
  return await invoke<import("@apiark/types").MonitorStatus>("toggle_monitor", { monitorId });
}

export async function listMonitors(): Promise<import("@apiark/types").MonitorStatus[]> {
  return await invoke<import("@apiark/types").MonitorStatus[]>("list_monitors", {});
}

export async function getMonitorResults(monitorId: string): Promise<import("@apiark/types").MonitorResult[]> {
  return await invoke<import("@apiark/types").MonitorResult[]>("get_monitor_results", { monitorId });
}

// ── Mock Server ──

export async function startMockServer(config: import("@apiark/types").MockServerConfig): Promise<import("@apiark/types").MockServerStatus> {
  try {
    return await invoke<import("@apiark/types").MockServerStatus>("start_mock_server", { config });
  } catch (err) {
    handleTauriError(err);
  }
}

export async function stopMockServer(serverId: string): Promise<void> {
  return await invoke<void>("stop_mock_server", { serverId });
}

export async function listMockServers(): Promise<import("@apiark/types").MockServerStatus[]> {
  return await invoke<import("@apiark/types").MockServerStatus[]>("list_mock_servers", {});
}

// ── Cookie Jar ──

export async function getCookieJar(collectionPath: string): Promise<import("@apiark/types").CookieJarEntry[]> {
  return await invoke<import("@apiark/types").CookieJarEntry[]>("get_cookie_jar", { collectionPath });
}

export async function deleteCookie(collectionPath: string, name: string, domain: string): Promise<void> {
  return await invoke<void>("delete_cookie", { collectionPath, name, domain });
}

export async function clearCookieJar(collectionPath: string): Promise<void> {
  return await invoke<void>("clear_cookie_jar", { collectionPath });
}

// ── Trash ──

export interface TrashItem {
  name: string;
  collectionName: string;
  trashPath: string;
  deletedAt: string;
  isFolder: boolean;
}

export async function listTrash(): Promise<TrashItem[]> {
  return await invoke<TrashItem[]>("list_trash", {});
}

export async function restoreFromTrash(trashPath: string, restoreTo: string): Promise<void> {
  return await invoke<void>("restore_from_trash", { trashPath, restoreTo });
}

export async function emptyTrash(): Promise<void> {
  return await invoke<void>("empty_trash", {});
}

// ── File Watcher ──

export async function watchCollection(collectionPath: string): Promise<void> {
  return await invoke<void>("watch_collection", { collectionPath });
}

export async function unwatchCollection(collectionPath: string): Promise<void> {
  return await invoke<void>("unwatch_collection", { collectionPath });
}

// ── Sample Collection ──

export async function createSampleCollection(): Promise<string> {
  return await invoke<string>("create_sample_collection", {});
}

// ── Settings ──

export async function getSettings(): Promise<AppSettings> {
  return await invoke<AppSettings>("get_settings", {});
}

export async function updateSettings(
  patch: Partial<AppSettings>,
): Promise<AppSettings> {
  return await invoke<AppSettings>("update_settings", { patch });
}
