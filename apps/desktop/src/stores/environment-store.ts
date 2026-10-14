import { create } from "zustand";
import type { EnvironmentData } from "@apiark/types";
import {
  loadEnvironments as loadEnvironmentsApi,
  getResolvedVariables as getResolvedVariablesApi,
  loadRootDotenv,
} from "@/lib/tauri-api";

interface EnvironmentState {
  environments: EnvironmentData[];
  activeEnvironmentName: string | null;
  activeCollectionPath: string | null;
  /** Remember last selected environment per collection */
  lastUsedEnvByCollection: Record<string, string | null>;
  /** Runtime variable overrides from scripts (not persisted to disk) */
  runtimeOverrides: Record<string, string>;

  loadEnvironments: (collectionPath: string) => Promise<void>;
  setActiveEnvironment: (name: string | null) => void;
  setActiveCollectionPath: (path: string | null) => void;
  getResolvedVariables: () => Promise<Record<string, string>>;
  applyMutations: (mutations: Record<string, string | null>) => void;
  clear: () => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironmentName: null,
  activeCollectionPath: null,
  lastUsedEnvByCollection: {},
  runtimeOverrides: {},

  clear: () => {
    set({
      environments: [],
      activeEnvironmentName: null,
      activeCollectionPath: null,
      runtimeOverrides: {},
    });
  },

  loadEnvironments: async (collectionPath) => {
    try {
      const envs = await loadEnvironmentsApi(collectionPath);
      const isDifferentCollection = get().activeCollectionPath !== collectionPath;

      // Check last used environment for this specific collection
      const lastUsed = get().lastUsedEnvByCollection[collectionPath];
      const hasLastUsed = lastUsed && envs.some((e) => e.name === lastUsed);

      const nextActiveName = hasLastUsed
        ? lastUsed
        : (envs.length > 0 ? envs[0].name : null);

      set((state) => ({
        environments: envs,
        activeCollectionPath: collectionPath,
        activeEnvironmentName: nextActiveName,
        lastUsedEnvByCollection: {
          ...state.lastUsedEnvByCollection,
          [collectionPath]: nextActiveName,
        },
        runtimeOverrides: isDifferentCollection ? {} : state.runtimeOverrides,
      }));
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to load environments: ${err}`),
      );
    }
  },

  setActiveEnvironment: (name) => {
    const { activeCollectionPath } = get();
    set((state) => ({
      activeEnvironmentName: name,
      lastUsedEnvByCollection: activeCollectionPath
        ? { ...state.lastUsedEnvByCollection, [activeCollectionPath]: name }
        : state.lastUsedEnvByCollection,
    }));
  },

  setActiveCollectionPath: (path) => {
    set({ activeCollectionPath: path });
  },

  getResolvedVariables: async () => {
    const { activeCollectionPath, activeEnvironmentName, runtimeOverrides, environments } = get();
    if (!activeCollectionPath) {
      return { ...runtimeOverrides };
    }

    // Guard: verify activeEnvironmentName actually belongs to current collection environments
    const validEnvName = environments.some((e) => e.name === activeEnvironmentName)
      ? activeEnvironmentName
      : null;

    if (!validEnvName) {
      // No environment selected — still load root .env variables
      try {
        const rootVars = await loadRootDotenv(activeCollectionPath);
        return { ...rootVars, ...runtimeOverrides };
      } catch (err) {
        import("@/stores/toast-store").then(({ useToastStore }) =>
          useToastStore.getState().showWarning("Could not load .env file"),
        );
        return { ...runtimeOverrides };
      }
    }
    try {
      const resolved = await getResolvedVariablesApi(
        activeCollectionPath,
        validEnvName,
      );
      return { ...resolved, ...runtimeOverrides };
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to resolve variables: ${err}`),
      );
      return { ...runtimeOverrides };
    }
  },

  applyMutations: (mutations) => {
    set((state) => {
      const overrides = { ...state.runtimeOverrides };
      for (const [key, value] of Object.entries(mutations)) {
        if (value === null) {
          delete overrides[key];
        } else {
          overrides[key] = value;
        }
      }
      return { runtimeOverrides: overrides };
    });
  },
}));
