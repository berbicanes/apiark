import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FolderOpen, Download, Upload, RefreshCw } from "lucide-react";
import { useSettingsStore } from "@/stores/settings-store";
import type { AppSettings } from "@apiark/types";
import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { exportAppState, importAppState } from "@/lib/tauri-api";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore();

  const update = (patch: Partial<AppSettings>) => {
    updateSettings(patch);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[520px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] shadow-xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
            <Dialog.Title className="text-lg font-semibold text-[var(--color-text-primary)]">
              Settings
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            {/* General Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                General
              </h3>

              {/* Sidebar width */}
              <div>
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Sidebar Width: {settings.sidebarWidth}px
                </label>
                <input
                  type="range"
                  min={180}
                  max={400}
                  step={4}
                  value={settings.sidebarWidth}
                  onChange={(e) => update({ sidebarWidth: Number(e.target.value) })}
                  className="w-full accent-[var(--color-accent)]"
                />
              </div>
            </section>

            {/* Network Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Network
              </h3>

              {/* SSL Verification */}
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  SSL Certificate Verification
                </label>
                <ToggleSwitch
                  checked={settings.verifySsl}
                  onChange={(v) => update({ verifySsl: v })}
                />
              </div>

              {/* Follow Redirects */}
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  Follow Redirects
                </label>
                <ToggleSwitch
                  checked={settings.followRedirects}
                  onChange={(v) => update({ followRedirects: v })}
                />
              </div>

              {/* Timeout */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Request Timeout (ms)
                </label>
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={settings.timeoutMs}
                  onChange={(e) => update({ timeoutMs: Number(e.target.value) || 30000 })}
                  className="w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
              </div>

              {/* Proxy */}
              <div>
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Proxy URL
                </label>
                <input
                  type="text"
                  value={settings.proxyUrl ?? ""}
                  onChange={(e) => update({ proxyUrl: e.target.value || null })}
                  placeholder="http://proxy.example.com:8080"
                  className="mb-2 w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                />
                {settings.proxyUrl && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={settings.proxyUsername ?? ""}
                      onChange={(e) => update({ proxyUsername: e.target.value || null })}
                      placeholder="Username (optional)"
                      className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                    <input
                      type="password"
                      value={settings.proxyPassword ?? ""}
                      onChange={(e) => update({ proxyPassword: e.target.value || null })}
                      placeholder="Password (optional)"
                      className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Certificates Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                Certificates
              </h3>

              {/* Custom CA Certificate */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Custom CA Certificate (PEM)
                </label>
                <FilePathInput
                  value={settings.caCertPath ?? ""}
                  onChange={(v) => update({ caCertPath: v || null })}
                  placeholder="Path to CA certificate (.pem, .crt)"
                  filters={[{ name: "Certificates", extensions: ["pem", "crt", "cer"] }]}
                />
              </div>

              {/* Client Certificate */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Client Certificate (PEM)
                </label>
                <FilePathInput
                  value={settings.clientCertPath ?? ""}
                  onChange={(v) => update({ clientCertPath: v || null })}
                  placeholder="Path to client certificate (.pem, .crt, .pfx)"
                  filters={[{ name: "Certificates", extensions: ["pem", "crt", "cer", "pfx", "p12"] }]}
                />
              </div>

              {/* Client Key */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  Client Key (PEM)
                </label>
                <FilePathInput
                  value={settings.clientKeyPath ?? ""}
                  onChange={(v) => update({ clientKeyPath: v || null })}
                  placeholder="Path to client private key (.pem, .key)"
                  filters={[{ name: "Keys", extensions: ["pem", "key"] }]}
                />
              </div>

              {/* PFX Passphrase */}
              {settings.clientCertPath?.match(/\.(pfx|p12)$/i) && (
                <div className="mb-4">
                  <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                    PFX Passphrase
                  </label>
                  <input
                    type="password"
                    value={settings.clientCertPassphrase ?? ""}
                    onChange={(e) => update({ clientCertPassphrase: e.target.value || null })}
                    placeholder="Passphrase (optional)"
                    className="w-full rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                  />
                </div>
              )}
            </section>

            {/* AI Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                AI Assistant
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
                    API Endpoint
                  </label>
                  <input
                    type="text"
                    value={settings.aiEndpoint ?? ""}
                    onChange={(e) => update({ aiEndpoint: e.target.value || null })}
                    placeholder="https://api.openai.com/v1"
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dimmed)]"
                  />
                  <p className="mt-0.5 text-xs text-[var(--color-text-dimmed)]">
                    Any OpenAI-compatible endpoint (OpenAI, Ollama, LM Studio, etc.)
                  </p>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
                    API Key
                  </label>
                  <input
                    type="password"
                    value={settings.aiApiKey ?? ""}
                    onChange={(e) => update({ aiApiKey: e.target.value || null })}
                    placeholder="sk-..."
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dimmed)]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-[var(--color-text-secondary)]">
                    Model
                  </label>
                  <input
                    type="text"
                    value={settings.aiModel ?? ""}
                    onChange={(e) => update({ aiModel: e.target.value || null })}
                    placeholder="gpt-4o-mini"
                    className="w-full rounded border border-[var(--color-border)] bg-[var(--color-bg)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-dimmed)]"
                  />
                </div>
              </div>
            </section>

            {/* Updates Section */}
            <UpdateSection settings={settings} update={update} />

            {/* Backup Section */}
            <BackupSection />
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function UpdateSection({
  settings,
  update,
}: {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => void;
}) {
  const [checking, setChecking] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [backups, setBackups] = useState<string[]>([]);

  const loadBackups = async () => {
    try {
      const { listRollbackVersions } = await import("@/lib/tauri-api");
      setBackups(await listRollbackVersions());
    } catch { /* ignore */ }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    try {
      // Backup current binary before checking for updates
      const { backupCurrentBinary } = await import("@/lib/tauri-api");
      await backupCurrentBinary().catch(() => {});

      const { check } = await import("@tauri-apps/plugin-updater");
      const result = await check();
      if (result) {
        setUpdateStatus(`Update available: v${result.version}`);
      } else {
        setUpdateStatus("You're up to date");
      }
      loadBackups();
    } catch (e) {
      setUpdateStatus(`Check failed: ${e}`);
    } finally {
      setChecking(false);
    }
  };

  // Load backups on mount
  useState(() => { loadBackups(); });

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Updates
      </h3>

      <div className="mb-4">
        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
          Update Channel
        </label>
        <div className="flex gap-2">
          {(["stable", "beta", "nightly"] as const).map((channel) => (
            <button
              key={channel}
              onClick={() => update({ updateChannel: channel })}
              className={`rounded px-4 py-2 text-sm capitalize transition-colors ${
                settings.updateChannel === channel
                  ? "bg-[var(--color-accent)] text-white"
                  : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {channel}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={checkForUpdates}
          disabled={checking}
          className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : "Check for Updates"}
        </button>
        {updateStatus && (
          <span className="text-xs text-[var(--color-text-muted)]">{updateStatus}</span>
        )}
      </div>

      {backups.length > 0 && (
        <div className="mt-3">
          <label className="mb-1 block text-xs text-[var(--color-text-muted)]">
            Saved rollback versions ({backups.length})
          </label>
          <div className="space-y-1">
            {backups.map((b) => (
              <div key={b} className="text-xs text-[var(--color-text-secondary)]">
                {b}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function BackupSection() {
  const [status, setStatus] = useState<string | null>(null);
  const [includeHistory, setIncludeHistory] = useState(true);

  const handleExport = async () => {
    const path = await saveFileDialog({
      defaultPath: `apiark-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!path) return;

    try {
      setStatus("Exporting...");
      const result = await exportAppState(path, includeHistory);
      setStatus(`Exported ${result.filesIncluded.length} files to ${result.path}`);
    } catch (e) {
      setStatus(`Export failed: ${e}`);
    }
  };

  const handleImport = async () => {
    const path = await openFileDialog({
      multiple: false,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!path) return;

    if (!confirm("This will merge settings and replace history. Continue?")) return;

    try {
      setStatus("Importing...");
      const result = await importAppState(path);
      const parts = [...result.filesRestored];
      if (result.historyEntries) parts.push(`history (${result.historyEntries})`);
      setStatus(`Restored: ${parts.join(", ")}. Restart app to apply.`);
    } catch (e) {
      setStatus(`Import failed: ${e}`);
    }
  };

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Backup
      </h3>

      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm text-[var(--color-text-secondary)]">
          Include history in export
        </label>
        <button
          role="switch"
          aria-checked={includeHistory}
          onClick={() => setIncludeHistory(!includeHistory)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
            includeHistory ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
              includeHistory ? "translate-x-4.5" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        >
          <Download className="h-3.5 w-3.5" />
          Export App State
        </button>
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        >
          <Upload className="h-3.5 w-3.5" />
          Import App State
        </button>
      </div>

      {status && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{status}</p>
      )}
    </section>
  );
}

function FilePathInput({
  value,
  onChange,
  placeholder,
  filters,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  filters: { name: string; extensions: string[] }[];
}) {
  const browse = async () => {
    const selected = await openFileDialog({
      multiple: false,
      filters,
    });
    if (selected) {
      onChange(selected);
    }
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
      />
      <button
        onClick={browse}
        className="rounded bg-[var(--color-elevated)] px-2 py-1.5 text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        title="Browse..."
      >
        <FolderOpen className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToggleSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
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
  );
}
