import { useState, useEffect, useRef, useMemo } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  Search,
  Plus,
  Settings,
  FolderOpen,
  Upload,
  Download,
  Play,
  Globe,
  Zap,
  Radio,
} from "lucide-react";
import { useTabStore } from "@/stores/tab-store";
import { useCollectionStore } from "@/stores/collection-store";
import { useEnvironmentStore } from "@/stores/environment-store";
import { useDiffStore } from "@/stores/diff-store";
import { useMockStore } from "@/stores/mock-store";
import { useMonitorStore } from "@/stores/monitor-store";
import { useDocsStore } from "@/stores/docs-store";
import { exportCollectionToFile } from "@/lib/export-collection";
import type { CollectionNode, ExportFormat } from "@apiark/types";

interface Command {
  id: string;
  label: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  action: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings: () => void;
  onOpenCurlImport: () => void;
  onOpenRunner?: () => void;
  onOpenImport?: () => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onOpenSettings,
  onOpenCurlImport,
  onOpenRunner,
  onOpenImport,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { tabs, newTab, newGraphQLTab, newWebSocketTab, newSSETab, newGrpcTab, setActiveTab } = useTabStore();
  const { collections } = useCollectionStore();
  const { environments, setActiveEnvironment } = useEnvironmentStore();
  const { openTab } = useTabStore();

  // Build command list dynamically
  const commands = useMemo(() => {
    const cmds: Command[] = [];

    // Static commands
    cmds.push({
      id: "new-request",
      label: "New HTTP Request",
      category: "General",
      icon: Plus,
      action: () => { newTab(); onOpenChange(false); },
    });
    cmds.push({
      id: "new-graphql",
      label: "New GraphQL Request",
      category: "General",
      icon: Globe,
      action: () => { newGraphQLTab(); onOpenChange(false); },
    });
    cmds.push({
      id: "new-websocket",
      label: "New WebSocket Connection",
      category: "General",
      icon: Zap,
      action: () => { newWebSocketTab(); onOpenChange(false); },
    });
    cmds.push({
      id: "new-sse",
      label: "New SSE Connection",
      category: "General",
      icon: Radio,
      action: () => { newSSETab(); onOpenChange(false); },
    });
    cmds.push({
      id: "new-grpc",
      label: "New gRPC Request",
      category: "General",
      icon: Zap,
      action: () => { newGrpcTab(); onOpenChange(false); },
    });
    cmds.push({
      id: "open-settings",
      label: "Settings",
      category: "General",
      icon: Settings,
      action: () => { onOpenSettings(); onOpenChange(false); },
    });
    cmds.push({
      id: "import-curl",
      label: "Import cURL",
      category: "General",
      icon: Upload,
      action: () => { onOpenCurlImport(); onOpenChange(false); },
    });
    if (onOpenImport) {
      cmds.push({
        id: "import-collection",
        label: "Import Collection",
        category: "General",
        icon: Upload,
        action: () => { onOpenImport(); onOpenChange(false); },
      });
    }

    cmds.push({
      id: "compare-responses",
      label: "Compare Responses",
      category: "General",
      icon: Download,
      action: () => { useDiffStore.getState().open(); onOpenChange(false); },
    });

    cmds.push({
      id: "mock-server",
      label: "Mock Servers",
      category: "General",
      icon: Radio,
      action: () => { useMockStore.getState().openDialog(); onOpenChange(false); },
    });

    cmds.push({
      id: "monitors",
      label: "Scheduled Monitors",
      category: "General",
      icon: Play,
      action: () => { useMonitorStore.getState().openDialog(); onOpenChange(false); },
    });

    if (collections.length > 0) {
      cmds.push({
        id: "generate-docs",
        label: "Generate API Docs",
        category: "General",
        icon: Globe,
        action: () => {
          const col = collections[0];
          useDocsStore.getState().openDocs(col.path, col.name);
          onOpenChange(false);
        },
      });
    }

    if (onOpenRunner) {
      cmds.push({
        id: "run-collection",
        label: "Run Collection",
        category: "General",
        icon: Play,
        action: () => { onOpenRunner(); onOpenChange(false); },
      });
    }

    // Switch tab commands
    for (const tab of tabs) {
      cmds.push({
        id: `tab-${tab.id}`,
        label: `${tab.method} ${tab.name}`,
        category: "Tabs",
        action: () => { setActiveTab(tab.id); onOpenChange(false); },
      });
    }

    // Switch environment commands
    for (const env of environments) {
      cmds.push({
        id: `env-${env.name}`,
        label: `Switch to ${env.name}`,
        category: "Environments",
        action: () => { setActiveEnvironment(env.name); onOpenChange(false); },
      });
    }

    // Open request from collection tree
    const collectRequests = (node: CollectionNode, collectionPath: string) => {
      if (node.type === "request") {
        cmds.push({
          id: `req-${node.path}`,
          label: `${node.method} ${node.name}`,
          category: "Requests",
          icon: FolderOpen,
          action: () => { openTab(node.path, collectionPath); onOpenChange(false); },
        });
      } else if (node.type === "folder" || node.type === "collection") {
        for (const child of node.children) {
          collectRequests(child, collectionPath);
        }
      }
    };
    for (const col of collections) {
      collectRequests(col, col.path);

      // Export commands per collection
      const exportFormats: { format: ExportFormat; label: string }[] = [
        { format: "postman", label: "Postman" },
        { format: "openapi", label: "OpenAPI" },
      ];
      for (const { format, label } of exportFormats) {
        cmds.push({
          id: `export-${col.path}-${format}`,
          label: `Export ${col.name} as ${label}`,
          category: "Export",
          icon: Download,
          action: () => {
            exportCollectionToFile(col.path, col.name, format).catch(console.error);
            onOpenChange(false);
          },
        });
      }
    }

    return cmds;
  }, [tabs, collections, environments, newTab, newGraphQLTab, newWebSocketTab, newSSETab, setActiveTab, setActiveEnvironment, openTab, onOpenChange, onOpenSettings, onOpenCurlImport, onOpenRunner]);

  // Filter commands by query (fuzzy match)
  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(q) ||
      cmd.category.toLowerCase().includes(q),
    );
  }, [commands, query]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Keep selected index in bounds
  useEffect(() => {
    if (selectedIndex >= filtered.length) {
      setSelectedIndex(Math.max(0, filtered.length - 1));
    }
  }, [filtered.length, selectedIndex]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.children[selectedIndex] as HTMLElement | undefined;
    selected?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter":
        e.preventDefault();
        if (filtered[selectedIndex]) {
          filtered[selectedIndex].action();
        }
        break;
      case "Escape":
        onOpenChange(false);
        break;
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          className="fixed left-1/2 top-[20%] z-50 w-[480px] -translate-x-1/2 overflow-hidden rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none"
          onKeyDown={handleKeyDown}
        >
          {/* Search input */}
          <div className="flex items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />
            <Dialog.Title className="sr-only">Command Palette</Dialog.Title>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
              placeholder="Type a command..."
              className="flex-1 bg-transparent text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
            />
          </div>

          {/* Command list */}
          <div ref={listRef} className="max-h-[320px] overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[var(--color-text-dimmed)]">
                No commands found
              </p>
            ) : (
              filtered.map((cmd, i) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.id}
                    onClick={cmd.action}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`flex w-full items-center gap-3 px-4 py-2 text-left text-sm ${
                      i === selectedIndex
                        ? "bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
                        : "text-[var(--color-text-secondary)]"
                    }`}
                  >
                    {Icon && <Icon className="h-4 w-4 shrink-0 text-[var(--color-text-muted)]" />}
                    <span className="flex-1 truncate">{cmd.label}</span>
                    <span className="text-xs text-[var(--color-text-dimmed)]">{cmd.category}</span>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-dimmed)]">
            <span>Navigate with arrow keys</span>
            <span>Enter to select</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
