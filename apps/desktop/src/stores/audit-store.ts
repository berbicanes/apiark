import { create } from "zustand";
import {
  getAuditLogs,
  clearAuditLogs,
  logAuditAction,
  type AuditEntry,
} from "@/lib/tauri-api";

interface AuditState {
  entries: AuditEntry[];
  loading: boolean;
  hasMore: boolean;

  loadLogs: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  clearLogs: () => Promise<void>;
  logAction: (action: string, target: string, detail?: string) => Promise<void>;
}

const PAGE_SIZE = 100;

export const useAuditStore = create<AuditState>((set, get) => ({
  entries: [],
  loading: false,
  hasMore: true,

  loadLogs: async (_reset = true) => {
    set({ loading: true });
    try {
      const entries = await getAuditLogs(PAGE_SIZE, 0);
      set({ entries, loading: false, hasMore: entries.length >= PAGE_SIZE });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showWarning("Could not load audit logs"),
      );
      set({ loading: false });
    }
  },

  loadMore: async () => {
    const { entries, loading, hasMore } = get();
    if (loading || !hasMore) return;
    set({ loading: true });
    try {
      const more = await getAuditLogs(PAGE_SIZE, entries.length);
      set({
        entries: [...entries, ...more],
        loading: false,
        hasMore: more.length >= PAGE_SIZE,
      });
    } catch {
      set({ loading: false });
    }
  },

  clearLogs: async () => {
    try {
      await clearAuditLogs();
      set({ entries: [], hasMore: false });
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to clear audit logs: ${err}`),
      );
    }
  },

  logAction: async (action, target, detail) => {
    try {
      await logAuditAction(action, target, detail);
    } catch {
      // Silently fail — audit logging should not block user actions
    }
  },
}));
