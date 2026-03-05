// ── HTTP Methods & Body Types ──

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "HEAD"
  | "OPTIONS";

export type BodyType =
  | "json"
  | "xml"
  | "form-data"
  | "urlencoded"
  | "raw"
  | "binary"
  | "none";

// ── Key-Value Pair ──

export interface KeyValuePair {
  key: string;
  value: string;
  enabled: boolean;
}

// ── Request Body ──

export interface RequestBody {
  type: BodyType;
  content: string;
  formData: KeyValuePair[];
}

// ── Auth (discriminated union matching Rust's tagged enum) ──

export type OAuth2GrantType =
  | "authorization_code"
  | "client_credentials"
  | "implicit"
  | "password";

export type AuthConfig =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "basic"; username: string; password: string }
  | {
      type: "api-key";
      key: string;
      value: string;
      addTo: "header" | "query";
    }
  | {
      type: "oauth2";
      grantType: OAuth2GrantType;
      authUrl: string;
      tokenUrl: string;
      clientId: string;
      clientSecret: string;
      scope: string;
      callbackUrl: string;
      username: string;
      password: string;
      usePkce: boolean;
    }
  | { type: "digest"; username: string; password: string }
  | {
      type: "aws-v4";
      accessKey: string;
      secretKey: string;
      region: string;
      service: string;
      sessionToken: string;
    }
  | {
      type: "ntlm";
      username: string;
      password: string;
      domain: string;
      workstation: string;
    }
  | {
      type: "jwt-bearer";
      secret: string;
      algorithm: string;
      payload: string;
      headerPrefix: string;
    };

export interface OAuthTokenStatus {
  hasToken: boolean;
  isExpired: boolean;
  expiresAt: number | null;
  tokenType: string | null;
}

// ── Proxy ──

export interface ProxyConfig {
  url: string;
  username?: string;
  password?: string;
}

// ── Send Request Params (matches Rust SendRequestParams) ──

export interface SendRequestParams {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body?: RequestBody;
  auth?: AuthConfig;
  proxy?: ProxyConfig;
  timeoutMs?: number;
  followRedirects: boolean;
  verifySsl: boolean;
  cookies?: Record<string, string>;
  caCertPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  clientCertPassphrase?: string;
}

// ── Response (matches Rust ResponseData) ──

export interface CookieData {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: KeyValuePair[];
  cookies: CookieData[];
  body: string;
  timeMs: number;
  sizeBytes: number;
  truncated?: boolean;
  fullSize?: number;
  tempPath?: string;
}

// ── Error (matches Rust HttpError) ──

export interface HttpError {
  errorType: string;
  message: string;
  suggestion?: string;
}

// ── Collection Tree (matches Rust CollectionNode) ──

export type CollectionNode =
  | {
      type: "collection";
      name: string;
      path: string;
      children: CollectionNode[];
    }
  | {
      type: "folder";
      name: string;
      path: string;
      children: CollectionNode[];
    }
  | {
      type: "request";
      name: string;
      method: HttpMethod;
      path: string;
    };

// ── Collection Defaults ──

export interface CollectionDefaults {
  auth?: AuthConfig;
  sendCookies: boolean;
  storeCookies: boolean;
  persistCookies: boolean;
}

// ── Migration ──

export interface VersionStatus {
  collectionVersion: number;
  currentVersion: number;
  needsMigration: boolean;
  isNewer: boolean;
}

// ── Scripting & Testing ──

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ConsoleEntry {
  level: string;
  message: string;
}

export interface AssertionResult {
  path: string;
  operator: string;
  expected: unknown;
  actual: unknown;
  passed: boolean;
}

export interface ScriptedResponseData extends ResponseData {
  testResults: TestResult[];
  assertionResults: AssertionResult[];
  consoleOutput: ConsoleEntry[];
  envMutations: Record<string, string | null>;
}

// ── Request File (on-disk YAML format from Rust) ──

export interface RequestFile {
  name: string;
  method: HttpMethod;
  url: string;
  description?: string;
  headers: Record<string, string>;
  auth?: AuthConfig;
  body?: { type: string; content: string };
  params?: Record<string, string>;
  preRequestScript?: string;
  postResponseScript?: string;
  tests?: string;
  assert?: unknown;
  cookies?: Record<string, string>;
}

// ── Environment ──

export interface EnvironmentData {
  name: string;
  variables: Record<string, string>;
  secrets: string[];
}

// ── History Entry (matches Rust HistoryEntry) ──

export interface HistoryEntry {
  id: number;
  method: string;
  url: string;
  status?: number;
  statusText?: string;
  timeMs?: number;
  sizeBytes?: number;
  timestamp: string;
  collectionPath?: string;
  requestName?: string;
  requestJson: string;
}

// ── Parsed cURL ──

export interface ParsedCurlRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  bodyType: string | null;
  authBasic: [string, string] | null;
  verifySsl: boolean;
  followRedirects: boolean;
}

// ── Settings ──

export interface AppSettings {
  theme: "dark" | "light" | "black" | "system";
  accentColor: "indigo" | "blue" | "emerald" | "amber" | "rose" | "violet" | "cyan" | "orange";
  proxyUrl: string | null;
  proxyUsername: string | null;
  proxyPassword: string | null;
  verifySsl: boolean;
  followRedirects: boolean;
  timeoutMs: number;
  sidebarWidth: number;
  onboardingComplete: boolean;
  crashReportsEnabled: boolean | null;
  caCertPath: string | null;
  clientCertPath: string | null;
  clientKeyPath: string | null;
  clientCertPassphrase: string | null;
  updateChannel: "stable" | "beta" | "nightly";
  aiEndpoint: string | null;
  aiApiKey: string | null;
  aiModel: string | null;
}

// ── Tab Protocol ──

export type TabProtocol = "http" | "graphql" | "websocket" | "sse" | "grpc" | "mqtt" | "socketio";

export interface GraphQLState {
  query: string;
  variables: string;
  operationName: string;
  schemaJson: string | null;
}

// ── WebSocket ──

export interface WsConnectParams {
  url: string;
  headers: KeyValuePair[];
  protocols: string[];
}

export interface WsMessage {
  connectionId: string;
  direction: "sent" | "received";
  content: string;
  messageType: "text" | "binary";
  timestamp: string;
  sizeBytes: number;
}

export interface WsStatus {
  connectionId: string;
  state: "connecting" | "connected" | "disconnected";
  error?: string;
}

// ── SSE ──

export interface SseConnectParams {
  url: string;
  headers: KeyValuePair[];
}

export interface SseEvent {
  connectionId: string;
  eventType: string;
  data: string;
  id?: string;
  timestamp: string;
}

export interface SseStatus {
  connectionId: string;
  state: "connecting" | "connected" | "disconnected";
  error?: string;
}

// ── Collection Runner ──

export interface RunConfig {
  collectionPath: string;
  folderPath?: string;
  environmentName?: string;
  delayMs: number;
  iterations: number;
  dataFile?: string;
  stopOnError: boolean;
}

export interface RequestRunResult {
  name: string;
  method: string;
  url: string;
  status?: number;
  timeMs?: number;
  passed: boolean;
  testCount: number;
  testPassed: number;
  assertionCount: number;
  assertionPassed: number;
  error?: string;
}

export interface IterationResult {
  iteration: number;
  results: RequestRunResult[];
}

export interface RunSummary {
  totalRequests: number;
  totalPassed: number;
  totalFailed: number;
  totalTimeMs: number;
  iterations: IterationResult[];
}

export interface RunProgress {
  runId: string;
  iteration: number;
  requestIndex: number;
  totalRequests: number;
  result: RequestRunResult;
}

// ── Import/Export ──

export interface ImportPreview {
  collectionName: string;
  requestCount: number;
  folderCount: number;
  environmentCount: number;
  warnings: ImportWarning[];
}

export interface ImportWarning {
  itemName: string;
  message: string;
}

export type ImportFormat = "postman" | "insomnia" | "bruno" | "openapi" | "hoppscotch" | "har";
export type ExportFormat = "postman" | "openapi" | "apiark";

// ── gRPC ──

export interface GrpcServiceInfo {
  name: string;
  fullName: string;
  methods: GrpcMethodInfo[];
}

export interface GrpcMethodInfo {
  name: string;
  fullName: string;
  inputType: string;
  outputType: string;
  callType: "unary" | "serverStreaming" | "clientStreaming" | "bidiStreaming";
}

export interface GrpcResponse {
  statusCode: number;
  statusMessage: string;
  body: string;
  timeMs: number;
  metadata: GrpcMetadataEntry[];
}

export interface GrpcMetadataEntry {
  key: string;
  value: string;
}

export interface GrpcState {
  services: GrpcServiceInfo[];
  selectedService: string | null;
  selectedMethod: string | null;
  requestJson: string;
  metadata: KeyValuePair[];
  response: GrpcResponse | null;
  loading: boolean;
  error: string | null;
}

// ── API Docs ──

export type DocsFormat = "html" | "markdown";

// ── Monitor / Scheduler ──

export interface MonitorConfig {
  name: string;
  collectionPath: string;
  folderPath?: string;
  environmentName?: string;
  cronExpression: string;
  notifyOnFailure: boolean;
  webhookUrl?: string;
}

export interface MonitorStatus {
  id: string;
  name: string;
  collectionPath: string;
  cronExpression: string;
  enabled: boolean;
  lastRun?: string;
  lastStatus?: string;
  runCount: number;
}

export interface MonitorResult {
  id: number;
  monitorId: string;
  timestamp: string;
  totalRequests: number;
  totalPassed: number;
  totalFailed: number;
  totalTimeMs: number;
  status: string;
  error?: string;
}

// ── Mock Server ──

export interface MockServerConfig {
  collectionPath: string;
  port: number;
  latencyMs: number;
  errorRate: number;
}

export interface MockEndpoint {
  method: string;
  path: string;
  status: number;
  body: string;
  contentType: string;
}

export interface MockServerStatus {
  id: string;
  collectionName: string;
  port: number;
  endpoints: MockEndpoint[];
  running: boolean;
}

export interface MockRequestLog {
  method: string;
  path: string;
  status: number;
  timeMs: number;
  timestamp: string;
}

// ── Cookie Jar ──

export interface CookieJarEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
}

// ── File Watcher ──

export interface FileChangeEvent {
  path: string;
  changeType: "created" | "modified" | "deleted" | "renamed";
  collectionPath: string;
}

// ── Persisted State ──

export interface PersistedTab {
  filePath: string;
  collectionPath: string;
}

export interface WindowState {
  x: number;
  y: number;
  width: number;
  height: number;
  maximized: boolean;
}

export interface PersistedState {
  tabs: PersistedTab[];
  activeTabIndex: number | null;
  windowState?: WindowState;
}

// ── Tab ──

export interface Tab {
  id: string;
  name: string;
  filePath: string | null;
  collectionPath: string | null;
  isDirty: boolean;
  protocol: TabProtocol;

  // GraphQL state (when protocol === "graphql")
  graphql: GraphQLState | null;

  // gRPC state (when protocol === "grpc")
  grpc: GrpcState | null;

  // Request state
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;

  // Script state
  preRequestScript: string | null;
  postResponseScript: string | null;
  testScript: string | null;
  assertions: string | null;

  // Response state
  response: ResponseData | null;
  error: HttpError | null;
  loading: boolean;

  // Script results (populated after send)
  testResults: TestResult[];
  assertionResults: AssertionResult[];
  consoleOutput: ConsoleEntry[];

  // File watcher conflict state
  conflictState: "external-change" | "deleted" | "merge-conflict" | null;

  // Undo/redo stacks (internal, not persisted)
  undoStack: TabSnapshot[];
  redoStack: TabSnapshot[];
}

/** Subset of Tab fields that we snapshot for undo/redo */
export interface TabSnapshot {
  method: HttpMethod;
  url: string;
  headers: KeyValuePair[];
  params: KeyValuePair[];
  body: RequestBody;
  auth: AuthConfig;
  preRequestScript: string | null;
  postResponseScript: string | null;
  testScript: string | null;
  assertions: string | null;
}
