import { create } from "zustand";
import type {
  HttpMethod,
  KeyValuePair,
  RequestBody,
  AuthConfig,
  HttpError,
  ResponseData,
  Tab,
  TabProtocol,
  TabSnapshot,
  RequestFile,
  GraphQLState,
  GrpcState,
} from "@apiark/types";
import {
  sendRequest,
  sendRequestWithScripts,
  readRequestFile,
  saveRequestFile,
  loadPersistedState,
  savePersistedState,
} from "@/lib/tauri-api";
import { useEnvironmentStore } from "./environment-store";
import { useSettingsStore } from "./settings-store";
import { useConsoleStore } from "./console-store";

interface TabState {
  tabs: Tab[];
  activeTabId: string | null;
  autoSaveError: string | null;

  // Tab management
  newTab: () => void;
  openTab: (filePath: string, collectionPath: string) => Promise<void>;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  closeAllTabs: () => void;
  setActiveTab: (id: string) => void;
  reorderTabs: (fromIndex: number, toIndex: number) => void;

  // Protocol-specific tab creation
  newGraphQLTab: () => void;
  newWebSocketTab: () => void;
  newSSETab: () => void;
  newGrpcTab: () => void;
  newMqttTab: () => void;
  newSocketIoTab: () => void;

  // GraphQL mutations
  setGraphQLQuery: (query: string) => void;
  setGraphQLVariables: (variables: string) => void;
  setGraphQLOperationName: (operationName: string) => void;
  setGraphQLSchema: (schema: string | null) => void;

  // Active tab request mutations
  setMethod: (method: HttpMethod) => void;
  setUrl: (url: string) => void;
  setHeaders: (headers: KeyValuePair[]) => void;
  setParams: (params: KeyValuePair[]) => void;
  setBody: (body: RequestBody) => void;
  setAuth: (auth: AuthConfig) => void;
  setPathVariables: (pathVariables: Record<string, string>) => void;
  setPreRequestScript: (script: string | null) => void;
  setPostResponseScript: (script: string | null) => void;
  setTestScript: (script: string | null) => void;
  setAssertions: (assertions: string | null) => void;

  // Actions
  send: () => Promise<void>;
  save: () => Promise<void>;
  autoSave: () => Promise<void>;
  clearAutoSaveError: () => void;
  clearResponse: () => void;
  updateResponse: (tabId: string, updates: Partial<ResponseData>) => void;
  hasUnsavedNewTabs: () => boolean;

  // Undo/Redo
  undoTab: () => void;
  redoTab: () => void;

  // Conflict resolution
  handleExternalChange: (filePath: string, changeType: "modified" | "deleted") => void;
  reloadFromDisk: (tabId: string) => Promise<void>;
  dismissConflict: (tabId: string) => void;

  // Pin & duplicate
  togglePin: (id: string) => void;
  duplicateTab: (id: string) => void;

  // Detach tab to new window
  detachTab: (id: string) => Promise<void>;

  // Persistence
  persistTabs: () => void;
  restoreTabs: () => Promise<void>;
}

let tabCounter = 0;
function generateTabId(): string {
  return `tab_${Date.now()}_${++tabCounter}`;
}

/**
 * Parse query params from a URL string into KeyValuePair[].
 * Returns { baseUrl, params } where baseUrl has no query string.
 */
function parseUrlParams(url: string): { baseUrl: string; params: KeyValuePair[] } {
  const qIndex = url.indexOf("?");
  if (qIndex === -1) return { baseUrl: url, params: [] };

  const baseUrl = url.slice(0, qIndex);
  const queryString = url.slice(qIndex + 1);
  const params: KeyValuePair[] = [];

  if (queryString) {
    for (const part of queryString.split("&")) {
      const eqIndex = part.indexOf("=");
      const key = eqIndex === -1 ? part : part.slice(0, eqIndex);
      const value = eqIndex === -1 ? "" : part.slice(eqIndex + 1);
      params.push({ id: kvId(), key: decodeURIComponent(key), value: decodeURIComponent(value), enabled: true });
    }
  }

  return { baseUrl, params };
}

/**
 * Build a URL query string from KeyValuePair[], appending to a base URL.
 */
function buildUrlWithParams(baseUrl: string, params: KeyValuePair[]): string {
  const enabledParams = params.filter((p) => p.enabled && p.key.trim());
  if (enabledParams.length === 0) return baseUrl;
  const qs = enabledParams
    .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
    .join("&");
  return `${baseUrl}?${qs}`;
}

/**
 * Tracks file paths that were recently saved by us (save/autoSave).
 * The file watcher checks this set to avoid reloading tabs that we just wrote.
 */
const recentlySavedPaths = new Set<string>();
const RECENTLY_SAVED_TTL = 2000; // ms — ignore watcher events for this long after save

function markRecentlySaved(filePath: string) {
  recentlySavedPaths.add(filePath);
  setTimeout(() => recentlySavedPaths.delete(filePath), RECENTLY_SAVED_TTL);
}

export function wasRecentlySaved(filePath: string): boolean {
  return recentlySavedPaths.has(filePath);
}

/**
 * Tracks whether the window is currently maximized.
 * Updated via a Tauri event listener so it's always available synchronously
 * (needed because persistTabs runs during beforeunload where async won't complete).
 */
let cachedMaximized = false;

// Store the last known "normal" (non-maximized) window geometry
let normalWindowGeometry = { x: 100, y: 100, width: 1280, height: 800 };

/**
 * Detect maximized by comparing window size to screen.availWidth/Height.
 * Tauri's isMaximized() is unreliable on some Linux WMs.
 */
function detectMaximized(): boolean {
  const threshold = 100; // px tolerance for taskbars/panels
  return (
    window.outerWidth >= screen.availWidth - threshold &&
    window.outerHeight >= screen.availHeight - threshold
  );
}

export function initWindowStateTracker() {
  // no-op — tracking is now module-level
}

// Module-level: runs as soon as this file is imported
if (typeof window !== "undefined") {
  // Track normal geometry on resize (only when not maximized)
  window.addEventListener("resize", () => {
    cachedMaximized = detectMaximized();
    if (!cachedMaximized) {
      normalWindowGeometry = {
        x: window.screenX,
        y: window.screenY,
        width: window.outerWidth,
        height: window.outerHeight,
      };
    }
  });

  // Persist window state periodically so it survives hard kills (Ctrl+C)
  setInterval(() => {
    cachedMaximized = detectMaximized();
    useTabStore.getState().persistTabs();
  }, 5000);
}

let kvCounter = 0;
const kvId = () => `kv_${Date.now()}_${++kvCounter}`;
const emptyKvRow = (): KeyValuePair => ({ id: kvId(), key: "", value: "", enabled: true });

function createEmptyTab(overrides?: Partial<Tab>): Tab {
  return {
    id: generateTabId(),
    name: "Untitled Request",
    filePath: null,
    collectionPath: null,
    isDirty: false,
    protocol: "http",
    graphql: null,
    grpc: null,
    method: "GET",
    url: "",
    headers: [emptyKvRow()],
    params: [emptyKvRow()],
    pathVariables: {},
    body: { type: "none", content: "", formData: [] },
    auth: { type: "none" },
    preRequestScript: null,
    postResponseScript: null,
    testScript: null,
    assertions: null,
    response: null,
    error: null,
    loading: false,
    testResults: [],
    assertionResults: [],
    consoleOutput: [],
    conflictState: null,
    pinned: false,
    undoStack: [],
    redoStack: [],
    ...overrides,
  };
}

const MAX_UNDO_DEPTH = 100;

function takeSnapshot(tab: Tab): TabSnapshot {
  return {
    method: tab.method,
    url: tab.url,
    headers: JSON.parse(JSON.stringify(tab.headers)),
    params: JSON.parse(JSON.stringify(tab.params)),
    pathVariables: { ...tab.pathVariables },
    body: JSON.parse(JSON.stringify(tab.body)),
    auth: JSON.parse(JSON.stringify(tab.auth)),
    preRequestScript: tab.preRequestScript,
    postResponseScript: tab.postResponseScript,
    testScript: tab.testScript,
    assertions: tab.assertions,
  };
}

function requestFileToTab(
  file: RequestFile,
  filePath: string,
  collectionPath: string,
): Tab {
  // Convert Record<string, string> headers to KeyValuePair[]
  const headers: KeyValuePair[] = Object.entries(file.headers || {}).map(
    ([key, value]) => ({ id: kvId(), key, value, enabled: true }),
  );
  if (headers.length === 0) headers.push(emptyKvRow());

  // Separate path variables from query params.
  // Path variables match :paramName placeholders in the URL.
  const urlPathVarNames = new Set(
    (file.url.match(/:([\w]+)/g) || []).map((m) => m.slice(1)),
  );
  const pathVariables: Record<string, string> = {};
  const fileQueryParams: KeyValuePair[] = [];
  for (const [key, value] of Object.entries(file.params || {})) {
    if (urlPathVarNames.has(key)) {
      pathVariables[key] = value;
    } else {
      fileQueryParams.push({ id: kvId(), key, value, enabled: true });
    }
  }

  const { params: urlParams } = parseUrlParams(file.url);
  // Combine: URL query params first, then remaining file params (avoiding duplicates)
  const seenKeys = new Set(urlParams.map((p) => p.key));
  const mergedParams = [
    ...urlParams,
    ...fileQueryParams.filter((p) => !seenKeys.has(p.key)),
  ];
  const params = mergedParams.length > 0 ? [...mergedParams, emptyKvRow()] : [emptyKvRow()];

  // Convert body
  const body: RequestBody = file.body
    ? {
        type: file.body.type as RequestBody["type"],
        content: file.body.content || "",
        formData: [],
      }
    : { type: "none", content: "", formData: [] };

  // Convert assert to YAML string for the editor
  let assertionsStr: string | null = null;
  if (file.assert) {
    // The assert field comes from Rust as a serde_yaml::Value serialized to JSON.
    // Convert it back to a simple YAML-like string for editing.
    try {
      if (typeof file.assert === "object" && file.assert !== null) {
        assertionsStr = Object.entries(file.assert as Record<string, unknown>)
          .map(([k, v]) => {
            if (typeof v === "object" && v !== null) {
              return `${k}:\n` + Object.entries(v as Record<string, unknown>)
                .map(([ok, ov]) => `  ${ok}: ${JSON.stringify(ov)}`)
                .join("\n");
            }
            return `${k}: ${JSON.stringify(v)}`;
          })
          .join("\n");
      } else if (typeof file.assert === "string") {
        assertionsStr = file.assert;
      }
    } catch {
      // If conversion fails, just stringify
      assertionsStr = JSON.stringify(file.assert);
    }
  }

  // Detect GraphQL: explicit protocol field or JSON body with a "query" field
  const isGraphQL = file.protocol === "graphql" || (
    file.body?.type === "json" && file.body.content &&
    (() => { try { return "query" in JSON.parse(file.body!.content!); } catch { return false; } })()
  );
  const graphqlState: GraphQLState | null = isGraphQL
    ? (() => {
        try {
          const parsed = JSON.parse(file.body!.content!);
          return {
            query: parsed.query || "",
            variables: parsed.variables ? JSON.stringify(parsed.variables, null, 2) : "{}",
            operationName: parsed.operationName || "",
            schemaJson: null,
          };
        } catch { return { query: "", variables: "{}", operationName: "", schemaJson: null }; }
      })()
    : null;

  // Determine protocol from explicit field or heuristic
  const protocol: TabProtocol = file.protocol === "websocket" ? "websocket"
    : file.protocol === "sse" ? "sse"
    : file.protocol === "grpc" ? "grpc"
    : isGraphQL ? "graphql"
    : "http";

  // Initialize gRPC state if needed
  const grpcState: GrpcState | null = protocol === "grpc" ? {
    services: [],
    selectedService: null,
    selectedMethod: null,
    requestJson: "{}",
    metadata: [emptyKvRow()],
    loading: false,
    response: null,
    error: null,
  } : null;

  return {
    id: generateTabId(),
    name: file.name,
    filePath,
    collectionPath,
    isDirty: false,
    protocol,
    graphql: graphqlState,
    grpc: grpcState,
    method: file.method,
    url: file.url,
    headers,
    params,
    pathVariables,
    body,
    auth: file.auth || { type: "none" },
    preRequestScript: file.preRequestScript ?? null,
    postResponseScript: file.postResponseScript ?? null,
    testScript: file.tests ?? null,
    assertions: assertionsStr,
    response: null,
    error: null,
    loading: false,
    testResults: [],
    assertionResults: [],
    consoleOutput: [],
    conflictState: null,
    pinned: false,
    undoStack: [],
    redoStack: [],
  };
}

function tabToRequestFile(tab: Tab): RequestFile {
  // Convert KeyValuePair[] to Record<string, string> (only enabled, non-empty)
  const headers: Record<string, string> = {};
  for (const h of tab.headers) {
    if (h.key.trim() && h.enabled) {
      headers[h.key] = h.value;
    }
  }

  // Save path variables to the params field
  const params: Record<string, string> | undefined =
    Object.keys(tab.pathVariables).length > 0 ? { ...tab.pathVariables } : undefined;

  // For GraphQL tabs, serialize the query/variables into a JSON body
  // so it's detected as GraphQL when loaded back (requestFileToTab checks for body.content with "query")
  let body: { type: string; content: string } | undefined;
  if (tab.protocol === "graphql" && tab.graphql) {
    const gqlBody: Record<string, unknown> = { query: tab.graphql.query };
    try {
      const vars = JSON.parse(tab.graphql.variables);
      if (Object.keys(vars).length > 0) gqlBody.variables = vars;
    } catch { /* ignore invalid JSON */ }
    if (tab.graphql.operationName) gqlBody.operationName = tab.graphql.operationName;
    body = { type: "json", content: JSON.stringify(gqlBody, null, 2) };
    // Ensure Content-Type header is set
    if (!headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }
  } else if (tab.body.type !== "none") {
    body = { type: tab.body.type, content: tab.body.content };
  }

  return {
    name: tab.name,
    method: tab.protocol === "graphql" ? "POST" : tab.method,
    url: tab.url, // URL already contains query params (synced)
    protocol: tab.protocol !== "http" ? tab.protocol : undefined,
    headers,
    params,
    auth: tab.auth.type !== "none" ? tab.auth : undefined,
    body,
    preRequestScript: tab.preRequestScript || undefined,
    postResponseScript: tab.postResponseScript || undefined,
    tests: tab.testScript || undefined,
  };
}

function updateActiveTab(
  state: TabState,
  updater: (tab: Tab) => Partial<Tab>,
): Partial<TabState> {
  if (!state.activeTabId) return {};
  return {
    tabs: state.tabs.map((t) => {
      if (t.id !== state.activeTabId) return t;
      const snapshot = takeSnapshot(t);
      const changes = updater(t);
      return {
        ...t,
        ...changes,
        isDirty: true,
        undoStack: [...t.undoStack.slice(-MAX_UNDO_DEPTH + 1), snapshot],
        redoStack: [], // Clear redo on new change
      };
    }),
  };
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  autoSaveError: null,

  newTab: () => {
    const tab = createEmptyTab();
    set((state) => ({
      tabs: [...state.tabs, tab],
      activeTabId: tab.id,
    }));
  },

  newGraphQLTab: () => {
    const tab = createEmptyTab({
      name: "Untitled GraphQL",
      protocol: "graphql",
      method: "POST",
      graphql: { query: "", variables: "{}", operationName: "", schemaJson: null },
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  newWebSocketTab: () => {
    const tab = createEmptyTab({
      name: "Untitled WebSocket",
      protocol: "websocket",
      method: "GET",
      url: "ws://localhost:8080",
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  newSSETab: () => {
    const tab = createEmptyTab({
      name: "Untitled SSE",
      protocol: "sse",
      method: "GET",
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  newGrpcTab: () => {
    const tab = createEmptyTab({
      name: "Untitled gRPC",
      protocol: "grpc",
      url: "http://localhost:50051",
      grpc: {
        services: [],
        selectedService: null,
        selectedMethod: null,
        requestJson: "{}",
        metadata: [emptyKvRow()],
        response: null,
        loading: false,
        error: null,
      },
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  newMqttTab: () => {
    const tab = createEmptyTab({
      name: "Untitled MQTT",
      protocol: "mqtt",
      url: "localhost",
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  newSocketIoTab: () => {
    const tab = createEmptyTab({
      name: "Untitled Socket.IO",
      protocol: "socketio",
      url: "http://localhost:3000",
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },

  openTab: async (filePath, collectionPath) => {
    // Check if already open
    const existing = get().tabs.find((t) => t.filePath === filePath);
    if (existing) {
      set({ activeTabId: existing.id });
      return;
    }

    try {
      const file = await readRequestFile(filePath);
      const tab = requestFileToTab(file, filePath, collectionPath);
      set((state) => ({
        tabs: [...state.tabs, tab],
        activeTabId: tab.id,
      }));
    } catch (err) {
      const errStr = String((err as { message?: string })?.message ?? err);
      if (errStr.includes("MERGE_CONFLICT:")) {
        // Open a blank tab with merge-conflict state
        const tab = createEmptyTab({
          name: filePath.split("/").pop()?.replace(".yaml", "") ?? "Conflict",
          filePath,
          collectionPath,
          conflictState: "merge-conflict",
        });
        set((state) => ({
          tabs: [...state.tabs, tab],
          activeTabId: tab.id,
        }));
      } else {
        const { useToastStore } = await import("@/stores/toast-store");
        useToastStore.getState().showError(`Failed to open request: ${String((err as { message?: string })?.message ?? err)}`);
      }
    }
  },

  closeTab: (id) => {
    set((state) => {
      const idx = state.tabs.findIndex((t) => t.id === id);
      const newTabs = state.tabs.filter((t) => t.id !== id);
      let newActive = state.activeTabId;
      if (state.activeTabId === id) {
        if (newTabs.length === 0) {
          newActive = null;
        } else if (idx >= newTabs.length) {
          newActive = newTabs[newTabs.length - 1].id;
        } else {
          newActive = newTabs[idx].id;
        }
      }
      return { tabs: newTabs, activeTabId: newActive };
    });
  },

  closeOtherTabs: (id) => {
    set((state) => ({
      tabs: state.tabs.filter((t) => t.id === id),
      activeTabId: id,
    }));
  },

  closeAllTabs: () => {
    set({ tabs: [], activeTabId: null });
  },

  setActiveTab: (id) => {
    set({ activeTabId: id });
  },

  reorderTabs: (fromIndex, toIndex) => {
    set((state) => {
      const newTabs = [...state.tabs];
      const [moved] = newTabs.splice(fromIndex, 1);
      newTabs.splice(toIndex, 0, moved);
      return { tabs: newTabs };
    });
  },

  togglePin: (id) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, pinned: !t.pinned } : t,
      ),
    }));
  },

  duplicateTab: (id) => {
    set((state) => {
      const source = state.tabs.find((t) => t.id === id);
      if (!source) return state;
      const newId = crypto.randomUUID();
      const dup: Tab = {
        ...source,
        id: newId,
        name: `${source.name} (copy)`,
        filePath: null, // duplicated tab is unsaved
        isDirty: true,
        pinned: false,
        response: null,
        error: null,
        loading: false,
        testResults: [],
        assertionResults: [],
        consoleOutput: [],
        conflictState: null,
        undoStack: [],
        redoStack: [],
      };
      const idx = state.tabs.findIndex((t) => t.id === id);
      const newTabs = [...state.tabs];
      newTabs.splice(idx + 1, 0, dup);
      return { tabs: newTabs, activeTabId: newId };
    });
  },

  // Request mutations (apply to active tab)
  setMethod: (method) => set((state) => updateActiveTab(state, () => ({ method }))),
  setUrl: (url) => set((state) => updateActiveTab(state, (tab) => {
    // Sync: extract query params from URL into the params table
    const { params: urlParams } = parseUrlParams(url);
    // Keep any empty trailing row for UX
    const emptyRow = tab.params.find((p) => !p.key.trim());
    const newParams = urlParams.length > 0
      ? [...urlParams, emptyRow || emptyKvRow()]
      : [emptyKvRow()];
    return { url, params: newParams };
  })),
  setHeaders: (headers) => set((state) => updateActiveTab(state, () => ({ headers }))),
  setParams: (params) => set((state) => updateActiveTab(state, (tab) => {
    // Sync: rebuild URL query string from params
    const baseUrl = tab.url.split("?")[0];
    const newUrl = buildUrlWithParams(baseUrl, params);
    return { params, url: newUrl };
  })),
  setPathVariables: (pathVariables) => set((state) => updateActiveTab(state, () => ({ pathVariables }))),
  setBody: (body) => set((state) => updateActiveTab(state, () => ({ body }))),
  setAuth: (auth) => set((state) => updateActiveTab(state, () => ({ auth }))),
  setPreRequestScript: (script) => set((state) => updateActiveTab(state, () => ({ preRequestScript: script }))),
  setPostResponseScript: (script) => set((state) => updateActiveTab(state, () => ({ postResponseScript: script }))),
  setTestScript: (script) => set((state) => updateActiveTab(state, () => ({ testScript: script }))),
  setAssertions: (assertions) => set((state) => updateActiveTab(state, () => ({ assertions }))),

  // GraphQL setters
  setGraphQLQuery: (query) => set((state) => updateActiveTab(state, (t) => ({
    graphql: t.graphql ? { ...t.graphql, query } : null,
  }))),
  setGraphQLVariables: (variables) => set((state) => updateActiveTab(state, (t) => ({
    graphql: t.graphql ? { ...t.graphql, variables } : null,
  }))),
  setGraphQLOperationName: (operationName) => set((state) => updateActiveTab(state, (t) => ({
    graphql: t.graphql ? { ...t.graphql, operationName } : null,
  }))),
  setGraphQLSchema: (schemaJson) => set((state) => updateActiveTab(state, (t) => ({
    graphql: t.graphql ? { ...t.graphql, schemaJson } : null,
  }))),

  send: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || !tab.url.trim()) return;

    // Mark loading
    set({
      tabs: tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, loading: true, error: null, response: null, testResults: [], assertionResults: [], consoleOutput: [] }
          : t,
      ),
    });

    // Get resolved variables from environment store
    const envStore = useEnvironmentStore.getState();
    const variables = await envStore.getResolvedVariables();

    // Get network settings
    const { settings } = useSettingsStore.getState();
    const proxy = settings.proxyUrl
      ? {
          url: settings.proxyUrl,
          username: settings.proxyUsername ?? undefined,
          password: settings.proxyPassword ?? undefined,
        }
      : undefined;

    // Build body — for GraphQL, construct from graphql state
    let body = tab.body.type !== "none" ? tab.body : undefined;
    let headers = tab.headers.filter((h) => h.key.trim() !== "" && h.enabled);
    if (tab.protocol === "graphql" && tab.graphql) {
      const gqlBody: Record<string, unknown> = { query: tab.graphql.query };
      try {
        const vars = JSON.parse(tab.graphql.variables);
        if (Object.keys(vars).length > 0) gqlBody.variables = vars;
      } catch { /* ignore invalid JSON */ }
      if (tab.graphql.operationName) gqlBody.operationName = tab.graphql.operationName;
      body = { type: "json", content: JSON.stringify(gqlBody), formData: [] };
      // Auto-add Content-Type if not present
      if (!headers.some((h) => h.key.toLowerCase() === "content-type")) {
        headers = [{ id: kvId(), key: "Content-Type", value: "application/json", enabled: true }, ...headers];
      }
    }

    // Resolve path variables (:paramName → value) in the URL before sending
    let resolvedUrl = tab.url.trim();
    for (const [key, value] of Object.entries(tab.pathVariables)) {
      if (value) {
        resolvedUrl = resolvedUrl.replace(new RegExp(`:${key}\\b`, "g"), encodeURIComponent(value));
      }
    }

    const requestParams = {
      method: tab.protocol === "graphql" ? ("POST" as const) : tab.method,
      url: resolvedUrl,
      headers,
      // Params are already synced into the URL query string, so send empty
      // to avoid the Rust side double-appending them
      params: [] as KeyValuePair[],
      body,
      auth: tab.auth.type !== "none" ? tab.auth : undefined,
      proxy,
      timeoutMs: settings.timeoutMs,
      followRedirects: settings.followRedirects,
      verifySsl: settings.verifySsl,
      caCertPath: settings.caCertPath ?? undefined,
      clientCertPath: settings.clientCertPath ?? undefined,
      clientKeyPath: settings.clientKeyPath ?? undefined,
      clientCertPassphrase: settings.clientCertPassphrase ?? undefined,
    };

    const hasScripts = tab.preRequestScript || tab.postResponseScript || tab.testScript || tab.assertions;

    try {
      if (hasScripts) {
        const scriptedResponse = await sendRequestWithScripts(
          requestParams,
          variables,
          tab.collectionPath ?? undefined,
          tab.name !== "Untitled Request" ? tab.name : undefined,
          tab.preRequestScript,
          tab.postResponseScript,
          tab.testScript,
          tab.assertions,
        );
        // Apply env mutations to the environment store
        if (scriptedResponse.envMutations && Object.keys(scriptedResponse.envMutations).length > 0) {
          envStore.applyMutations(scriptedResponse.envMutations);
        }
        set({
          tabs: get().tabs.map((t) =>
            t.id === activeTabId
              ? {
                  ...t,
                  response: {
                    status: scriptedResponse.status,
                    statusText: scriptedResponse.statusText,
                    headers: scriptedResponse.headers,
                    cookies: scriptedResponse.cookies,
                    body: scriptedResponse.body,
                    timeMs: scriptedResponse.timeMs,
                    sizeBytes: scriptedResponse.sizeBytes,
                  },
                  testResults: scriptedResponse.testResults,
                  assertionResults: scriptedResponse.assertionResults,
                  consoleOutput: scriptedResponse.consoleOutput,
                  loading: false,
                }
              : t,
          ),
        });

        // Push script console output to global console
        const consoleFn = useConsoleStore.getState().log;
        const reqLabel = tab.name || tab.url || "Request";
        consoleFn(reqLabel, `${scriptedResponse.status} ${scriptedResponse.statusText} (${scriptedResponse.timeMs}ms)`, "info");
        for (const entry of scriptedResponse.consoleOutput) {
          const level = entry.level === "error" ? "error" : entry.level === "warn" ? "warn" : "log";
          consoleFn(reqLabel, entry.message, level);
        }
      } else {
        const response = await sendRequest(
          requestParams,
          variables,
          tab.collectionPath ?? undefined,
          tab.name !== "Untitled Request" ? tab.name : undefined,
        );
        set({
          tabs: get().tabs.map((t) =>
            t.id === activeTabId ? { ...t, response, loading: false } : t,
          ),
        });
        const reqLabel = tab.name || tab.url || "Request";
        useConsoleStore.getState().log(reqLabel, `${response.status} ${response.statusText} (${response.timeMs}ms)`, "info");
      }
    } catch (err) {
      set({
        tabs: get().tabs.map((t) =>
          t.id === activeTabId
            ? { ...t, error: err as HttpError, loading: false }
            : t,
        ),
      });
      const reqLabel = tab.name || tab.url || "Request";
      const httpErr = err as HttpError;
      useConsoleStore.getState().log(reqLabel, httpErr?.message || String(err), "error");
    }
  },

  save: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || !tab.filePath) return;

    try {
      const requestFile = tabToRequestFile(tab);
      markRecentlySaved(tab.filePath);
      await saveRequestFile(tab.filePath, requestFile);
      set({
        tabs: get().tabs.map((t) =>
          t.id === activeTabId ? { ...t, isDirty: false } : t,
        ),
      });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to save request: ${String(err)}`)
      );
    }
  },

  autoSave: async () => {
    const { tabs, activeTabId } = get();
    const tab = tabs.find((t) => t.id === activeTabId);
    if (!tab || !tab.filePath || !tab.isDirty) return;

    try {
      const requestFile = tabToRequestFile(tab);
      markRecentlySaved(tab.filePath);
      await saveRequestFile(tab.filePath, requestFile);
      set({
        autoSaveError: null,
        tabs: get().tabs.map((t) =>
          t.id === activeTabId ? { ...t, isDirty: false } : t,
        ),
      });
    } catch (err) {
      set({ autoSaveError: String(err) });
    }
  },

  clearAutoSaveError: () => {
    set({ autoSaveError: null });
  },

  hasUnsavedNewTabs: () => {
    return get().tabs.some((t) => !t.filePath && (t.url.trim() || t.body.content.trim()));
  },

  clearResponse: () => {
    set((state) => updateActiveTab(state, () => ({ response: null, error: null })));
  },

  updateResponse: (tabId: string, updates: Partial<ResponseData>) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId && t.response
          ? { ...t, response: { ...t.response, ...updates } }
          : t
      ),
    }));
  },

  undoTab: () => {
    set((state) => {
      if (!state.activeTabId) return {};
      return {
        tabs: state.tabs.map((t) => {
          if (t.id !== state.activeTabId || t.undoStack.length === 0) return t;
          const snapshot = t.undoStack[t.undoStack.length - 1];
          const currentSnapshot = takeSnapshot(t);
          return {
            ...t,
            ...snapshot,
            undoStack: t.undoStack.slice(0, -1),
            redoStack: [...t.redoStack, currentSnapshot],
          };
        }),
      };
    });
  },

  redoTab: () => {
    set((state) => {
      if (!state.activeTabId) return {};
      return {
        tabs: state.tabs.map((t) => {
          if (t.id !== state.activeTabId || t.redoStack.length === 0) return t;
          const snapshot = t.redoStack[t.redoStack.length - 1];
          const currentSnapshot = takeSnapshot(t);
          return {
            ...t,
            ...snapshot,
            redoStack: t.redoStack.slice(0, -1),
            undoStack: [...t.undoStack, currentSnapshot],
          };
        }),
      };
    });
  },

  handleExternalChange: (filePath, changeType) => {
    set((state) => ({
      tabs: state.tabs.map((t) => {
        if (t.filePath !== filePath) return t;
        if (changeType === "deleted") {
          return { ...t, conflictState: "deleted" as const };
        }
        // Modified externally — if tab is dirty, show conflict; if clean, auto-reload
        if (t.isDirty) {
          return { ...t, conflictState: "external-change" as const };
        }
        // Clean tab: auto-reload will be handled by the caller
        return t;
      }),
    }));
  },

  reloadFromDisk: async (tabId) => {
    const tab = get().tabs.find((t) => t.id === tabId);
    if (!tab || !tab.filePath || !tab.collectionPath) return;
    try {
      const file = await readRequestFile(tab.filePath);
      const reloaded = requestFileToTab(file, tab.filePath, tab.collectionPath);
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? { ...reloaded, id: t.id, conflictState: null }
            : t,
        ),
      }));
    } catch {
      // File may no longer exist
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId ? { ...t, conflictState: "deleted" as const } : t,
        ),
      }));
    }
  },

  dismissConflict: (tabId) => {
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId ? { ...t, conflictState: null } : t,
      ),
    }));
  },

  detachTab: async (id) => {
    const tab = get().tabs.find((t) => t.id === id);
    if (!tab || !tab.filePath) return;

    try {
      const { openNewWindow } = await import("@/lib/tauri-api");
      await openNewWindow();
      // Close the tab in the current window — the new window will load its own state
      get().closeTab(id);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError("Failed to open new window. Please try again.")
      );
    }
  },

  persistTabs: () => {
    const { tabs, activeTabId } = get();
    // Only persist file-backed tabs (exclude ephemeral WS/SSE tabs), deduplicated
    const seen = new Set<string>();
    const persistedTabs = tabs
      .filter((t) => {
        if (!t.filePath || !t.collectionPath || t.protocol === "websocket" || t.protocol === "sse" || t.protocol === "grpc") return false;
        if (seen.has(t.filePath)) return false;
        seen.add(t.filePath);
        return true;
      })
      .map((t) => ({ filePath: t.filePath!, collectionPath: t.collectionPath! }));
    const activeIndex = tabs.findIndex((t) => t.id === activeTabId);

    // Capture window position/size — use normal (non-maximized) geometry
    // so restoring from maximized doesn't span multiple monitors
    const geo = cachedMaximized ? normalWindowGeometry : {
      x: window.screenX,
      y: window.screenY,
      width: window.outerWidth,
      height: window.outerHeight,
    };
    const windowState = {
      ...geo,
      maximized: cachedMaximized,
    };

    // Persist all opened collection paths (not just those with open tabs)
    import("@/stores/collection-store").then(({ useCollectionStore }) => {
      const collections = useCollectionStore.getState().collections
        .filter((c) => c.type === "collection")
        .map((c) => c.path);

      savePersistedState({
        tabs: persistedTabs,
        activeTabIndex: activeIndex >= 0 ? activeIndex : null,
        windowState,
        collections,
      }).catch(() => { /* Tab persistence failure is non-critical */ });
    }).catch(() => {
      // Fallback: save without collections if store not available
      savePersistedState({
        tabs: persistedTabs,
        activeTabIndex: activeIndex >= 0 ? activeIndex : null,
        windowState,
      }).catch(() => {});
    });
  },

  restoreTabs: async () => {
    try {
      const persisted = await loadPersistedState();

      const collectionPaths = new Set<string>();

      // Restore persisted collections first (even if no tabs are open)
      if (persisted.collections?.length) {
        for (const path of persisted.collections) {
          collectionPaths.add(path);
        }
      }

      if (persisted.tabs.length === 0) {
        // No tabs to restore, but still re-open collections
        if (collectionPaths.size > 0) {
          import("@/stores/collection-store").then(({ useCollectionStore }) => {
            for (const path of collectionPaths) {
              useCollectionStore.getState().openCollection(path).catch(() => {});
            }
          });
        }
        return;
      }
      const seenPaths = new Set<string>();

      for (const pt of persisted.tabs) {
        // Deduplicate — only restore one tab per file path
        if (seenPaths.has(pt.filePath)) continue;
        seenPaths.add(pt.filePath);

        try {
          const file = await readRequestFile(pt.filePath);
          const tab = requestFileToTab(file, pt.filePath, pt.collectionPath);
          set((state) => ({
            tabs: [...state.tabs, tab],
            activeTabId: state.activeTabId ?? tab.id,
          }));
          if (pt.collectionPath) collectionPaths.add(pt.collectionPath);
        } catch {
          // File may have been deleted, skip it
          // Still try to restore the collection sidebar
          if (pt.collectionPath) collectionPaths.add(pt.collectionPath);
        }
      }

      // Set active tab by index
      if (persisted.activeTabIndex != null) {
        const { tabs } = get();
        if (persisted.activeTabIndex < tabs.length) {
          set({ activeTabId: tabs[persisted.activeTabIndex].id });
        }
      }

      // Re-open collections in the sidebar (persisted collections were
      // already added above; this also includes any from open tabs).
      if (collectionPaths.size > 0) {
        import("@/stores/collection-store").then(({ useCollectionStore }) => {
          for (const path of collectionPaths) {
            useCollectionStore.getState().openCollection(path).catch(() => {});
          }
        });
      }
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showWarning("Some tabs could not be restored from your last session.")
      );
    }
  },
}));

// Selectors
export const useActiveTab = () => {
  return useTabStore((state) =>
    state.tabs.find((t) => t.id === state.activeTabId) ?? null
  );
};
