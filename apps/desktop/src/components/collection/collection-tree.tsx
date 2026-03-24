import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import type { CollectionNode, CollectionDefaults, HttpMethod } from "@apiark/types";
import { useCollectionStore } from "@/stores/collection-store";
import { useTabStore } from "@/stores/tab-store";
import { useMockStore } from "@/stores/mock-store";
import { useDocsStore } from "@/stores/docs-store";
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FilePlus,
  FolderPlus,
  Trash2,
  Pencil,
  Download,
  Radio,
  FileText,
  GripVertical,
  Cookie,
  X,
  FolderX,
} from "lucide-react";
import { getCollectionDefaults, updateCollectionDefaults } from "@/lib/tauri-api";
import * as Dialog from "@radix-ui/react-dialog";
import { CookieJarDialog } from "@/components/collection/cookie-jar-dialog";
import { exportCollectionToFile } from "@/lib/export-collection";
import { saveFolderOrder } from "@/lib/tauri-api";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useVirtualizer } from "@tanstack/react-virtual";

// Global event to ensure only one context menu is open at a time
const CLOSE_ALL_MENUS = "collection-tree:close-all-menus";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "text-green-500",
  POST: "text-yellow-500",
  PUT: "text-blue-500",
  PATCH: "text-purple-500",
  DELETE: "text-red-500",
  HEAD: "text-cyan-500",
  OPTIONS: "text-gray-500",
};

// ── Flat node type for virtualization ──

interface FlatNode {
  node: CollectionNode;
  depth: number;
  collectionPath: string;
  collectionName: string;
  /** Parent directory path for DnD sibling grouping */
  parentDir: string;
}

// ── Utility functions ──

/** Get the order key for a node (file stem for requests, folder name for folders) */
function getOrderKey(node: CollectionNode): string {
  const path = node.path;
  const name = path.substring(path.lastIndexOf("/") + 1);
  if (node.type === "request") {
    return name.replace(/\.(yaml|yml)$/, "");
  }
  return name;
}

/** Fuzzy subsequence match with scoring.
 * Returns a score > 0 if query is a fuzzy match for text, 0 otherwise.
 * Bonuses for consecutive matches and word-boundary matches. */
function fuzzyScore(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let score = 0;
  let ti = 0;
  let prevMatched = false;
  for (let qi = 0; qi < q.length; qi++) {
    let found = false;
    while (ti < t.length) {
      if (t[ti] === q[qi]) {
        score += 1;
        // Consecutive match bonus
        if (prevMatched) score += 2;
        // Word boundary bonus (start of string, after space/hyphen/underscore)
        if (ti === 0 || /[\s\-_/.]/.test(t[ti - 1])) score += 3;
        prevMatched = true;
        ti++;
        found = true;
        break;
      }
      prevMatched = false;
      ti++;
    }
    if (!found) return 0;
  }
  return score;
}

/** Check if a node or its children match a search query (fuzzy) */
function nodeMatchesSearch(node: CollectionNode, query: string): boolean {
  if (!query) return true;
  if (fuzzyScore(node.name, query) > 0) return true;
  if (node.type !== "request" && node.children.length > 0) {
    return node.children.some((child) => nodeMatchesSearch(child, query));
  }
  return false;
}

/** Flatten the tree into a virtual list, respecting expanded state and search */
function flattenTree(
  nodes: CollectionNode[],
  expandedPaths: Set<string>,
  collectionPath: string,
  collectionName: string,
  searchQuery: string,
  depth: number,
  parentDir: string,
  result: FlatNode[],
): void {
  const filtered = searchQuery
    ? nodes.filter((n) => nodeMatchesSearch(n, searchQuery))
    : nodes;

  for (const node of filtered) {
    result.push({ node, depth, collectionPath, collectionName, parentDir });

    if (node.type !== "request") {
      const isExpanded = expandedPaths.has(node.path) || !!searchQuery;
      if (isExpanded && node.children.length > 0) {
        flattenTree(
          node.children,
          expandedPaths,
          collectionPath,
          node.type === "collection" ? node.name : collectionName,
          searchQuery,
          depth + 1,
          node.path,
          result,
        );
      }
    }
  }
}

// ── Main component ──

interface CollectionTreeProps {
  nodes: CollectionNode[];
  collectionPath: string;
  collectionName: string;
  searchQuery?: string;
  parentRef?: React.RefObject<HTMLDivElement | null>;
}

const ROW_HEIGHT = 28;

export function CollectionTree({
  nodes,
  collectionPath,
  collectionName,
  searchQuery = "",
  parentRef: externalParentRef,
}: CollectionTreeProps) {
  const { expandedPaths, refreshCollection } = useCollectionStore();
  const internalParentRef = useRef<HTMLDivElement>(null);
  const scrollRef = externalParentRef ?? internalParentRef;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const flatNodes = useMemo(() => {
    const result: FlatNode[] = [];
    flattenTree(
      nodes,
      expandedPaths,
      collectionPath,
      collectionName,
      searchQuery,
      0,
      collectionPath,
      result,
    );
    return result;
  }, [nodes, expandedPaths, collectionPath, collectionName, searchQuery]);

  const virtualizer = useVirtualizer({
    count: flatNodes.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 15,
  });

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const activeFlat = flatNodes.find((f) => f.node.path === active.id);
      const overFlat = flatNodes.find((f) => f.node.path === over.id);
      if (!activeFlat || !overFlat) return;

      // Only allow reordering within the same parent
      if (activeFlat.parentDir !== overFlat.parentDir) return;

      // Get all siblings at the same parent
      const siblings = flatNodes.filter(
        (f) => f.parentDir === activeFlat.parentDir && f.depth === activeFlat.depth,
      );

      const fromIdx = siblings.findIndex((f) => f.node.path === active.id);
      const toIdx = siblings.findIndex((f) => f.node.path === over.id);
      if (fromIdx === -1 || toIdx === -1) return;

      const reordered = [...siblings];
      const [moved] = reordered.splice(fromIdx, 1);
      reordered.splice(toIdx, 0, moved);

      const order = reordered.map((f) => getOrderKey(f.node));
      try {
        await saveFolderOrder(activeFlat.parentDir, order);
        await refreshCollection(collectionPath);
      } catch (err) {
        import("@/stores/toast-store").then(({ useToastStore }) =>
          useToastStore.getState().showError(`Failed to reorder items: ${err}`),
        );
      }
    },
    [flatNodes, refreshCollection, collectionPath],
  );

  if (flatNodes.length === 0) return null;

  const needsOwnScroll = !externalParentRef;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={flatNodes.map((f) => f.node.path)}
        strategy={verticalListSortingStrategy}
      >
        {needsOwnScroll ? (
          <div ref={internalParentRef} style={{ overflow: "auto", maxHeight: "100%" }}>
            <div
              style={{
                height: `${virtualizer.getTotalSize()}px`,
                width: "100%",
                position: "relative",
              }}
            >
              {virtualizer.getVirtualItems().map((virtualRow) => {
                const flat = flatNodes[virtualRow.index];
                return (
                  <VirtualRow
                    key={flat.node.path}
                    flat={flat}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ) : (
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: "100%",
              position: "relative",
            }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const flat = flatNodes[virtualRow.index];
              return (
                <VirtualRow
                  key={flat.node.path}
                  flat={flat}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                />
              );
            })}
          </div>
        )}
      </SortableContext>
    </DndContext>
  );
}

// ── Virtual row wrapper with DnD ──

function VirtualRow({ flat, style }: { flat: FlatNode; style: React.CSSProperties }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: flat.node.path });

  const dndStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform) || style.transform as string,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={dndStyle}>
      <TreeNodeRow
        flat={flat}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ── Individual tree node row ──

function TreeNodeRow({
  flat,
  dragHandleProps,
}: {
  flat: FlatNode;
  dragHandleProps: Record<string, unknown>;
}) {
  const { t } = useTranslation();
  const { node, depth, collectionPath, collectionName } = flat;
  const { expandedPaths, toggleExpand, createRequest, createFolder, deleteItem, renameItem } =
    useCollectionStore();
  const { openTab } = useTabStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [cookieSettingsPath, setCookieSettingsPath] = useState<string | null>(null);
  const [cookieJarPath, setCookieJarPath] = useState<string | null>(null);
  const [newRequestDialog, setNewRequestDialog] = useState(false);
  const [newFolderDialog, setNewFolderDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteCollectionConfirm, setDeleteCollectionConfirm] = useState(false);

  const isExpanded = expandedPaths.has(node.path);

  // Close this menu when another node opens its menu
  useEffect(() => {
    const handler = () => setContextMenu(null);
    window.addEventListener(CLOSE_ALL_MENUS, handler);
    return () => window.removeEventListener(CLOSE_ALL_MENUS, handler);
  }, []);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    // Close all other open context menus first
    window.dispatchEvent(new Event(CLOSE_ALL_MENUS));
    // Open this one on next tick so our own listener doesn't close it
    requestAnimationFrame(() => setContextMenu({ x: e.clientX, y: e.clientY }));
  };

  const closeContextMenu = () => setContextMenu(null);

  const handleNewRequest = () => {
    closeContextMenu();
    setNewRequestDialog(true);
  };

  const handleCreateRequest = async (name: string, protocol?: Protocol) => {
    const dir = node.type === "request" ? collectionPath : node.path;
    const filename = name.toLowerCase().replace(/\s+/g, "-");
    try {
      const path = await createRequest(dir, filename, name, collectionPath);
      await openTab(path, collectionPath);
      // For non-HTTP protocols, update the tab after opening then save to disk
      if (protocol && protocol !== "http") {
        const tabStore = useTabStore.getState();
        const tab = tabStore.tabs.find((t) => t.filePath === path);
        if (tab) {
          const patch: Record<string, unknown> = { protocol };
          if (protocol === "graphql") {
            patch.method = "POST";
            patch.graphql = { query: "", variables: "{}", operationName: "", schemaJson: null };
          } else if (protocol === "websocket") {
            patch.url = "ws://localhost:8080";
          } else if (protocol === "sse") {
            patch.url = "";
          } else if (protocol === "grpc") {
            patch.url = "http://localhost:50051";
            patch.grpc = {
              services: [],
              selectedService: null,
              selectedMethod: null,
              requestJson: "{}",
              metadata: [{ id: `kv_${Date.now()}`, key: "", value: "", enabled: true }],
              loading: false,
              response: null,
              error: null,
            };
          }
          useTabStore.setState((state) => ({
            tabs: state.tabs.map((t) =>
              t.id === tab.id ? { ...t, ...patch } : t,
            ),
          }));
          // Save to disk so the sidebar reflects the correct protocol
          await useTabStore.getState().save();
          // Refresh sidebar
          await useCollectionStore.getState().refreshCollection(collectionPath);
        }
      }
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to create request: ${err}`),
      );
    }
  };

  const handleNewFolder = () => {
    closeContextMenu();
    setNewFolderDialog(true);
  };

  const handleCreateFolder = async (name: string) => {
    const dir = node.type === "request" ? collectionPath : node.path;
    try {
      await createFolder(dir, name);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to create folder: ${err}`),
      );
    }
  };

  const handleDelete = () => {
    closeContextMenu();
    setDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    try {
      await deleteItem(node.path, collectionName, collectionPath);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to delete: ${err}`),
      );
    }
  };

  const confirmDeleteCollection = async () => {
    try {
      await useCollectionStore.getState().deleteCollection(node.path, collectionName);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to delete collection: ${err}`),
      );
    }
  };

  const handleRename = () => {
    closeContextMenu();
    setRenameValue(node.name);
    setRenaming(true);
  };

  const submitRename = async () => {
    setRenaming(false);
    if (!renameValue.trim() || renameValue === node.name) return;
    try {
      await renameItem(node.path, renameValue.trim(), collectionPath);
    } catch (err) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to rename: ${err}`),
      );
    }
  };

  if (node.type === "request") {
    return (
      <>
        <div
          className="group relative flex w-full items-center gap-1.5 rounded px-2 py-1 text-sm hover:bg-[var(--color-elevated)]"
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onContextMenu={handleContextMenu}
        >
          <span
            className="shrink-0 cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100"
            {...dragHandleProps}
          >
            <GripVertical className="h-3 w-3 text-[var(--color-text-muted)]" />
          </span>
          <span
            className={`w-9 shrink-0 text-[10px] font-bold ${
              node.protocol === "graphql" || node.isGraphql ? "text-violet-400"
              : node.protocol === "websocket" ? "text-cyan-400"
              : node.protocol === "sse" ? "text-orange-400"
              : node.protocol === "grpc" ? "text-green-400"
              : METHOD_COLORS[node.method]
            }`}
          >
            {node.protocol === "graphql" || node.isGraphql ? "GQL"
              : node.protocol === "websocket" ? "WS"
              : node.protocol === "sse" ? "SSE"
              : node.protocol === "grpc" ? "gRPC"
              : node.method}
          </span>
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={submitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") submitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              className="min-w-0 flex-1 rounded bg-[var(--color-elevated)] px-1 text-sm text-[var(--color-text-primary)] outline-none ring-1 ring-blue-500"
            />
          ) : (
            <>
              <span
                className="flex-1 cursor-pointer truncate text-[var(--color-text-secondary)]"
                onClick={() => openTab(node.path, collectionPath)}
              >
                {node.name}
              </span>
              {/* Action buttons — visible on hover */}
              <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRename();
              }}
              className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
              title={t("common.rename")}
            >
              <Pencil className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete();
              }}
              className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
              title={t("common.delete")}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
            </>
          )}
        </div>
        {contextMenu && (
          <ContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            onClose={closeContextMenu}
            items={[
              { label: t("common.rename"), icon: Pencil, onClick: handleRename },
              { label: t("common.delete"), icon: Trash2, onClick: handleDelete, danger: true },
            ]}
          />
        )}
        <ConfirmDialog
          open={deleteConfirm}
          onOpenChange={setDeleteConfirm}
          title={t("confirmDelete.title")}
          message={`${t("confirmDelete.message", `Delete "${node.name}"?`)}`}
          onConfirm={confirmDelete}
        />
      </>
    );
  }

  // Folder or Collection
  return (
    <>
      <div
        role="button"
        tabIndex={0}
        onClick={() => toggleExpand(node.path)}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") toggleExpand(node.path); }}
        onContextMenu={handleContextMenu}
        className="group flex w-full cursor-pointer items-center gap-1.5 rounded px-2 py-1 text-left text-sm hover:bg-[var(--color-elevated)]"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {node.type !== "collection" && (
          <span
            className="shrink-0 cursor-grab opacity-0 group-hover:opacity-50 hover:!opacity-100"
            {...dragHandleProps}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3 w-3 text-[var(--color-text-muted)]" />
          </span>
        )}
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
        {renaming ? (
          <input
            autoFocus
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onBlur={submitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitRename();
              if (e.key === "Escape") setRenaming(false);
            }}
            className="min-w-0 flex-1 rounded bg-[var(--color-elevated)] px-1 text-sm text-[var(--color-text-primary)] outline-none ring-1 ring-blue-500"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate text-[var(--color-text-primary)]">{node.name}</span>
        )}
        {/* Action buttons — visible on hover */}
        {!renaming && (
          <span className="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100">
            {node.type === "folder" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRename(); }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  title={t("common.rename")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </>
            )}
            {node.type === "collection" && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRename(); }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  title={t("common.rename")}
                >
                  <Pencil className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(); }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-red-500/20 hover:text-red-400"
                  title={t("common.delete")}
                >
                  <Trash2 className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    useCollectionStore.getState().closeCollection(collectionPath);
                  }}
                  className="rounded p-0.5 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
                  title={t("sidebar.closeCollection")}
                >
                  <FolderX className="h-3 w-3" />
                </button>
              </>
            )}
          </span>
        )}
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          items={[
            { label: t("sidebar.newRequest"), icon: FilePlus, onClick: handleNewRequest },
            { label: t("sidebar.newFolder"), icon: FolderPlus, onClick: handleNewFolder },
            ...(node.type === "collection"
              ? [
                  {
                    label: t("sidebar.exportPostman"),
                    icon: Download,
                    onClick: () => {
                      closeContextMenu();
                      exportCollectionToFile(node.path, node.name, "postman").catch((err: unknown) =>
                        import("@/stores/toast-store").then(({ useToastStore }) =>
                          useToastStore.getState().showError(`Export failed: ${err}`),
                        ),
                      );
                    },
                  },
                  {
                    label: t("sidebar.exportOpenapi"),
                    icon: Download,
                    onClick: () => {
                      closeContextMenu();
                      exportCollectionToFile(node.path, node.name, "openapi").catch((err: unknown) =>
                        import("@/stores/toast-store").then(({ useToastStore }) =>
                          useToastStore.getState().showError(`Export failed: ${err}`),
                        ),
                      );
                    },
                  },
                  {
                    label: t("sidebar.exportApiark"),
                    icon: Download,
                    onClick: () => {
                      closeContextMenu();
                      exportCollectionToFile(node.path, node.name, "apiark").catch((err: unknown) =>
                        import("@/stores/toast-store").then(({ useToastStore }) =>
                          useToastStore.getState().showError(`Export failed: ${err}`),
                        ),
                      );
                    },
                  },
                  {
                    label: t("sidebar.startMockServer"),
                    icon: Radio,
                    onClick: () => {
                      closeContextMenu();
                      useMockStore.getState().openDialog();
                    },
                  },
                  {
                    label: t("sidebar.generateDocs"),
                    icon: FileText,
                    onClick: () => {
                      closeContextMenu();
                      useDocsStore.getState().openDocs(node.path, node.name);
                    },
                  },
                  {
                    label: t("sidebar.cookieSettings"),
                    icon: Cookie,
                    onClick: () => {
                      closeContextMenu();
                      setCookieSettingsPath(node.path);
                    },
                  },
                  {
                    label: t("cookies.title"),
                    icon: Cookie,
                    onClick: () => {
                      closeContextMenu();
                      setCookieJarPath(node.path);
                    },
                  },
                  {
                    label: t("sidebar.closeCollection"),
                    icon: FolderX,
                    onClick: () => {
                      closeContextMenu();
                      useCollectionStore.getState().closeCollection(collectionPath);
                    },
                  },
                  {
                    label: t("sidebar.deleteCollection"),
                    icon: Trash2,
                    onClick: () => {
                      closeContextMenu();
                      setDeleteCollectionConfirm(true);
                    },
                    danger: true,
                  },
                ]
              : [
                  { label: t("common.rename"), icon: Pencil, onClick: handleRename },
                  { label: t("common.delete"), icon: Trash2, onClick: handleDelete, danger: true },
                ]),
          ]}
        />
      )}
      {cookieSettingsPath && (
        <CookieSettingsDialog
          collectionPath={cookieSettingsPath}
          onClose={() => setCookieSettingsPath(null)}
        />
      )}
      {cookieJarPath && (
        <CookieJarDialog
          open={!!cookieJarPath}
          onOpenChange={(open) => { if (!open) setCookieJarPath(null); }}
          collectionPath={cookieJarPath}
          collectionName={collectionName}
        />
      )}
      <InputDialog
        open={newRequestDialog}
        onOpenChange={setNewRequestDialog}
        title={t("sidebar.newRequest")}
        placeholder={t("sidebar.requestNamePlaceholder", "Request name")}
        showProtocol
        onSubmit={handleCreateRequest}
      />
      <InputDialog
        open={newFolderDialog}
        onOpenChange={setNewFolderDialog}
        title={t("sidebar.newFolder")}
        placeholder={t("sidebar.folderNamePlaceholder", "Folder name")}
        onSubmit={handleCreateFolder}
      />
      <ConfirmDialog
        open={deleteConfirm}
        onOpenChange={setDeleteConfirm}
        title={t("confirmDelete.title")}
        message={`${t("confirmDelete.message", `Delete "${node.name}"?`)}`}
        onConfirm={confirmDelete}
      />
      <ConfirmDialog
        open={deleteCollectionConfirm}
        onOpenChange={setDeleteCollectionConfirm}
        title={t("confirmDelete.title")}
        message={`Delete collection "${node.name}"? This will move the entire collection to trash.`}
        onConfirm={confirmDeleteCollection}
      />
    </>
  );
}

// ── Cookie Settings Dialog ──

function CookieSettingsDialog({
  collectionPath,
  onClose,
}: {
  collectionPath: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [defaults, setDefaults] = useState<CollectionDefaults | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCollectionDefaults(collectionPath)
      .then((d) => { setDefaults(d); setLoading(false); })
      .catch((e) => {
        import("@/stores/toast-store").then(({ useToastStore }) =>
          useToastStore.getState().showError(`Failed to load collection defaults: ${e}`),
        );
        setLoading(false);
      });
  }, [collectionPath]);

  const toggle = async (field: keyof CollectionDefaults, value: boolean) => {
    if (!defaults) return;
    const updated = { ...defaults, [field]: value };
    setDefaults(updated);
    try {
      await updateCollectionDefaults(collectionPath, updated);
    } catch (e) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Failed to update collection defaults: ${e}`),
      );
    }
  };

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
            <Dialog.Title className="text-sm font-semibold text-[var(--color-text-primary)]">
              {t("sidebar.cookieSettings")}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>
          <div className="space-y-3 p-5">
            {loading ? (
              <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>
            ) : defaults ? (
              <>
                <ToggleRow
                  label={t("cookies.sendCookies")}
                  description={t("cookies.sendCookiesDesc")}
                  checked={defaults.sendCookies}
                  onChange={(v) => toggle("sendCookies", v)}
                />
                <ToggleRow
                  label={t("cookies.storeCookies")}
                  description={t("cookies.storeCookiesDesc")}
                  checked={defaults.storeCookies}
                  onChange={(v) => toggle("storeCookies", v)}
                />
                <ToggleRow
                  label={t("cookies.persistCookies")}
                  description={t("cookies.persistCookiesDesc")}
                  checked={defaults.persistCookies}
                  onChange={(v) => toggle("persistCookies", v)}
                />
              </>
            ) : (
              <p className="text-sm text-[var(--color-text-muted)]">Failed to load settings.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-sm text-[var(--color-text-primary)]">{label}</div>
        <div className="text-xs text-[var(--color-text-muted)]">{description}</div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
          checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
        }`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-4.5" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
}

// ── Input dialog (replaces browser prompt()) ──

type Protocol = "http" | "graphql" | "websocket" | "sse" | "grpc";

function InputDialog({
  open,
  onOpenChange,
  title,
  placeholder,
  showProtocol,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  placeholder: string;
  showProtocol?: boolean;
  onSubmit: (value: string, protocol?: Protocol) => void;
}) {
  const [value, setValue] = useState("");
  const [protocol, setProtocol] = useState<Protocol>("http");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue("");
      setProtocol("http");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSubmit = () => {
    if (!value.trim()) return;
    onSubmit(value.trim(), showProtocol ? protocol : undefined);
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-5 shadow-2xl">
          <Dialog.Title className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">
            {title}
          </Dialog.Title>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
              if (e.key === "Escape") onOpenChange(false);
            }}
            placeholder={placeholder}
            className="mb-3 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none transition-colors focus:border-[var(--color-accent)]/50"
          />
          {showProtocol && (
            <div className="mb-3 flex flex-wrap gap-1.5">
              {(
                [
                  { value: "http", label: "HTTP", color: "bg-emerald-500/15 text-emerald-400" },
                  { value: "graphql", label: "GraphQL", color: "bg-violet-500/15 text-violet-400" },
                  { value: "websocket", label: "WebSocket", color: "bg-cyan-500/15 text-cyan-400" },
                  { value: "sse", label: "SSE", color: "bg-orange-500/15 text-orange-400" },
                  { value: "grpc", label: "gRPC", color: "bg-green-500/15 text-green-400" },
                ] as const
              ).map((p) => (
                <button
                  key={p.value}
                  onClick={() => setProtocol(p.value)}
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold transition-all ${
                    protocol === p.value
                      ? `${p.color} ring-1 ring-current`
                      : "bg-[var(--color-surface)] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Confirm dialog (replaces native Tauri ask()) ──

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  message,
  confirmLabel,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-5 shadow-2xl">
          <Dialog.Title className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
            {title}
          </Dialog.Title>
          <p className="mb-5 text-sm text-[var(--color-text-secondary)]">{message}</p>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="rounded-lg px-4 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                onConfirm();
                onOpenChange(false);
              }}
              className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
            >
              {confirmLabel ?? "Delete"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ── Context menu ──

function ContextMenu({
  x,
  y,
  onClose,
  items,
}: {
  x: number;
  y: number;
  onClose: () => void;
  items: {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    onClick: () => void;
    danger?: boolean;
  }[];
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const newLeft = rect.right > window.innerWidth ? Math.max(0, x - rect.width) : x;
      const newTop = rect.bottom > window.innerHeight ? Math.max(0, window.innerHeight - rect.height) : y;
      setPosition({ left: newLeft, top: newTop });
    }
  }, [x, y]);

  return createPortal(
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onMouseDown={onClose} />
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[160px] max-h-[80vh] overflow-y-auto rounded border border-[var(--color-border)] bg-[var(--color-elevated)] py-1 shadow-lg"
        style={{ left: position.left, top: position.top }}
      >
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.onClick}
            className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-[var(--color-border)] ${
              item.danger ? "text-red-400" : "text-[var(--color-text-primary)]"
            }`}
          >
            <item.icon className="h-3.5 w-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </>,
    document.body,
  );
}
