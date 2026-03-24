import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import type { HttpMethod, Tab } from "@apiark/types";
import { useTabStore } from "@/stores/tab-store";
import { Plus, X, Globe, Zap, Radio, ChevronDown, Pin, Save, Terminal } from "lucide-react";
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
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: "bg-emerald-500/15 text-emerald-400",
  POST: "bg-amber-500/15 text-amber-400",
  PUT: "bg-blue-500/15 text-blue-400",
  PATCH: "bg-purple-500/15 text-purple-400",
  DELETE: "bg-red-500/15 text-red-400",
  HEAD: "bg-cyan-500/15 text-cyan-400",
  OPTIONS: "bg-gray-500/15 text-gray-400",
};

function TabBadge({ tab }: { tab: Tab }) {
  const badges: Record<string, { bg: string; label: string }> = {
    graphql: { bg: "bg-violet-500/15 text-violet-400", label: "GQL" },
    websocket: { bg: "bg-cyan-500/15 text-cyan-400", label: "WS" },
    sse: { bg: "bg-orange-500/15 text-orange-400", label: "SSE" },
    grpc: { bg: "bg-emerald-500/15 text-emerald-400", label: "gRPC" },
    mqtt: { bg: "bg-purple-500/15 text-purple-400", label: "MQTT" },
    socketio: { bg: "bg-pink-500/15 text-pink-400", label: "SIO" },
  };

  if (tab.protocol !== "http") {
    const badge = badges[tab.protocol];
    return (
      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badge?.bg ?? ""}`}>
        {badge?.label ?? tab.protocol}
      </span>
    );
  }

  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${METHOD_COLORS[tab.method]}`}>
      {tab.method}
    </span>
  );
}

function SortableTab({
  tab,
  isActive,
  onActivate,
  onClose,
  onDetach,
  onCloseOthers,
  onCloseAll,
  onTogglePin,
  onDuplicate,
}: {
  tab: Tab;
  isActive: boolean;
  onActivate: () => void;
  onClose: () => void;
  onDetach: () => void;
  onCloseOthers: () => void;
  onCloseAll: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
}) {
  const { t } = useTranslation();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: tab.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  useEffect(() => {
    if (!contextMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [contextMenu]);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <>
      <button
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onClick={onActivate}
        onMouseDown={(e) => {
          if (e.button === 1 && !tab.pinned) {
            e.preventDefault();
            onClose();
          }
        }}
        onContextMenu={handleContextMenu}
        className={`group relative flex shrink-0 items-center gap-2 rounded-t-lg px-4 py-2 text-[13px] transition-all ${
          isActive
            ? "bg-[var(--color-card)] text-[var(--color-text-primary)] shadow-[0_-1px_4px_rgba(0,0,0,0.1)]"
            : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        }`}
      >
        {tab.pinned && (
          <Pin className="h-3 w-3 shrink-0 rotate-45 text-[var(--color-accent)]" />
        )}
        <TabBadge tab={tab} />
        <span className="max-w-[140px] truncate">{tab.name}</span>
        {tab.isDirty && (
          <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />
        )}
        {!tab.pinned && (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="ml-0.5 rounded-md p-0.5 opacity-0 transition-opacity hover:bg-[var(--color-border)] group-hover:opacity-100"
          >
            <X className="h-3 w-3" />
          </span>
        )}
      </button>
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[180px] overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          {[
            { label: tab.pinned ? t("tabs.unpinTab") : t("tabs.pinTab"), action: onTogglePin },
            { label: t("tabs.duplicateTab"), action: onDuplicate },
            null,
            { label: t("tabs.close"), action: onClose },
            { label: t("tabs.closeOthers"), action: onCloseOthers },
            { label: t("tabs.closeAll"), action: onCloseAll },
            null,
            { label: t("tabs.moveToNewWindow"), action: onDetach },
          ].map((item, i) =>
            item === null ? (
              <div key={i} className="my-1 border-t border-[var(--color-border)]" />
            ) : (
              <button
                key={item.label}
                onClick={() => { item.action(); setContextMenu(null); }}
                className="flex w-full px-3 py-1.5 text-left text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-accent-glow)]"
              >
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </>
  );
}

function NewTabDropdown() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { newTab, newGraphQLTab, newWebSocketTab, newSSETab, newGrpcTab, newMqttTab, newSocketIoTab } = useTabStore();

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const items = [
    { label: t("tabs.httpRequest"), icon: Globe, action: newTab },
    { label: "GraphQL", icon: Globe, action: newGraphQLTab, color: "text-violet-400" },
    { label: "WebSocket", icon: Zap, action: newWebSocketTab, color: "text-cyan-400" },
    { label: "SSE", icon: Radio, action: newSSETab, color: "text-orange-400" },
    { label: "gRPC", icon: Globe, action: newGrpcTab, color: "text-emerald-400" },
    { label: "MQTT", icon: Radio, action: newMqttTab, color: "text-purple-400" },
    { label: "Socket.IO", icon: Zap, action: newSocketIoTab, color: "text-pink-400" },
  ];

  return (
    <div ref={ref} className="relative flex items-center">
      <button
        onClick={() => setOpen(!open)}
        className="ml-1 flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] active:scale-95"
        title="New Tab"
      >
        <Plus className="h-4 w-4" strokeWidth={2.5} />
        <span>{t("sidebar.new")}</span>
        <ChevronDown className="h-3 w-3 opacity-70" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] py-1 shadow-xl">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={() => {
                item.action();
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-glow)]"
            >
              <item.icon className={`h-4 w-4 ${item.color ?? "text-[var(--color-text-muted)]"}`} />
              {item.label}
            </button>
          ))}
          <div className="my-1 border-t border-[var(--color-border)]" />
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent("apiark:open-curl-import"));
              setOpen(false);
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-accent-glow)]"
          >
            <Terminal className="h-4 w-4 text-[var(--color-text-muted)]" />
            {t("tabs.importCurl")}
          </button>
        </div>
      )}
    </div>
  );
}

export function TabBar() {
  const { t } = useTranslation();
  const { tabs, activeTabId, setActiveTab, closeTab, closeOtherTabs, closeAllTabs, reorderTabs, detachTab, togglePin, duplicateTab, save } = useTabStore();
  const activeTab = tabs.find((t) => t.id === activeTabId);

  // Sort: pinned tabs first, preserving order within each group
  const sortedTabs = [...tabs].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return 0;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const fromIndex = tabs.findIndex((t) => t.id === active.id);
    const toIndex = tabs.findIndex((t) => t.id === over.id);
    if (fromIndex !== -1 && toIndex !== -1) {
      reorderTabs(fromIndex, toIndex);
    }
  };

  if (tabs.length === 0) return null;

  return (
    <div data-tour="tabs" className="flex items-end gap-1 bg-[var(--color-surface)] px-2 pt-2">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={sortedTabs.map((t) => t.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="flex flex-1 items-end gap-0.5 overflow-x-auto">
            {sortedTabs.map((tab) => (
              <SortableTab
                key={tab.id}
                tab={tab}
                isActive={tab.id === activeTabId}
                onActivate={() => setActiveTab(tab.id)}
                onClose={() => closeTab(tab.id)}
                onDetach={() => detachTab(tab.id)}
                onCloseOthers={() => closeOtherTabs(tab.id)}
                onCloseAll={() => closeAllTabs()}
                onTogglePin={() => togglePin(tab.id)}
                onDuplicate={() => duplicateTab(tab.id)}
              />
            ))}
            <button
              onClick={() => useTabStore.getState().newTab()}
              className="mb-0.5 ml-1 shrink-0 rounded-md p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
              title="New Tab (Ctrl+T)"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </SortableContext>
      </DndContext>
      <div className="flex items-center gap-1 pb-1.5">
        {activeTab?.isDirty && (
          <button
            onClick={() => {
              if (activeTab && !activeTab.filePath) {
                window.dispatchEvent(new CustomEvent("apiark:open-save-as"));
              } else {
                save();
              }
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-3 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
            title="Save (Ctrl+S)"
          >
            <Save className="h-3.5 w-3.5" />
            {t("common.save")}
          </button>
        )}
        <NewTabDropdown />
      </div>
    </div>
  );
}
