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
  /** Runtime variable overrides from scripts (not persisted to disk) */
  runtimeOverrides: Record<string, string>;

  loadEnvironments: (collectionPath: string) => Promise<void>;
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
      console.error("Failed to load environments:", err);
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
        console.error("Failed to load root .env:", err);
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
      console.error("Failed to resolve variables:", err);
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
