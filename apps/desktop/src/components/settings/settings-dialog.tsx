import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X, FolderOpen, Download, Upload, RefreshCw, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LANGUAGES } from "@/lib/i18n";
import { useSettingsStore } from "@/stores/settings-store";
import {
  useShortcutsStore,
  SHORTCUT_ACTIONS,
  formatBindingParts,
  bindingFromKeyboardEvent,
} from "@/stores/shortcuts-store";
import type { AppSettings } from "@apiark/types";
import { open as openFileDialog, save as saveFileDialog } from "@tauri-apps/plugin-dialog";
import { exportAppState, importAppState } from "@/lib/tauri-api";
import { tokenSwatchGroups } from "@/styles/tokens";

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { settings, updateSettings } = useSettingsStore();
  const { t, i18n } = useTranslation();

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
              {t("settings.title")}
            </Dialog.Title>
            <Dialog.Close className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-primary)]">
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          <div className="space-y-6 p-6">
            {/* Appearance Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t("settings.appearance")}
              </h3>

              {/* Theme */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.theme")}
                </label>
                <div className="flex gap-2">
                  {(["system", "light", "dark", "black"] as const).map((themeOption) => (
                    <button
                      key={themeOption}
                      onClick={() => update({ theme: themeOption })}
                      className={`rounded px-4 py-2 text-sm capitalize transition-colors ${
                        settings.theme === themeOption
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {themeOption === "black" ? t("settings.black") : themeOption}
                    </button>
                  ))}
                </div>
              </div>

              {/* Accent Color */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.accentColor")}
                </label>
                <div className="flex gap-2">
                  {([
                    { name: "indigo", color: "#6366f1" },
                    { name: "blue", color: "#3b82f6" },
                    { name: "emerald", color: "#10b981" },
                    { name: "amber", color: "#f59e0b" },
                    { name: "rose", color: "#f43f5e" },
                    { name: "violet", color: "#8b5cf6" },
                    { name: "cyan", color: "#06b6d4" },
                    { name: "orange", color: "#f97316" },
                  ] as const).map((a) => (
                    <button
                      key={a.name}
                      onClick={() => update({ accentColor: a.name })}
                      title={a.name.charAt(0).toUpperCase() + a.name.slice(1)}
                      className={`h-7 w-7 rounded-full transition-all ${
                        settings.accentColor === a.name
                          ? "scale-110 ring-2 ring-offset-2 ring-offset-[var(--color-surface)]"
                          : "hover:scale-110 opacity-70 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: a.color,
                        // Use inline style for ring color since it's dynamic
                        ...(settings.accentColor === a.name ? { ["--tw-ring-color" as string]: a.color } : {}),
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Layout */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.panelLayout")}
                </label>
                <div className="flex gap-2">
                  {([
                    { value: "horizontal" as const, label: t("settings.sideBySide") },
                    { value: "vertical" as const, label: t("settings.stacked") },
                    { value: "tabbed" as const, label: t("settings.tabbed") },
                  ]).map((l) => (
                    <button
                      key={l.value}
                      onClick={() => update({ layout: l.value })}
                      className={`rounded-lg border px-4 py-2 text-sm transition-all ${
                        settings.layout === l.value
                          ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                          : "border-[var(--color-border)] text-[var(--color-text-muted)] hover:border-[var(--color-text-dimmed)]"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sidebar width */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.sidebarWidth")}: {settings.sidebarWidth}px
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

              {/* Language */}
              <div>
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.language")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        i18n.changeLanguage(lang.code);
                        localStorage.setItem("apiark-language", lang.code);
                      }}
                      className={`rounded px-3 py-1.5 text-sm transition-colors ${
                        i18n.language === lang.code
                          ? "bg-[var(--color-accent)] text-white"
                          : "bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
                      }`}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {/* Network Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t("settings.network")}
              </h3>

              {/* SSL Verification */}
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.sslVerification")}
                </label>
                <ToggleSwitch
                  checked={settings.verifySsl}
                  onChange={(v) => update({ verifySsl: v })}
                />
              </div>

              {/* Follow Redirects */}
              <div className="mb-3 flex items-center justify-between">
                <label className="text-sm text-[var(--color-text-secondary)]">
                  {t("settings.followRedirects")}
                </label>
                <ToggleSwitch
                  checked={settings.followRedirects}
                  onChange={(v) => update({ followRedirects: v })}
                />
              </div>

              {/* Timeout */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.timeout")}
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
                  {t("settings.proxyUrl")}
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
                      placeholder={t("settings.proxyUsername")}
                      className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                    <input
                      type="password"
                      value={settings.proxyPassword ?? ""}
                      onChange={(e) => update({ proxyPassword: e.target.value || null })}
                      placeholder={t("settings.proxyPassword")}
                      className="flex-1 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Certificates Section */}
            <section>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                {t("settings.certificates")}
              </h3>

              {/* Custom CA Certificate */}
              <div className="mb-4">
                <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
                  {t("settings.caCert")}
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
                  {t("settings.clientCert")}
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
                  {t("settings.clientKey")}
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
                    {t("settings.pfxPassphrase")}
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

            {/* Keyboard Shortcuts */}
            <KeyboardShortcutsSection />

            {/* Backup Section */}
            <BackupSection />

            {/* Design Tokens Reference */}
            <DesignTokensSection />
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
  const { t } = useTranslation();
  const [checking, setChecking] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Awaited<ReturnType<typeof import("@tauri-apps/plugin-updater").check>> | null>(null);
  const [backups, setBackups] = useState<string[]>([]);
  const [installType, setInstallType] = useState<string | null>(null);

  const loadBackups = async () => {
    try {
      const { listRollbackVersions } = await import("@/lib/tauri-api");
      setBackups(await listRollbackVersions());
    } catch { /* ignore */ }
  };

  const detectInstallType = async () => {
    try {
      const { getInstallType } = await import("@/lib/tauri-api");
      setInstallType(await getInstallType());
    } catch { /* ignore */ }
  };

  const checkForUpdates = async () => {
    setChecking(true);
    setUpdateStatus(null);
    setPendingUpdate(null);
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const result = await check();
      if (result) {
        setPendingUpdate(result);
        setUpdateStatus(`Update available: v${result.version}`);
      } else {
        setUpdateStatus("You're up to date!");
      }
      loadBackups();
    } catch (e) {
      setUpdateStatus(`Check failed: ${e}`);
    } finally {
      setChecking(false);
    }
  };

  const installUpdate = async () => {
    if (!pendingUpdate) return;
    setInstalling(true);
    setUpdateStatus("Backing up current version...");
    try {
      const { backupCurrentBinary } = await import("@/lib/tauri-api");
      await backupCurrentBinary().catch(() => {});

      setUpdateStatus("Downloading update...");
      await pendingUpdate.downloadAndInstall((progress) => {
        if (progress.event === "Started" && progress.data.contentLength) {
          setUpdateStatus(`Downloading... (${(progress.data.contentLength / 1024 / 1024).toFixed(1)} MB)`);
        } else if (progress.event === "Finished") {
          setUpdateStatus("Download complete. Restart to apply.");
        }
      });
      setUpdateStatus("Update installed! Restart the app to apply.");
      setPendingUpdate(null);
      loadBackups();
    } catch (e) {
      setUpdateStatus(`Update failed: ${e}`);
    } finally {
      setInstalling(false);
    }
  };

  // Load backups and detect install type on mount
  useState(() => { loadBackups(); detectInstallType(); });

  const isSystemPackage = installType === "system-package";

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {t("settings.updates")}
      </h3>

      {isSystemPackage && (
        <div className="mb-4 rounded-lg bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 p-3">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Auto-update isn't available for system package installs (.deb/.rpm).
            Use your package manager or download from{" "}
            <a
              href="https://github.com/berbicanes/apiark/releases/latest"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline inline-flex items-center gap-1"
            >
              GitHub Releases <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
      )}

      <div className="mb-4">
        <label className="mb-2 block text-sm text-[var(--color-text-secondary)]">
          {t("settings.updateChannel")}
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

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={checkForUpdates}
          disabled={checking || installing}
          className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)] disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${checking ? "animate-spin" : ""}`} />
          {checking ? "Checking..." : t("settings.checkForUpdates")}
        </button>

        {pendingUpdate && !installing && !isSystemPackage && (
          <button
            onClick={installUpdate}
            className="flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <Download className="h-3.5 w-3.5" />
            Install v{pendingUpdate.version}
          </button>
        )}

        {pendingUpdate && isSystemPackage && (
          <a
            href={`https://github.com/berbicanes/apiark/releases/tag/v${pendingUpdate.version}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded bg-[var(--color-accent)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Download v{pendingUpdate.version}
          </a>
        )}

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
  const { t } = useTranslation();
  const [status, setStatus] = useState<string | null>(null);
  const [includeHistory, setIncludeHistory] = useState(true);
  const [importConfirm, setImportConfirm] = useState<string | null>(null);

  const handleExport = async () => {
    const path = await saveFileDialog({
      defaultPath: `apiark-backup-${new Date().toISOString().slice(0, 10)}.zip`,
      filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
    });
    if (!path) return;

    try {
      setStatus(t("settings.exporting"));
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
    setImportConfirm(path);
  };

  const confirmImport = async () => {
    if (!importConfirm) return;
    setImportConfirm(null);
    try {
      setStatus(t("settings.importing"));
      const result = await importAppState(importConfirm);
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
        {t("settings.backup")}
      </h3>

      <div className="mb-3 flex items-center justify-between">
        <label className="text-sm text-[var(--color-text-secondary)]">
          {t("settings.includeHistory")}
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
          {t("settings.exportState")}
        </button>
        <button
          onClick={handleImport}
          className="flex items-center gap-1.5 rounded bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        >
          <Upload className="h-3.5 w-3.5" />
          {t("settings.importState")}
        </button>
      </div>

      {status && (
        <p className="mt-2 text-xs text-[var(--color-text-muted)]">{status}</p>
      )}

      {/* Import confirmation dialog */}
      <Dialog.Root open={!!importConfirm} onOpenChange={(v) => { if (!v) setImportConfirm(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/50" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-[60] w-80 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-elevated)] p-5 shadow-2xl">
            <Dialog.Title className="mb-2 text-sm font-semibold text-[var(--color-text-primary)]">
              {t("settings.importState")}
            </Dialog.Title>
            <p className="mb-5 text-sm text-[var(--color-text-secondary)]">
              This will merge settings and replace history. Continue?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setImportConfirm(null)}
                className="rounded-lg px-4 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--color-accent-hover)]"
              >
                Import
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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

function DesignTokensSection() {
  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        Design Tokens
      </h3>
      <p className="mb-3 text-xs text-[var(--color-text-dimmed)]">
        Active color palette for the current theme. Useful for theme creators and plugin developers.
      </p>
      <div className="space-y-3">
        {tokenSwatchGroups.map((group) => (
          <div key={group.label}>
            <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-dimmed)]">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {group.swatches.map((swatch) => (
                <div
                  key={swatch.name}
                  className="flex flex-col items-center gap-0.5"
                  title={swatch.value}
                >
                  <div
                    className="h-6 w-6 rounded-full border border-[var(--color-border)]"
                    style={{ backgroundColor: swatch.value }}
                  />
                  <span className="text-[9px] leading-tight text-[var(--color-text-dimmed)]">
                    {swatch.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function KeyboardShortcutsSection() {
  const { t } = useTranslation();
  const { getBinding, setBinding, resetAll, findConflicts } = useShortcutsStore();
  const [recordingId, setRecordingId] = useState<string | null>(null);
  const conflicts = findConflicts();

  const conflictActions = new Set<string>();
  for (const c of conflicts) {
    for (const id of c.actionIds) conflictActions.add(id);
  }

  return (
    <section>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
        {t("settings.shortcuts")}
      </h3>

      {conflicts.length > 0 && (
        <div className="mb-3 rounded bg-[var(--color-warning)]/10 px-3 py-2 text-xs text-[var(--color-warning)]">
          Some shortcuts have conflicting bindings. Only one action will trigger per key combination.
        </div>
      )}

      <div className="space-y-0.5">
        {SHORTCUT_ACTIONS.map((action) => {
          const binding = getBinding(action.id);
          const isRecording = recordingId === action.id;
          const hasConflict = conflictActions.has(action.id);
          const parts = formatBindingParts(binding);

          return (
            <div
              key={action.id}
              className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-[var(--color-elevated)]"
            >
              <span className={`text-xs ${hasConflict ? "text-[var(--color-warning)]" : "text-[var(--color-text-secondary)]"}`}>
                {action.description}
              </span>
              <div className="flex items-center gap-1.5">
                {isRecording ? (
                  <span
                    className="rounded border border-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] text-[var(--color-accent)] animate-pulse"
                    tabIndex={0}
                    ref={(el) => {
                      if (el) {
                        el.focus();
                        const handler = (ev: KeyboardEvent) => {
                          if (ev.key === "Escape") {
                            ev.preventDefault();
                            setRecordingId(null);
                            el.removeEventListener("keydown", handler);
                            return;
                          }
                          const b = bindingFromKeyboardEvent(ev);
                          if (!b) return;
                          ev.preventDefault();
                          ev.stopPropagation();
                          setBinding(action.id, b);
                          setRecordingId(null);
                          el.removeEventListener("keydown", handler);
                        };
                        el.addEventListener("keydown", handler);
                      }
                    }}
                  >
                    Press new shortcut...
                  </span>
                ) : (
                  <div className="flex items-center gap-0.5">
                    {parts.map((part, i) => (
                      <kbd
                        key={i}
                        className={`rounded border px-1.5 py-0.5 font-mono text-[10px] ${
                          hasConflict
                            ? "border-[var(--color-warning)]/50 bg-[var(--color-warning)]/10 text-[var(--color-warning)]"
                            : "border-[var(--color-border)] bg-[var(--color-elevated)] text-[var(--color-text-muted)]"
                        }`}
                      >
                        {part}
                      </kbd>
                    ))}
                  </div>
                )}
                {!isRecording && (
                  <button
                    onClick={() => setRecordingId(action.id)}
                    className="rounded px-1.5 py-0.5 text-[10px] text-[var(--color-text-dimmed)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-secondary)]"
                  >
                    Rebind
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-[10px] text-[var(--color-text-dimmed)]">
          Escape always exits Zen mode (not customizable)
        </span>
        <button
          onClick={resetAll}
          className="flex items-center gap-1 rounded bg-[var(--color-elevated)] px-2.5 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] hover:text-[var(--color-text-primary)]"
        >
          <RefreshCw className="h-3 w-3" />
          Reset to Defaults
        </button>
      </div>
    </section>
  );
}
