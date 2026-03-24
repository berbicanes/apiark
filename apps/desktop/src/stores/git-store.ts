import { create } from "zustand";
import type { GitStatus, GitLogEntry } from "@/lib/tauri-api";
import {
  gitStatus as fetchStatus,
  gitStage,
  gitUnstage,
  gitCommit as doCommit,
  gitPush as doPush,
  gitPull as doPull,
  gitLog as fetchLog,
  gitInit as doInit,
} from "@/lib/tauri-api";

interface GitState {
  collectionPath: string | null;
  status: GitStatus | null;
  log: GitLogEntry[];
  loading: boolean;
  error: string | null;

  setCollection: (path: string | null) => void;
  loadStatus: () => Promise<void>;
  loadLog: () => Promise<void>;
  stage: (paths: string[]) => Promise<void>;
  unstage: (paths: string[]) => Promise<void>;
  commit: (message: string) => Promise<void>;
  push: () => Promise<void>;
  pull: () => Promise<void>;
  init: () => Promise<void>;
}

export const useGitStore = create<GitState>((set, get) => ({
  collectionPath: null,
  status: null,
  log: [],
  loading: false,
  error: null,

  setCollection: (path) => {
    set({ collectionPath: path, status: null, log: [], error: null });
    if (path) {
      get().loadStatus();
      get().loadLog();
    }
  },

  loadStatus: async () => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    try {
      const status = await fetchStatus(collectionPath);
      set({ status, error: null });
    } catch (err) {
      set({ error: String(err) });
    }
  },

  loadLog: async () => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    try {
      const log = await fetchLog(collectionPath, 50);
      set({ log });
    } catch {
      // No log available (e.g., no commits yet)
      set({ log: [] });
    }
  },

  stage: async (paths) => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true });
    try {
      await gitStage(collectionPath, paths);
      await get().loadStatus();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },

  unstage: async (paths) => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true });
    try {
      await gitUnstage(collectionPath, paths);
      await get().loadStatus();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },

  commit: async (message) => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true, error: null });
    try {
      await doCommit(collectionPath, message);
      await get().loadStatus();
      await get().loadLog();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },

  push: async () => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true, error: null });
    try {
      await doPush(collectionPath);
      await get().loadStatus();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },

  pull: async () => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true, error: null });
    try {
      await doPull(collectionPath);
      await get().loadStatus();
      await get().loadLog();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },

  init: async () => {
    const { collectionPath } = get();
    if (!collectionPath) return;
    set({ loading: true, error: null });
    try {
      await doInit(collectionPath);
      await get().loadStatus();
    } catch (err) {
      set({ error: String(err) });
    }
    set({ loading: false });
  },
}));
