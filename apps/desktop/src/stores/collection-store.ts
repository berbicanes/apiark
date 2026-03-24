import { create } from "zustand";
import type { CollectionNode, VersionStatus } from "@apiark/types";
import {
  openCollection as openCollectionApi,
  createRequest as createRequestApi,
  createFolder as createFolderApi,
  deleteItem as deleteItemApi,
  renameItem as renameItemApi,
  watchCollection,
  unwatchCollection,
  restoreFromTrash,
  checkCollectionVersion,
  migrateCollection as migrateCollectionApi,
} from "@/lib/tauri-api";
import { useUndoStore } from "./undo-store";

interface MigrationPrompt {
  path: string;
  status: VersionStatus;
}

interface CollectionState {
  collections: CollectionNode[];
  expandedPaths: Set<string>;
  /** Collections opened in read-only mode (version mismatch, user declined migration) */
  readOnlyPaths: Set<string>;
  /** Pending migration prompt — shown as a dialog */
  migrationPrompt: MigrationPrompt | null;

  openCollection: (path: string) => Promise<void>;
  closeCollection: (path: string) => void;
  refreshCollection: (path: string) => Promise<void>;
  toggleExpand: (path: string) => void;
  createRequest: (
    dir: string,
    filename: string,
    name: string,
    collectionPath: string,
  ) => Promise<string>;
  createFolder: (parent: string, name: string) => Promise<string>;
  deleteItem: (
    path: string,
    collectionName: string,
    collectionPath: string,
  ) => Promise<void>;
  deleteCollection: (
    path: string,
    name: string,
  ) => Promise<void>;
  renameItem: (
    path: string,
    newName: string,
    collectionPath: string,
  ) => Promise<string>;
  undoLastAction: () => Promise<void>;
  dismissMigration: () => void;
  acceptMigration: () => Promise<void>;
  openReadOnly: () => Promise<void>;
}

// Track in-flight openCollection calls to prevent race-condition duplicates
const openingPaths = new Set<string>();

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  expandedPaths: new Set<string>(),
  readOnlyPaths: new Set<string>(),
  migrationPrompt: null,

  openCollection: async (path) => {
    // Don't open the same collection twice (or concurrently)
    const existing = get().collections.find(
      (c) => c.type === "collection" && c.path === path,
    );
    if (existing || openingPaths.has(path)) return;
    openingPaths.add(path);

    try {
      // Check version before opening
      const status = await checkCollectionVersion(path);

      if (status.isNewer) {
        // Collection was created with a newer version of ApiArk
        set({ migrationPrompt: { path, status } });
        return;
      }

      if (status.needsMigration) {
        // Collection needs migration — prompt user
        set({ migrationPrompt: { path, status } });
        return;
      }

      // Version matches — open normally
      const tree = await openCollectionApi(path);
      set((state) => ({
        collections: [...state.collections, tree],
        expandedPaths: new Set([...state.expandedPaths, path]),
      }));
      watchCollection(path).catch((err) =>
        console.warn("Failed to start file watcher:", err),
      );
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to open collection: ${err}`),
      );
      throw err;
    } finally {
      openingPaths.delete(path);
    }
  },

  dismissMigration: () => {
    set({ migrationPrompt: null });
  },

  acceptMigration: async () => {
    const prompt = get().migrationPrompt;
    if (!prompt) return;

    try {
      await migrateCollectionApi(prompt.path);
      set({ migrationPrompt: null });
      // Now open the migrated collection
      const tree = await openCollectionApi(prompt.path);
      set((state) => ({
        collections: [...state.collections, tree],
        expandedPaths: new Set([...state.expandedPaths, prompt.path]),
      }));
      watchCollection(prompt.path).catch((err) =>
        console.warn("Failed to start file watcher:", err),
      );
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Collection migration failed: ${err}`),
      );
    }
  },

  openReadOnly: async () => {
    const prompt = get().migrationPrompt;
    if (!prompt) return;

    try {
      set({ migrationPrompt: null });
      const tree = await openCollectionApi(prompt.path);
      set((state) => ({
        collections: [...state.collections, tree],
        expandedPaths: new Set([...state.expandedPaths, prompt.path]),
        readOnlyPaths: new Set([...state.readOnlyPaths, prompt.path]),
      }));
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to open collection: ${err}`),
      );
    }
  },

  closeCollection: (path) => {
    unwatchCollection(path).catch(() => {});
    set((state) => ({
      collections: state.collections.filter(
        (c) => !(c.type === "collection" && c.path === path),
      ),
    }));
  },

  refreshCollection: async (path) => {
    try {
      const tree = await openCollectionApi(path);
      set((state) => ({
        collections: state.collections.map((c) =>
          c.type === "collection" && c.path === path ? tree : c,
        ),
      }));
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to refresh collection: ${err}`),
      );
    }
  },

  toggleExpand: (path) => {
    set((state) => {
      const newExpanded = new Set(state.expandedPaths);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
      }
      return { expandedPaths: newExpanded };
    });
  },

  createRequest: async (dir, filename, name, collectionPath) => {
    const path = await createRequestApi(dir, filename, name);
    await get().refreshCollection(collectionPath);
    return path;
  },

  createFolder: async (parent, name) => {
    const path = await createFolderApi(parent, name);
    // Find which collection this belongs to and refresh
    for (const c of get().collections) {
      if (c.type === "collection" && parent.startsWith(c.path)) {
        await get().refreshCollection(c.path);
        break;
      }
    }
    return path;
  },

  deleteItem: async (path, collectionName, collectionPath) => {
    // Close any open tab for this file before deleting, so the file
    // watcher doesn't show a "file deleted externally" conflict.
    const tabStore = (await import("@/stores/tab-store")).useTabStore;
    const openTab = tabStore.getState().tabs.find((t) => t.filePath === path);
    if (openTab) tabStore.getState().closeTab(openTab.id);

    const trashPath = await deleteItemApi(path, collectionName);
    useUndoStore.getState().pushUndo({
      type: "delete",
      path,
      collectionPath,
      collectionName,
      trashPath,
    });
    await get().refreshCollection(collectionPath);
  },

  deleteCollection: async (path, name) => {
    // 1. Close all tabs belonging to this collection
    const tabStore = (await import("@/stores/tab-store")).useTabStore;
    const tabsToClose = tabStore.getState().tabs.filter((t) => t.collectionPath === path);
    for (const tab of tabsToClose) {
      tabStore.getState().closeTab(tab.id);
    }
    // 2. Stop the file watcher and remove from sidebar
    get().closeCollection(path);
    // 3. Now delete the files (after watcher is stopped to avoid race conditions)
    const trashPath = await deleteItemApi(path, name);
    useUndoStore.getState().pushUndo({
      type: "delete",
      path,
      collectionPath: path,
      collectionName: name,
      trashPath,
    });
  },

  renameItem: async (path, newName, collectionPath) => {
    const oldName = path.split("/").pop()?.replace(".yaml", "") ?? "";
    const newPath = await renameItemApi(path, newName);
    const isCollectionRename = path === collectionPath;

    // Update any open tabs pointing to old paths
    const { useTabStore } = await import("@/stores/tab-store");
    const tabStore = useTabStore.getState();

    if (isCollectionRename) {
      // Renaming the collection root folder — update all tabs in this collection
      useTabStore.setState((state) => ({
        tabs: state.tabs.map((t) => {
          if (t.collectionPath !== collectionPath) return t;
          return {
            ...t,
            filePath: t.filePath ? t.filePath.replace(path, newPath) : t.filePath,
            collectionPath: newPath,
          };
        }),
      }));
      // Replace collection in-place with the new path instead of close+reopen,
      // to avoid race conditions with persistence and file watchers
      try {
        await unwatchCollection(collectionPath).catch(() => {});
        const tree = await openCollectionApi(newPath);
        set((state) => ({
          collections: state.collections.map((c) =>
            c.type === "collection" && c.path === collectionPath ? tree : c,
          ),
          expandedPaths: new Set(
            [...state.expandedPaths].map((p) =>
              p === collectionPath ? newPath : p.startsWith(collectionPath + "/") ? newPath + p.slice(collectionPath.length) : p,
            ),
          ),
        }));
        watchCollection(newPath).catch(() => {});
        // Persist the updated collections immediately
        useTabStore.getState().persistTabs();
      } catch (err) {
        // If reopen fails, try the close+open approach
        get().closeCollection(collectionPath);
        await get().openCollection(newPath);
      }
    } else {
      // Renaming a request or folder within a collection
      const openTab = tabStore.tabs.find((t) => t.filePath === path);
      if (openTab) {
        useTabStore.setState((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === openTab.id
              ? { ...t, filePath: newPath, name: newName, isDirty: false, conflictState: null }
              : t,
          ),
        }));
      }
      await get().refreshCollection(collectionPath);
    }

    useUndoStore.getState().pushUndo({
      type: "rename",
      oldPath: path,
      newPath,
      oldName,
      newName,
      collectionPath,
    });
    return newPath;
  },

  undoLastAction: async () => {
    const action = useUndoStore.getState().popUndo();
    if (!action) return;

    switch (action.type) {
      case "delete": {
        // Restore from trash to original parent directory
        const parentDir = action.path.substring(0, action.path.lastIndexOf("/"));
        await restoreFromTrash(action.trashPath, parentDir);
        await get().refreshCollection(action.collectionPath);
        break;
      }
      case "rename": {
        // Rename back to old name
        await renameItemApi(action.newPath, action.oldName);
        await get().refreshCollection(action.collectionPath);
        break;
      }
      case "move": {
        // Move is not yet implemented, placeholder
        break;
      }
    }
  },
}));
