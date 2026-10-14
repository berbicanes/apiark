import { create } from "zustand";
import type { HistoryEntry } from "@apiark/types";
import {
  getHistory as getHistoryApi,
  searchHistory as searchHistoryApi,
  clearHistory as clearHistoryApi,
} from "@/lib/tauri-api";

interface HistoryState {
  entries: HistoryEntry[];
  loading: boolean;
  filterCollectionPath: string | null;

  setFilterCollectionPath: (path: string | null) => void;
  loadHistory: (collectionPath?: string | null) => Promise<void>;
  searchHistory: (query: string, collectionPath?: string | null) => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  entries: [],
  loading: false,
  filterCollectionPath: null,

  setFilterCollectionPath: (path) => {
    set({ filterCollectionPath: path });
  },

  loadHistory: async (collectionPath) => {
    set({ loading: true });
    const targetPath = collectionPath !== undefined ? collectionPath : get().filterCollectionPath;
    try {
      const entries = await getHistoryApi(undefined, undefined, targetPath);
      set({ entries, loading: false, filterCollectionPath: targetPath });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showWarning("Could not load request history"),
      );
      set({ loading: false });
    }
  },

  searchHistory: async (query, collectionPath) => {
    set({ loading: true });
    const targetPath = collectionPath !== undefined ? collectionPath : get().filterCollectionPath;
    try {
      const entries = await searchHistoryApi(query, undefined, targetPath);
      set({ entries, loading: false });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`History search failed: ${err}`),
      );
      set({ loading: false });
    }
  },

  clearHistory: async () => {
    try {
      await clearHistoryApi();
      set({ entries: [] });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to clear history: ${err}`),
      );
    }
  },
}));
