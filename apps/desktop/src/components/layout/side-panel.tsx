import { useState, useEffect } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { CollectionTree } from "@/components/collection/collection-tree";
import { EnvironmentSelector } from "@/components/environment/environment-selector";
import { HistoryPanel } from "@/components/history/history-panel";
import { FolderOpen, FolderPlus, Plus, Search, Trash2, X, Upload, FolderX, ChevronDown, ChevronRight, Folder } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { createCollection, saveEnvironment, deleteItem as deleteItemApi } from "@/lib/tauri-api";
import { useEnvironmentStore } from "@/stores/environment-store";
import type { EnvironmentData, CollectionNode } from "@apiark/types";
import * as Dialog from "@radix-ui/react-dialog";
import type { ActivityView } from "./activity-bar";

interface SidePanelProps {
  activeView: ActivityView;
  envSelectorRef?: React.RefObject<HTMLSelectElement | null>;
  onOpenMock?: () => void;
  onOpenMonitor?: () => void;
  onOpenDocs?: () => void;
  onOpenImport?: () => void;
}

export function SidePanel({
  activeView,
  envSelectorRef,
  onOpenMock,
  onOpenMonitor,
  onOpenDocs,
  onOpenImport,
}: SidePanelProps) {
  const titles: Record<ActivityView, string> = {
    collections: "Collections",
    environments: "Environments",
    history: "History",
    mock: "Mock Servers",
    monitor: "Monitors",
    docs: "API Docs",
  };

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Panel header */}
      <div className="flex h-11 shrink-0 items-center px-4">
        <span className="text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {titles[activeView]}
        </span>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "collections" && <CollectionsPanel onOpenImport={onOpenImport} />}
        {activeView === "environments" && <EnvironmentsPanel envSelectorRef={envSelectorRef} />}
        {activeView === "history" && <HistoryPanel />}
        {activeView === "mock" && <ToolPanel description="Create local mock servers from your collections" actionLabel="New Mock Server" onAction={onOpenMock} />}
        {activeView === "monitor" && <ToolPanel description="Schedule automated collection runs" actionLabel="New Monitor" onAction={onOpenMonitor} />}
        {activeView === "docs" && <ToolPanel description="Generate documentation from collections" actionLabel="Generate Docs" onAction={onOpenDocs} />}
      </div>
    </div>
  );
}

function CollectionsPanel({ onOpenImport }: { onOpenImport?: () => void }) {
  const { collections, openCollection, closeCollection } = useCollectionStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);
  const [collectionMenu, setCollectionMenu] = useState<{ x: number; y: number; path: string; name: string } | null>(null);

  const handleOpenFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        await openCollection(selected as string);
      }
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to open folder: ${err}`),
      );
    }
  };

  return (
    <div className="flex flex-col gap-2 px-2">
      {/* Search */}
      {collections.length > 0 && (
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-text-dimmed)]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search requests..."
            className="w-full rounded-lg bg-[var(--color-elevated)] py-1.5 pl-8 pr-7 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none transition-colors focus:bg-[var(--color-card)] focus:ring-1 focus:ring-[var(--color-accent)]/50"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      )}

      {collections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-2 py-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-accent-glow)]">
            <FolderOpen className="h-6 w-6 text-[var(--color-accent)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-secondary)]">No collections</p>
            <p className="mt-0.5 text-xs text-[var(--color-text-dimmed)]">
              Create a new collection or open an existing folder
            </p>
          </div>
          <button
            onClick={() => setNewCollectionOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            New Collection
          </button>
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-elevated)]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Folder
          </button>
          {onOpenImport && (
            <button
              onClick={onOpenImport}
              className="flex items-center gap-2 rounded-lg border border-[var(--color-border)] px-4 py-2 text-xs font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-elevated)]"
            >
              <Upload className="h-3.5 w-3.5" />
              Import Collection
            </button>
          )}
        </div>
      ) : (
        <>
          {collections.map((collection) => (
            <CollectionHeader
              key={collection.path}
              collection={collection}
              searchQuery={searchQuery}
              onContextMenu={(e) => {
                e.preventDefault();
                setCollectionMenu({ x: e.clientX, y: e.clientY, path: collection.path, name: collection.name });
              }}
            />
          ))}
          {/* Collection context menu */}
          {collectionMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setCollectionMenu(null)} />
              <div
                className="fixed z-50 min-w-[160px] rounded border border-[var(--color-border)] bg-[var(--color-elevated)] py-1 shadow-lg"
                style={{ left: collectionMenu.x, top: collectionMenu.y }}
              >
                <button
                  onClick={() => {
                    closeCollection(collectionMenu.path);
                    setCollectionMenu(null);
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]"
                >
                  <FolderX className="h-3.5 w-3.5" />
                  Close Collection
                </button>
                <button
                  onClick={async () => {
                    const { path, name } = collectionMenu;
                    setCollectionMenu(null);
                    if (!confirm(`Delete collection "${name}"? This will move the entire collection to trash.`)) return;
                    try {
                      await deleteItemApi(path, name);
                      closeCollection(path);
                    } catch (err) {
                      import("@/stores/toast-store").then(({ useToastStore }) =>
                        useToastStore.getState().showError(`Failed to delete collection: ${err}`),
                      );
                    }
                  }}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-red-400 hover:bg-[var(--color-border)]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Collection
                </button>
              </div>
            </>
          )}
          <div className="mx-1 mt-2 flex gap-1.5">
            <button
              onClick={() => setNewCollectionOpen(true)}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-[var(--color-text-dimmed)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            >
              <FolderPlus className="h-4 w-4" />
              New
            </button>
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-[var(--color-text-dimmed)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            >
              <FolderOpen className="h-4 w-4" />
              Open
            </button>
            {onOpenImport && (
              <button
                onClick={onOpenImport}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-[var(--color-text-dimmed)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
              >
                <Upload className="h-4 w-4" />
                Import
              </button>
            )}
          </div>
        </>
      )}

      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onCreated={openCollection}
      />
    </div>
  );
}

function CollectionHeader({
  collection,
  searchQuery,
  onContextMenu,
}: {
  collection: CollectionNode;
  searchQuery: string;
  onContextMenu: (e: React.MouseEvent) => void;
}) {
  const { expandedPaths, toggleExpand } = useCollectionStore();
  const isExpanded = expandedPaths.has(collection.path);

  return (
    <div>
      <button
        onClick={() => toggleExpand(collection.path)}
        onContextMenu={onContextMenu}
        className="group flex w-full items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-[var(--color-elevated)]"
      >
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        )}
        {isExpanded ? (
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        ) : (
          <Folder className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        )}
        <span className="truncate text-[var(--color-text-primary)]">{collection.name}</span>
      </button>
      {isExpanded && (
        <CollectionTree
          nodes={
            collection.type === "collection"
              ? collection.children
              : [collection]
          }
          collectionPath={collection.path}
          collectionName={collection.name}
          searchQuery={searchQuery}
        />
      )}
    </div>
  );
}

function NewCollectionDialog({
  open: isOpen,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (path: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (v) {
      setName("");
      setParentDir("");
      setError("");
    }
    onOpenChange(v);
  };

  const handlePickFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) setParentDir(selected as string);
    } catch { /* cancelled */ }
  };

  const handleCreate = async () => {
    if (!name.trim() || !parentDir) return;
    setCreating(true);
    setError("");
    try {
      const path = await createCollection(parentDir, name.trim());
      await onCreated(path);
      onOpenChange(false);
    } catch (err) {
      setError(String(err));
    } finally {
      setCreating(false);
    }
  };

  const canCreate = name.trim() && parentDir && !creating;

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[440px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-[var(--color-text-primary)]">
              New Collection
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Collection Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My API"
                autoFocus
                className="w-full rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) handleCreate();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Location
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={parentDir}
                  readOnly
                  placeholder="Choose a folder..."
                  className="flex-1 truncate rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
                />
                <button
                  onClick={handlePickFolder}
                  className="shrink-0 rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                >
                  Browse
                </button>
              </div>
              {name.trim() && parentDir && (
                <p className="truncate text-[11px] text-[var(--color-text-dimmed)]">
                  Will create: {parentDir}/{name.trim().toLowerCase().replace(/\s+/g, "-")}
                </p>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
            <Dialog.Close className="rounded px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]">
              Cancel
            </Dialog.Close>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EnvironmentsPanel({
  envSelectorRef,
}: {
  envSelectorRef?: React.RefObject<HTMLSelectElement | null>;
}) {
  const { environments, activeEnvironmentName, setActiveEnvironment, loadEnvironments } =
    useEnvironmentStore();
  const { collections } = useCollectionStore();
  const [editingEnv, setEditingEnv] = useState<EnvironmentData | null>(null);
  const [newEnvOpen, setNewEnvOpen] = useState(false);

  const collectionPath =
    collections.find((c) => c.type === "collection")?.path ?? null;

  // Load environments when panel mounts with a collection
  useEffect(() => {
    if (collectionPath) {
      loadEnvironments(collectionPath);
    }
  }, [collectionPath, loadEnvironments]);

  const handleSave = async (env: EnvironmentData) => {
    if (!collectionPath) return;
    try {
      await saveEnvironment(collectionPath, env);
      await loadEnvironments(collectionPath);
      setEditingEnv(null);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to save environment: ${err}`),
      );
    }
  };

  const handleCreateNew = async (name: string) => {
    if (!collectionPath) return;
    const env: EnvironmentData = { name, variables: {}, secrets: [] };
    try {
      await saveEnvironment(collectionPath, env);
      await loadEnvironments(collectionPath);
      setActiveEnvironment(name);
      setNewEnvOpen(false);
      // Open editor for the new environment
      setEditingEnv(env);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to create environment: ${err}`),
      );
    }
  };

  if (!collectionPath) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
        <p className="text-xs text-[var(--color-text-dimmed)]">
          Open a collection to manage environments
        </p>
      </div>
    );
  }

  // Editing an environment — show variable editor
  if (editingEnv) {
    return (
      <EnvironmentEditor
        env={editingEnv}
        onSave={handleSave}
        onBack={() => setEditingEnv(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Environment selector */}
      <EnvironmentSelector ref={envSelectorRef} />

      {/* Environment list with edit buttons */}
      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-dimmed)]">
            Environments
          </span>
          <button
            onClick={() => setNewEnvOpen(true)}
            className="rounded p-1 text-[var(--color-text-dimmed)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            title="New Environment"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {environments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-4">
            <p className="text-xs text-[var(--color-text-dimmed)]">
              No environments yet
            </p>
            <button
              onClick={() => setNewEnvOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5" />
              New Environment
            </button>
          </div>
        ) : (
          environments.map((env) => (
            <button
              key={env.name}
              onClick={() => setEditingEnv(env)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                activeEnvironmentName === env.name
                  ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                  : "text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]"
              }`}
            >
              <span className="truncate">{env.name}</span>
              <span className="shrink-0 text-[10px] text-[var(--color-text-dimmed)]">
                {Object.keys(env.variables).length} vars
              </span>
            </button>
          ))
        )}
      </div>

      {/* New environment dialog */}
      <NewEnvironmentDialog
        open={newEnvOpen}
        onOpenChange={setNewEnvOpen}
        onCreate={handleCreateNew}
      />
    </div>
  );
}

function EnvironmentEditor({
  env,
  onSave,
  onBack,
}: {
  env: EnvironmentData;
  onSave: (env: EnvironmentData) => void;
  onBack: () => void;
}) {
  const [name, setName] = useState(env.name);
  const [variables, setVariables] = useState<{ key: string; value: string }[]>(
    () => {
      const entries = Object.entries(env.variables).map(([key, value]) => ({ key, value }));
      if (entries.length === 0) entries.push({ key: "", value: "" });
      return entries;
    },
  );

  const handleSave = () => {
    const vars: Record<string, string> = {};
    for (const v of variables) {
      if (v.key.trim()) vars[v.key.trim()] = v.value;
    }
    onSave({ ...env, name: name.trim() || env.name, variables: vars });
  };

  const updateVar = (index: number, field: "key" | "value", val: string) => {
    setVariables((prev) => prev.map((v, i) => (i === index ? { ...v, [field]: val } : v)));
  };

  const addVar = () => {
    setVariables((prev) => [...prev, { key: "", value: "" }]);
  };

  const removeVar = (index: number) => {
    setVariables((prev) => {
      if (prev.length <= 1) return [{ key: "", value: "" }];
      return prev.filter((_, i) => i !== index);
    });
  };

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="flex-1 truncate rounded bg-transparent px-1 text-sm font-medium text-[var(--color-text-primary)] outline-none focus:bg-[var(--color-elevated)] focus:ring-1 focus:ring-[var(--color-accent)]"
        />
        <button
          onClick={handleSave}
          className="rounded bg-[var(--color-accent)] px-2.5 py-1 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
        >
          Save
        </button>
      </div>

      {/* Variables */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--color-text-dimmed)]">
            Variables
          </span>
        </div>

        {variables.map((v, i) => (
          <div key={i} className="flex gap-1">
            <input
              type="text"
              value={v.key}
              onChange={(e) => updateVar(i, "key", e.target.value)}
              placeholder="Key"
              className="w-1/2 rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <input
              type="text"
              value={v.value}
              onChange={(e) => updateVar(i, "value", e.target.value)}
              placeholder="Value"
              className="flex-1 rounded bg-[var(--color-elevated)] px-2 py-1 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
            />
            <button
              onClick={() => removeVar(i)}
              className="shrink-0 rounded p-1 text-[var(--color-text-dimmed)] hover:bg-[var(--color-elevated)] hover:text-red-400"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        ))}

        <button
          onClick={addVar}
          className="flex items-center gap-1 text-xs text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
        >
          <Plus className="h-3 w-3" /> Add Variable
        </button>
      </div>
    </div>
  );
}

function NewEnvironmentDialog({
  open: isOpen,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string) => void;
}) {
  const [name, setName] = useState("");

  const handleOpenChange = (v: boolean) => {
    if (v) setName("");
    onOpenChange(v);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-[var(--color-text-primary)]">
              New Environment
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Development, Staging, Production"
              autoFocus
              className="w-full rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) onCreate(name.trim());
              }}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
            <Dialog.Close className="rounded px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]">
              Cancel
            </Dialog.Close>
            <button
              onClick={() => name.trim() && onCreate(name.trim())}
              disabled={!name.trim()}
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ToolPanel({
  description,
  actionLabel,
  onAction,
}: {
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-4 py-8 text-center">
      <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      <button
        onClick={onAction}
        className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
      >
        {actionLabel}
      </button>
    </div>
  );
}
