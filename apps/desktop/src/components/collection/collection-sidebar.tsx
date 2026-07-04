import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useCollectionStore } from "@/stores/collection-store";
import { CollectionTree } from "./collection-tree";
import { EnvironmentSelector } from "@/components/environment/environment-selector";
import { HistoryPanel } from "@/components/history/history-panel";
import { FolderOpen, FolderPlus, ChevronDown, ChevronRight, Settings, Search, X, Upload } from "lucide-react";
import { EmptyState, FolderPlusIcon } from "@/components/ui/empty-state";
import { open } from "@tauri-apps/plugin-dialog";
import { createCollection } from "@/lib/tauri-api";
import { useSettingsStore } from "@/stores/settings-store";
import * as Dialog from "@radix-ui/react-dialog";

type SidebarSection = "collections" | "environments" | "history";

interface CollectionSidebarProps {
  onOpenSettings?: () => void;
  collapsed?: boolean;
  envSelectorRef?: React.RefObject<HTMLButtonElement | null>;
  onOpenImport?: () => void;
}

export function CollectionSidebar({ onOpenSettings, collapsed, envSelectorRef, onOpenImport }: CollectionSidebarProps) {
  const { t } = useTranslation();
  const sidebarWidth = useSettingsStore((s) => s.settings.sidebarWidth);
  const { collections, openCollection } = useCollectionStore();
  const [expandedSections, setExpandedSections] = useState<Set<SidebarSection>>(
    new Set(["collections", "environments"]),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [newCollectionOpen, setNewCollectionOpen] = useState(false);

  if (collapsed) return null;

  const toggleSection = (section: SidebarSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

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
    <aside
      data-tour="sidebar"
      className="flex shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-surface)]"
      style={{ width: `${sidebarWidth}px` }}
    >
      {/* Header */}
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
        <span className="text-lg font-semibold text-[var(--color-accent)]">ApiArk</span>
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            title="Settings (Ctrl+,)"
          >
            <Settings className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        {/* Collections section */}
        <div>
          <button
            onClick={() => toggleSection("collections")}
            className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {expandedSections.has("collections") ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t("sidebar.collections")}
          </button>

          {expandedSections.has("collections") && (
            <div className="px-1 pb-2">
              {/* Search input */}
              {collections.length > 0 && (
                <div className="relative mb-1 px-2">
                  <Search className="absolute left-4 top-1/2 h-3 w-3 -translate-y-1/2 text-[var(--color-text-dimmed)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t("sidebar.search")}
                    className="w-full rounded bg-[var(--color-elevated)] py-1 pl-7 pr-6 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              )}

              {collections.length === 0 ? (
                <EmptyState
                  icon={<FolderPlusIcon size={36} />}
                  title={t("sidebar.noCollections")}
                  description="Create a new collection or open an existing folder"
                  action={
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => setNewCollectionOpen(true)}
                        className="flex items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-hover)]"
                      >
                        <FolderPlus className="h-3.5 w-3.5" />
                        {t("sidebar.newCollection")}
                      </button>
                      <button
                        onClick={handleOpenFolder}
                        className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
                      >
                        <FolderOpen className="h-3.5 w-3.5" />
                        {t("sidebar.openFolder")}
                      </button>
                      {onOpenImport && (
                        <button
                          onClick={onOpenImport}
                          className="flex items-center gap-1.5 rounded-lg border border-[var(--color-border)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {t("sidebar.importCollection")}
                        </button>
                      )}
                    </div>
                  }
                />
              ) : (
                <>
                  {collections.map((collection) => (
                    <CollectionTree
                      key={collection.path}
                      nodes={
                        collection.type === "collection"
                          ? collection.children
                          : [collection]
                      }
                      collectionPath={collection.path}
                      collectionName={collection.name}
                      searchQuery={searchQuery}
                    />
                  ))}
                  <div className="mt-1 flex flex-wrap gap-1 px-2">
                    <button
                      onClick={() => setNewCollectionOpen(true)}
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
                    >
                      <FolderPlus className="h-3 w-3" />
                      {t("sidebar.new")}
                    </button>
                    <button
                      onClick={handleOpenFolder}
                      className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
                    >
                      <FolderOpen className="h-3 w-3" />
                      {t("sidebar.open")}
                    </button>
                    {onOpenImport && (
                      <button
                        onClick={onOpenImport}
                        className="flex items-center gap-1.5 rounded px-2 py-1 text-xs text-[var(--color-text-dimmed)] hover:text-[var(--color-text-secondary)]"
                      >
                        <Upload className="h-3 w-3" />
                        {t("sidebar.import")}
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Environment section */}
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => toggleSection("environments")}
            className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {expandedSections.has("environments") ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t("sidebar.environments")}
          </button>
          {expandedSections.has("environments") && (
            <div className="px-3 pb-2">
              <EnvironmentSelector ref={envSelectorRef} />
            </div>
          )}
        </div>

        {/* History section */}
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => toggleSection("history")}
            className="flex w-full items-center gap-1 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {expandedSections.has("history") ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {t("history.title")}
          </button>
          {expandedSections.has("history") && (
            <div className="pb-2">
              <HistoryPanel />
            </div>
          )}
        </div>
      </div>

      <NewCollectionDialog
        open={newCollectionOpen}
        onOpenChange={setNewCollectionOpen}
        onCreated={openCollection}
      />
    </aside>
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
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [parentDir, setParentDir] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName("");
      setParentDir("");
      setError("");
    }
    onOpenChange(open);
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
              {t("sidebar.newCollection")}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("sidebar.collectionName")}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("sidebar.collectionNamePlaceholder")}
                autoFocus
                className="w-full rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canCreate) handleCreate();
                }}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("sidebar.location")}
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={parentDir}
                  readOnly
                  placeholder={t("common.browse")}
                  className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
                />
                <button
                  onClick={handlePickFolder}
                  className="shrink-0 rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
                >
                  {t("common.browse")}
                </button>
              </div>
              {name.trim() && parentDir && (
                <p className="text-[11px] text-[var(--color-text-dimmed)]">
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
              {t("common.cancel")}
            </Dialog.Close>
            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {creating ? t("sidebar.creating") : t("common.create")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
