import { useState } from "react";
import { useCollectionStore } from "@/stores/collection-store";
import { CollectionTree } from "@/components/collection/collection-tree";
import { EnvironmentSelector } from "@/components/environment/environment-selector";
import { HistoryPanel } from "@/components/history/history-panel";
import { FolderOpen, Plus, Search, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import type { ActivityView } from "./activity-bar";

interface SidePanelProps {
  activeView: ActivityView;
  envSelectorRef?: React.RefObject<HTMLSelectElement | null>;
  onOpenMock?: () => void;
  onOpenMonitor?: () => void;
  onOpenDocs?: () => void;
}

export function SidePanel({
  activeView,
  envSelectorRef,
  onOpenMock,
  onOpenMonitor,
  onOpenDocs,
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
      <div className="flex h-10 shrink-0 items-center px-4">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          {titles[activeView]}
        </span>
      </div>

      {/* Panel content */}
      <div className="flex-1 overflow-y-auto">
        {activeView === "collections" && <CollectionsPanel />}
        {activeView === "environments" && <EnvironmentsPanel envSelectorRef={envSelectorRef} />}
        {activeView === "history" && <HistoryPanel />}
        {activeView === "mock" && <ToolPanel description="Create local mock servers from your collections" actionLabel="New Mock Server" onAction={onOpenMock} />}
        {activeView === "monitor" && <ToolPanel description="Schedule automated collection runs" actionLabel="New Monitor" onAction={onOpenMonitor} />}
        {activeView === "docs" && <ToolPanel description="Generate documentation from collections" actionLabel="Generate Docs" onAction={onOpenDocs} />}
      </div>
    </div>
  );
}

function CollectionsPanel() {
  const { collections, openCollection } = useCollectionStore();
  const [searchQuery, setSearchQuery] = useState("");

  const handleOpenFolder = async () => {
    try {
      const selected = await open({ directory: true, multiple: false });
      if (selected) {
        await openCollection(selected as string);
      }
    } catch (err) {
      console.error("Failed to open folder:", err);
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
              Open a folder containing .apiark/apiark.yaml
            </p>
          </div>
          <button
            onClick={handleOpenFolder}
            className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-xs font-medium text-white transition-all hover:brightness-110 active:scale-[0.98]"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Open Folder
          </button>
        </div>
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
          <button
            onClick={handleOpenFolder}
            className="mx-1 mt-1 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-[var(--color-text-dimmed)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
          >
            <Plus className="h-3 w-3" />
            Add Collection
          </button>
        </>
      )}
    </div>
  );
}

function EnvironmentsPanel({
  envSelectorRef,
}: {
  envSelectorRef?: React.RefObject<HTMLSelectElement | null>;
}) {
  return (
    <div className="px-3 py-2">
      <EnvironmentSelector ref={envSelectorRef} />
    </div>
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
