import { create } from "zustand";
import type { EnvironmentData } from "@apiark/types";
import {
  loadEnvironments as loadEnvironmentsApi,
  getResolvedVariables as getResolvedVariablesApi,
  deleteEnvironment as deleteEnvironmentApi,
  loadRootDotenv,
} from "@/lib/tauri-api";

interface EnvironmentState {
  environments: EnvironmentData[];
  activeEnvironmentName: string | null;
  activeCollectionPath: string | null;
  /** Runtime variable overrides from scripts (not persisted to disk) */
  runtimeOverrides: Record<string, string>;

  loadEnvironments: (collectionPath: string) => Promise<void>;
  deleteEnvironment: (
    collectionPath: string,
    name: string,
    scope?: "shared" | "personal",
  ) => Promise<void>;
  setActiveEnvironment: (name: string | null) => void;
  setActiveCollectionPath: (path: string | null) => void;
  getResolvedVariables: () => Promise<Record<string, string>>;
  applyMutations: (mutations: Record<string, string | null>) => void;
}

export const useEnvironmentStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  activeEnvironmentName: null,
  activeCollectionPath: null,
  runtimeOverrides: {},

  loadEnvironments: async (collectionPath) => {
    try {
      const envs = await loadEnvironmentsApi(collectionPath);
      set({
        environments: envs,
        activeCollectionPath: collectionPath,
        // Auto-select first environment if none selected
        activeEnvironmentName:
          get().activeEnvironmentName ??
          (envs.length > 0 ? envs[0].name : null),
      });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to load environments: ${err}`),
      );
    }
  },

  deleteEnvironment: async (collectionPath, name, scope) => {
    try {
      await deleteEnvironmentApi(collectionPath, name, scope);
      // Clear the active selection if we just deleted it; loadEnvironments will
      // auto-select the first remaining environment.
      if (get().activeEnvironmentName === name) {
        set({ activeEnvironmentName: null });
      }
      await get().loadEnvironments(collectionPath);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to delete environment: ${err}`),
      );
    }
  },

  setActiveEnvironment: (name) => {
    set({ activeEnvironmentName: name });
  },

  setActiveCollectionPath: (path) => {
    set({ activeCollectionPath: path });
  },

  getResolvedVariables: async () => {
    const { activeCollectionPath, activeEnvironmentName, runtimeOverrides } = get();
    if (!activeCollectionPath) {
      return { ...runtimeOverrides };
    }
    if (!activeEnvironmentName) {
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
        activeEnvironmentName,
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
