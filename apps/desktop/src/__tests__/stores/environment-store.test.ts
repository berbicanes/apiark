import { describe, it, expect, beforeEach, vi } from "vitest";
import { useEnvironmentStore } from "@/stores/environment-store";

// Mock the Tauri API
vi.mock("@/lib/tauri-api", () => ({
  loadEnvironments: vi.fn().mockResolvedValue([
    { name: "development", variables: { baseUrl: "http://localhost:3000", apiKey: "dev-key" }, secrets: [] },
    { name: "production", variables: { baseUrl: "https://api.prod.com" }, secrets: ["apiKey"] },
  ]),
  getResolvedVariables: vi.fn().mockResolvedValue({
    baseUrl: "http://localhost:3000",
    apiKey: "dev-key",
  }),
  loadRootDotenv: vi.fn().mockResolvedValue({}),
}));

describe("Environment Store", () => {
  beforeEach(() => {
    useEnvironmentStore.setState({
      environments: [],
      activeEnvironmentName: null,
      activeCollectionPath: null,
      runtimeOverrides: {},
    });
  });

  it("loads environments from collection", async () => {
    await useEnvironmentStore.getState().loadEnvironments("/test/collection");
    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(2);
    expect(state.environments[0].name).toBe("development");
    expect(state.environments[1].name).toBe("production");
    expect(state.activeCollectionPath).toBe("/test/collection");
  });

  it("auto-selects first environment", async () => {
    await useEnvironmentStore.getState().loadEnvironments("/test/collection");
    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("development");
  });

  it("sets active environment", async () => {
    await useEnvironmentStore.getState().loadEnvironments("/test/collection");
    useEnvironmentStore.getState().setActiveEnvironment("production");
    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("production");
  });

  it("applies runtime mutations", () => {
    useEnvironmentStore.getState().applyMutations({
      newVar: "newValue",
      deleteVar: null,
    });
    const overrides = useEnvironmentStore.getState().runtimeOverrides;
    expect(overrides.newVar).toBe("newValue");
  });

  it("clears environments and active states", async () => {
    await useEnvironmentStore.getState().loadEnvironments("/test/collection");
    expect(useEnvironmentStore.getState().environments).toHaveLength(2);

    useEnvironmentStore.getState().clear();
    const state = useEnvironmentStore.getState();
    expect(state.environments).toHaveLength(0);
    expect(state.activeEnvironmentName).toBeNull();
    expect(state.activeCollectionPath).toBeNull();
    expect(state.runtimeOverrides).toEqual({});
  });

  it("remembers last used environment per collection", async () => {
    // 1. Load collection A and set to production
    await useEnvironmentStore.getState().loadEnvironments("/test/collection-a");
    useEnvironmentStore.getState().setActiveEnvironment("production");
    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("production");

    // 2. Load collection B (defaults to development)
    await useEnvironmentStore.getState().loadEnvironments("/test/collection-b");
    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("development");

    // 3. Switch back to collection A (restores production)
    await useEnvironmentStore.getState().loadEnvironments("/test/collection-a");
    expect(useEnvironmentStore.getState().activeEnvironmentName).toBe("production");
  });
});
