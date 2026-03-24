import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "@radix-ui/react-dialog";
import { X, Power, Trash2, FolderOpen, Puzzle } from "lucide-react";
import { listPlugins, togglePlugin, uninstallPlugin, installPlugin, type PluginInfo } from "@/lib/tauri-api";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";

interface PluginManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluginManagerDialog({ open, onOpenChange }: PluginManagerDialogProps) {
  const { t } = useTranslation();
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uninstallTarget, setUninstallTarget] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      setPlugins(await listPlugins());
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) refresh();
  }, [open]);

  const handleToggle = async (name: string) => {
    await togglePlugin(name);
    refresh();
  };

  const handleUninstall = (name: string) => {
    setUninstallTarget(name);
  };

  const confirmUninstall = async () => {
    if (!uninstallTarget) return;
    await uninstallPlugin(uninstallTarget);
    setUninstallTarget(null);
    refresh();
  };

  const handleInstall = async () => {
    const path = await openFileDialog({
      directory: true,
      title: "Select plugin directory (must contain plugin.json)",
    });
    if (!path) return;
    try {
      await installPlugin(path);
      refresh();
    } catch (e) {
      import("@/stores/toast-store").then(({ useToastStore }) =>
        useToastStore.getState().showError(`Install failed: ${e}`),
      );
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[520px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-semibold text-[var(--color-text-primary)]">
              <Puzzle className="h-5 w-5" />
              Plugins
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="p-6">
            <button
              onClick={handleInstall}
              className="mb-4 flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:opacity-90"
            >
              <FolderOpen className="h-3.5 w-3.5" />
              Install from Folder
            </button>

            {loading && (
              <p className="text-sm text-[var(--color-text-muted)]">Loading...</p>
            )}

            {!loading && plugins.length === 0 && (
              <p className="text-sm text-[var(--color-text-dimmed)]">
                No plugins installed. Plugins are directories containing a <code>plugin.json</code> manifest.
              </p>
            )}

            <div className="space-y-3">
              {plugins.map((p) => (
                <div
                  key={p.manifest.name}
                  className="flex items-start justify-between rounded border border-[var(--color-border)] bg-[var(--color-elevated)] p-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {p.manifest.name}
                      </span>
                      <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        v{p.manifest.version}
                      </span>
                      <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]">
                        {p.manifest.runtime.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-[var(--color-text-secondary)]">
                      {p.manifest.description}
                    </p>
                    {p.manifest.author && (
                      <p className="mt-0.5 text-[10px] text-[var(--color-text-muted)]">
                        by {p.manifest.author}
                      </p>
                    )}
                    <div className="mt-1 flex gap-1">
                      {p.manifest.hooks.map((h) => (
                        <span
                          key={h}
                          className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[10px] text-[var(--color-text-muted)]"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleToggle(p.manifest.name)}
                      className={`rounded p-1.5 ${
                        p.enabled
                          ? "text-green-400 hover:bg-green-500/10"
                          : "text-[var(--color-text-dimmed)] hover:bg-[var(--color-surface)]"
                      }`}
                      title={p.enabled ? t("monitor.disabled") : t("app.enable")}
                    >
                      <Power className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleUninstall(p.manifest.name)}
                      className="rounded p-1.5 text-[var(--color-text-muted)] hover:bg-red-500/10 hover:text-red-400"
                      title={t("common.delete")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>

      {/* Uninstall confirmation */}
      <Dialog.Root open={!!uninstallTarget} onOpenChange={(v) => { if (!v) setUninstallTarget(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-5 shadow-2xl">
            <Dialog.Title className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
              Uninstall Plugin
            </Dialog.Title>
            <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
              Uninstall plugin &ldquo;{uninstallTarget}&rdquo;?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setUninstallTarget(null)}
                className="rounded-lg px-4 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmUninstall}
                className="rounded-lg bg-red-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Uninstall
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
}
