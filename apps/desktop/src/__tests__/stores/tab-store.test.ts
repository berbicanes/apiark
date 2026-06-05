import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("@/lib/tauri-api", () => ({
  sendRequest: vi.fn().mockResolvedValue({}),
  sendRequestWithScripts: vi.fn().mockResolvedValue({}),
  readRequestFile: vi.fn().mockResolvedValue({}),
  saveRequestFile: vi.fn().mockResolvedValue(undefined),
  loadPersistedState: vi.fn().mockResolvedValue({ tabs: [], activeTabId: null }),
  savePersistedState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/stores/environment-store", () => ({
  useEnvironmentStore: { getState: () => ({ getResolvedVariables: vi.fn().mockResolvedValue({}) }) },
}));

vi.mock("@/stores/settings-store", () => ({
  useSettingsStore: { getState: () => ({ settings: {} }) },
}));

vi.mock("@/stores/console-store", () => ({
  useConsoleStore: { getState: () => ({ log: vi.fn() }) },
}));

vi.mock("@/stores/collection-store", () => ({
  useCollectionStore: {
    getState: () => ({
      collections: [],
      openCollection: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/stores/toast-store", () => ({
  useToastStore: {
    getState: () => ({ showWarning: vi.fn(), showError: vi.fn() }),
  },
}));

import { useTabStore } from "@/stores/tab-store";

describe("Tab Store", () => {
  beforeEach(() => {
    useTabStore.setState({
      tabs: [],
      activeTabId: null,
      hydrated: false,
    });
  });

  it("creates a new HTTP tab", () => {
    useTabStore.getState().newTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("http");
    expect(state.tabs[0].method).toBe("GET");
    expect(state.tabs[0].name).toBe("Untitled Request");
    expect(state.activeTabId).toBe(state.tabs[0].id);
  });

  it("creates a new WebSocket tab", () => {
    useTabStore.getState().newWebSocketTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("websocket");
    expect(state.tabs[0].name).toBe("Untitled WebSocket");
  });

  it("creates a new GraphQL tab", () => {
    useTabStore.getState().newGraphQLTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("graphql");
    expect(state.tabs[0].graphql).not.toBeNull();
  });

  it("creates a new gRPC tab", () => {
    useTabStore.getState().newGrpcTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("grpc");
    expect(state.tabs[0].grpc).not.toBeNull();
  });

  it("creates a new MQTT tab", () => {
    useTabStore.getState().newMqttTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("mqtt");
  });

  it("creates a new Socket.IO tab", () => {
    useTabStore.getState().newSocketIoTab();
    const state = useTabStore.getState();
    expect(state.tabs).toHaveLength(1);
    expect(state.tabs[0].protocol).toBe("socketio");
  });

  it("closes a tab", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().newTab();
    const firstId = useTabStore.getState().tabs[0].id;
    expect(useTabStore.getState().tabs).toHaveLength(2);

    useTabStore.getState().closeTab(firstId);
    expect(useTabStore.getState().tabs).toHaveLength(1);
    expect(useTabStore.getState().tabs[0].id).not.toBe(firstId);
  });

  it("sets active tab", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().newTab();
    const tabs = useTabStore.getState().tabs;

    useTabStore.getState().setActiveTab(tabs[0].id);
    expect(useTabStore.getState().activeTabId).toBe(tabs[0].id);

    useTabStore.getState().setActiveTab(tabs[1].id);
    expect(useTabStore.getState().activeTabId).toBe(tabs[1].id);
  });

  it("updates method on active tab", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().setMethod("POST");
    expect(useTabStore.getState().tabs[0].method).toBe("POST");
  });

  it("updates URL on active tab", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().setUrl("https://api.example.com/users");
    expect(useTabStore.getState().tabs[0].url).toBe("https://api.example.com/users");
  });

  it("marks tab as dirty after changes", () => {
    useTabStore.getState().newTab();
    expect(useTabStore.getState().tabs[0].isDirty).toBe(false);

    useTabStore.getState().setUrl("https://changed.com");
    expect(useTabStore.getState().tabs[0].isDirty).toBe(true);
  });

  it("supports undo/redo", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().setUrl("https://first.com");
    useTabStore.getState().setUrl("https://second.com");
    expect(useTabStore.getState().tabs[0].url).toBe("https://second.com");

    useTabStore.getState().undoTab();
    expect(useTabStore.getState().tabs[0].url).toBe("https://first.com");

    useTabStore.getState().redoTab();
    expect(useTabStore.getState().tabs[0].url).toBe("https://second.com");
  });

  it("toggles pin on tab", () => {
    useTabStore.getState().newTab();
    const tabId = useTabStore.getState().tabs[0].id;
    expect(useTabStore.getState().tabs[0].pinned).toBe(false);

    useTabStore.getState().togglePin(tabId);
    expect(useTabStore.getState().tabs[0].pinned).toBe(true);

    useTabStore.getState().togglePin(tabId);
    expect(useTabStore.getState().tabs[0].pinned).toBe(false);
  });

  it("duplicates a tab", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().setUrl("https://dup.test");
    const tabId = useTabStore.getState().tabs[0].id;

    useTabStore.getState().duplicateTab(tabId);
    const tabs = useTabStore.getState().tabs;
    expect(tabs).toHaveLength(2);
    expect(tabs[1].url).toBe("https://dup.test");
    expect(tabs[1].id).not.toBe(tabs[0].id);
  });

  it("closes other tabs", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().newTab();
    useTabStore.getState().newTab();
    const keepId = useTabStore.getState().tabs[1].id;

    useTabStore.getState().closeOtherTabs(keepId);
    const tabs = useTabStore.getState().tabs;
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).toBe(keepId);
  });

  it("closes all tabs", () => {
    useTabStore.getState().newTab();
    useTabStore.getState().newTab();

    useTabStore.getState().closeAllTabs();
    expect(useTabStore.getState().tabs).toHaveLength(0);
    expect(useTabStore.getState().activeTabId).toBeNull();
  });

  it("does not persist before hydration, so an early startup persist cannot wipe collections", async () => {
    const api = await import("@/lib/tauri-api");
    vi.mocked(api.savePersistedState).mockClear();

    // Startup: store not yet hydrated (restoreTabs hasn't loaded collections).
    useTabStore.setState({ tabs: [], activeTabId: null, hydrated: false });

    // The debounced persist effect fires before restore finishes...
    useTabStore.getState().persistTabs();
    // Flush the dynamic import + microtasks persistTabs would use to save.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // ...and must write nothing, otherwise it overwrites collections with [].
    expect(api.savePersistedState).not.toHaveBeenCalled();
  });

  it("marks the store hydrated after restoreTabs completes", async () => {
    const api = await import("@/lib/tauri-api");
    vi.mocked(api.loadPersistedState).mockResolvedValue({
      tabs: [],
      activeTabIndex: null,
      collections: ["/col"],
    } as never);

    expect(useTabStore.getState().hydrated).toBe(false);
    await useTabStore.getState().restoreTabs();
    expect(useTabStore.getState().hydrated).toBe(true);
  });
});
