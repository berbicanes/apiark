import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FolderOpen, ChevronRight, ChevronDown } from "lucide-react";
import { useCollectionStore } from "@/stores/collection-store";
import type { CollectionNode } from "@apiark/types";
import { Input } from "@/components/ui/input";

interface SaveAsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultName: string;
  onSave: (collectionPath: string, dir: string, filename: string, name: string) => void;
}

export function SaveAsDialog({
  open,
  onOpenChange,
  defaultName,
  onSave,
}: SaveAsDialogProps) {
  const { t } = useTranslation();
  const collections = useCollectionStore((s) => s.collections);
  const [name, setName] = useState(defaultName);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedCollectionPath, setSelectedCollectionPath] = useState<string | null>(null);
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setName(defaultName);
      setSelectedPath(null);
      setSelectedCollectionPath(null);
      // Auto-select first collection if there's only one
      if (collections.length === 1 && collections[0].type === "collection") {
        setSelectedPath(collections[0].path);
        setSelectedCollectionPath(collections[0].path);
        setExpandedPaths(new Set([collections[0].path]));
      }
    }
    onOpenChange(open);
  };

  const filename = useMemo(
    () => name.trim().toLowerCase().replace(/\s+/g, "-"),
    [name],
  );

  const canSave = name.trim() && selectedPath && selectedCollectionPath;

  const handleSave = () => {
    if (!canSave) return;
    onSave(selectedCollectionPath!, selectedPath!, filename, name.trim());
    onOpenChange(false);
  };

  const toggleExpand = (path: string) => {
    setExpandedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[480px] -translate-x-1/2 -translate-y-1/2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="text-sm font-medium text-[var(--color-text-primary)]">
              {t("request.saveRequest")}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-4 p-4">
            {/* Request name */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                {t("request.requestName")}
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t("request.requestNamePlaceholder")}
                autoFocus
                className="w-full rounded bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && canSave) handleSave();
                }}
              />
              {name.trim() && (
                <p className="text-[11px] text-[var(--color-text-dimmed)]">
                  {t("request.filename")} {filename}.yaml
                </p>
              )}
            </div>

            {/* Location picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--color-text-secondary)]">
                Save Location
              </label>
              {collections.length === 0 ? (
                <div className="rounded border border-dashed border-[var(--color-border)] p-4 text-center">
                  <FolderOpen className="mx-auto mb-2 h-6 w-6 text-[var(--color-text-dimmed)]" />
                  <p className="text-xs text-[var(--color-text-muted)]">
                    No collections open. Open a collection first.
                  </p>
                </div>
              ) : (
                <div className="max-h-48 overflow-auto rounded border border-[var(--color-border)] bg-[var(--color-bg)]">
                  {collections.map((node) => (
                    <FolderTreeNode
                      key={node.path}
                      node={node}
                      collectionPath={node.type === "collection" ? node.path : ""}
                      selectedPath={selectedPath}
                      expandedPaths={expandedPaths}
                      onSelect={(path, collectionPath) => {
                        setSelectedPath(path);
                        setSelectedCollectionPath(collectionPath);
                      }}
                      onToggle={toggleExpand}
                      depth={0}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-4 py-3">
            <Dialog.Close className="rounded px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]">
              {t("common.cancel")}
            </Dialog.Close>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="rounded bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)] disabled:opacity-50"
            >
              {t("common.save")}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function FolderTreeNode({
  node,
  collectionPath,
  selectedPath,
  expandedPaths,
  onSelect,
  onToggle,
  depth,
}: {
  node: CollectionNode;
  collectionPath: string;
  selectedPath: string | null;
  expandedPaths: Set<string>;
  onSelect: (path: string, collectionPath: string) => void;
  onToggle: (path: string) => void;
  depth: number;
}) {
  // Only show collections and folders as save targets
  if (node.type === "request") return null;

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = selectedPath === node.path;
  const resolvedCollectionPath = node.type === "collection" ? node.path : collectionPath;
  const children = node.children.filter((c) => c.type !== "request");

  return (
    <div>
      <button
        onClick={() => {
          onSelect(node.path, resolvedCollectionPath);
          if (children.length > 0) onToggle(node.path);
        }}
        className={`flex w-full items-center gap-1.5 px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? "bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
            : "text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]"
        }`}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {children.length > 0 ? (
          isExpanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
          )
        ) : (
          <span className="w-3.5" />
        )}
        <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[var(--color-text-muted)]" />
        <span className="truncate">{node.name}</span>
      </button>
      {isExpanded &&
        children.map((child) => (
          <FolderTreeNode
            key={child.path}
            node={child}
            collectionPath={resolvedCollectionPath}
            selectedPath={selectedPath}
            expandedPaths={expandedPaths}
            onSelect={onSelect}
            onToggle={onToggle}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}
