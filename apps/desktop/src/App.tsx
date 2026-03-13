import { useEffect, useState, useCallback, useRef } from "react";
import { ActivityBar, type ActivityView } from "@/components/layout/activity-bar";
import { SidePanel } from "@/components/layout/side-panel";
import { TabBar } from "@/components/tabs/tab-bar";
import { UrlBar } from "@/components/request/url-bar";
import { RequestPanel } from "@/components/request/request-panel";
import { ResponsePanel } from "@/components/response/response-panel";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { CurlImportDialog } from "@/components/request/curl-import-dialog";
import { CommandPalette } from "@/components/command-palette/command-palette";
import { GraphQLView } from "@/components/graphql/graphql-view";
import { GrpcView } from "@/components/grpc/grpc-view";
import { WebSocketView } from "@/components/websocket/websocket-view";
import { SSEView } from "@/components/sse/sse-view";
import { CollectionRunnerDialog } from "@/components/runner/collection-runner-dialog";
import { ImportDialog } from "@/components/import/import-dialog";
import type { TabProtocol } from "@apiark/types";
import { useTabStore, useActiveTab } from "@/stores/tab-store";
import { useConsoleStore } from "@/stores/console-store";
import { useHistoryStore } from "@/stores/history-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useTheme } from "@/hooks/use-theme";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useFileWatcher } from "@/hooks/use-file-watcher";
import { ResponseDiffDialog } from "@/components/response/response-diff-dialog";
import { MockServerDialog } from "@/components/mock/mock-server-dialog";
import { MonitorDialog } from "@/components/scheduler/monitor-dialog";
import { DocsPreviewDialog } from "@/components/docs/docs-preview-dialog";
import { useDocsStore } from "@/stores/docs-store";
import { useMockStore } from "@/stores/mock-store";
import { useMonitorStore } from "@/stores/monitor-store";
import { WelcomeScreen } from "@/components/onboarding/welcome-screen";
import { GuidedTour } from "@/components/onboarding/guided-tour";
import { BottomPanel } from "@/components/layout/bottom-panel";
import { useCollectionStore } from "@/stores/collection-store";
import { AiAssistantDialog } from "@/components/ai/ai-assistant-dialog";
import { useShortcutsStore } from "@/stores/shortcuts-store";
import { AlertCircle, X, RefreshCw, FileX, GitMerge, Shield, ArrowRightLeft, Download } from "lucide-react";
import { ToastContainer } from "@/components/ui/toast-container";
import * as Dialog from "@radix-ui/react-dialog";
import { useResponsive } from "@/hooks/use-responsive";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { StatusBar } from "@/components/layout/status-bar";
import { PanelDivider } from "@/components/ui/panel-divider";

function App() {
  const { newTab, closeTab, save, send, persistTabs, restoreTabs, undoTab, redoTab } = useTabStore();
  const activeTab = useActiveTab();
  const tabs = useTabStore((s) => s.tabs);
  const activeTabId = useTabStore((s) => s.activeTabId);
  const { loadSettings } = useSettingsStore();
  const settingsLoaded = useSettingsStore((s) => s.loaded);
  const onboardingComplete = useSettingsStore((s) => s.settings.onboardingComplete);
  const [showWelcome, setShowWelcome] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [curlImportOpen, setCurlImportOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [runnerOpen, setRunnerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeView, setActiveView] = useState<ActivityView>("collections");
  const [sidePanelVisible, setSidePanelVisible] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const urlBarRef = useRef<HTMLInputElement>(null);
  const envSelectorRef = useRef<HTMLSelectElement>(null);
  const { isCompact } = useResponsive();

  useTheme();
  useFileWatcher();
  const { autoSaveError } = useAutoSave();

  // Load settings and restore tabs on mount
  useEffect(() => {
    loadSettings();
    restoreTabs();

    // Restore window position/size from persisted state
    import("@/lib/tauri-api").then(async ({ loadPersistedState }) => {
      try {
        const state = await loadPersistedState();
        if (state.windowState) {
          const { x, y, width, height } = state.windowState;
          const { getCurrentWindow, LogicalPosition, LogicalSize } = await import("@tauri-apps/api/window");
          const win = getCurrentWindow();
          await win.setPosition(new LogicalPosition(x, y)).catch(() => {});
          await win.setSize(new LogicalSize(width, height)).catch(() => {});
        }
      } catch { /* ignore */ }
    }).catch(() => {});
  }, [loadSettings, restoreTabs]);

  // Show welcome screen on first run
  useEffect(() => {
    if (settingsLoaded && !onboardingComplete) {
      setShowWelcome(true);
    }
  }, [settingsLoaded, onboardingComplete]);

  // Persist tabs on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => persistTabs(), 500);
    return () => clearTimeout(timer);
  }, [tabs, activeTabId, persistTabs]);

  // Persist tabs on window close — warn about unsaved new tabs
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      persistTabs();
      if (useTabStore.getState().hasUnsavedNewTabs()) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [persistTabs]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const openCurlImport = useCallback(() => setCurlImportOpen(true), []);

  // Toggle side panel when clicking same activity view
  const handleViewChange = useCallback((view: ActivityView) => {
    if (view === activeView && sidePanelVisible) {
      setSidePanelVisible(false);
    } else {
      setActiveView(view);
      setSidePanelVisible(true);
    }
  }, [activeView, sidePanelVisible]);

  // Keyboard shortcuts
  const matchShortcut = useShortcutsStore((s) => s.matchShortcut);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape exits zen mode (not customizable)
      if (e.key === "Escape" && zenMode) {
        e.preventDefault();
        setZenMode(false);
        return;
      }

      const action = matchShortcut(e);
      if (!action) return;

      e.preventDefault();

      switch (action) {
        case "newTab":
          newTab();
          break;
        case "newWindow":
          import("@/lib/tauri-api").then((m) => m.openNewWindow().catch(() => {}));
          break;
        case "closeTab":
          if (activeTab) closeTab(activeTab.id);
          break;
        case "save":
          save();
          break;
        case "send":
          send();
          break;
        case "settings":
          setSettingsOpen(true);
          break;
        case "curlImport":
          setCurlImportOpen(true);
          break;
        case "commandPalette":
          setCommandPaletteOpen(true);
          break;
        case "focusUrl":
          urlBarRef.current?.focus();
          break;
        case "focusEnv":
          envSelectorRef.current?.focus();
          break;
        case "toggleSidebar":
          setSidePanelVisible((prev) => !prev);
          break;
        case "toggleZen":
          setZenMode((prev) => !prev);
          break;
        case "toggleTerminal":
          setTerminalOpen((p) => !p);
          break;
        case "undo":
          undoTab();
          break;
        case "redo":
          redoTab();
          break;
        case "aiAssistant":
          setAiOpen(true);
          break;
        case "toggleConsole":
          useConsoleStore.getState().toggle();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [newTab, closeTab, save, send, undoTab, redoTab, activeTab, zenMode, matchShortcut]);

  // Listen for terminal toggle from command palette
  useEffect(() => {
    const handler = () => setTerminalOpen((p) => !p);
    window.addEventListener("apiark:toggle-terminal", handler);
    return () => window.removeEventListener("apiark:toggle-terminal", handler);
  }, []);

  // Refresh history when a request completes
  useEffect(() => {
    if (activeTab && !activeTab.loading && (activeTab.response || activeTab.error)) {
      useHistoryStore.getState().loadHistory();
    }
  }, [activeTab?.loading, activeTab?.response, activeTab?.error]);

  if (showWelcome) {
    return (
      <WelcomeScreen
        onComplete={(startTour?: boolean) => {
          setShowWelcome(false);
          if (startTour) setShowTour(true);
        }}
        onOpenImport={() => {
          setShowWelcome(false);
          setImportOpen(true);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <a href="#main-content" className="sr-skip-link">Skip to content</a>
      {/* Update available banner */}
      <UpdateBanner />

      {/* Crash report opt-in banner */}
      <CrashReportBanner />

      {/* Auto-save error banner */}
      {autoSaveError && (
        <div className="flex items-center gap-2 bg-[var(--color-error)]/10 px-4 py-2 text-sm text-[var(--color-error)]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">Auto-save failed: {autoSaveError}</span>
          <button
            onClick={() => useTabStore.getState().autoSave()}
            className="rounded-md bg-[var(--color-error)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-error)]/30"
          >
            Retry
          </button>
          <button
            onClick={() => useTabStore.getState().clearAutoSaveError()}
            className="rounded p-0.5 hover:bg-[var(--color-error)]/20"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* File conflict banner */}
      {activeTab?.conflictState && (
        <ConflictBanner tabId={activeTab.id} conflictState={activeTab.conflictState} />
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Activity Bar */}
        {!zenMode && (
          <ActivityBar
            activeView={activeView}
            onViewChange={handleViewChange}
            onOpenSettings={openSettings}
            onOpenAi={() => setAiOpen(true)}
            onToggleConsole={() => useConsoleStore.getState().toggle()}
          />
        )}

        {/* Side Panel */}
        {!zenMode && sidePanelVisible && !isCompact && (
          <SidePanel
            activeView={activeView}
            envSelectorRef={envSelectorRef}
            onOpenMock={() => useMockStore.getState().openDialog()}
            onOpenMonitor={() => useMonitorStore.getState().openDialog()}
            onOpenDocs={() => {
              const collections = useCollectionStore.getState().collections;
              if (collections.length === 0) {
                import("@/stores/toast-store").then(({ useToastStore }) =>
                  useToastStore.getState().showError("Open a collection first to generate documentation."),
                );
                return;
              }
              useDocsStore.getState().openDocs(collections[0].path, collections[0].name);
            }}
          />
        )}

        {/* Main Panel */}
        <main id="main-content" className="flex flex-1 flex-col overflow-hidden bg-[var(--color-card)]" role="main">
          {/* Tab Bar */}
          {!zenMode && <TabBar />}

          {activeTab ? (
            <ProtocolView protocol={activeTab.protocol} urlBarRef={urlBarRef} />
          ) : (
            <EmptyState />
          )}
        </main>
      </div>

      {/* Bottom panel (Console + Terminal) */}
      {!zenMode && (
        <BottomPanel
          terminalOpen={terminalOpen}
          onTerminalOpenChange={setTerminalOpen}
        />
      )}

      {/* Status bar */}
      {!zenMode && (
        <StatusBar
          terminalOpen={terminalOpen}
          onToggleTerminal={() => setTerminalOpen((p) => !p)}
        />
      )}

      {/* Zen mode indicator */}
      {zenMode && (
        <div className="absolute left-1/2 top-3 z-50 -translate-x-1/2 animate-fade-in rounded-lg bg-[var(--color-elevated)] px-3 py-1 text-xs text-[var(--color-text-dimmed)] opacity-60">
          Zen Mode — Press Esc to exit
        </div>
      )}

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      <CurlImportDialog open={curlImportOpen} onOpenChange={setCurlImportOpen} />
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        onOpenSettings={openSettings}
        onOpenCurlImport={openCurlImport}
        onOpenRunner={() => setRunnerOpen(true)}
        onOpenImport={() => setImportOpen(true)}
        onToggleZen={() => setZenMode((p) => !p)}
      />
      <CollectionRunnerDialog open={runnerOpen} onOpenChange={setRunnerOpen} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} />
      <AiAssistantDialog open={aiOpen} onOpenChange={setAiOpen} />
      <ResponseDiffDialog />
      <MockServerDialog />
      <MonitorDialog />
      <DocsDialogWrapper />
      {showTour && <GuidedTour onComplete={() => setShowTour(false)} />}
      <MigrationDialog />
      <ToastContainer />
    </div>
  );
}

function DocsDialogWrapper() {
  const { open, collectionPath, collectionName, closeDocs } = useDocsStore();
  return (
    <DocsPreviewDialog
      open={open}
      onOpenChange={(v) => { if (!v) closeDocs(); }}
      collectionPath={collectionPath}
      collectionName={collectionName}
    />
  );
}

function ProtocolView({
  protocol,
  urlBarRef,
}: {
  protocol: TabProtocol;
  urlBarRef: React.RefObject<HTMLInputElement | null>;
}) {
  const { isCompact } = useResponsive();
  const panelRatio = useSettingsStore((s) => s.settings.panelRatio);
  const layout = useSettingsStore((s) => s.settings.layout);
  const { updateSettings } = useSettingsStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const requestPanelRef = useRef<HTMLDivElement>(null);
  const [tabbedActivePanel, setTabbedActivePanel] = useState<"request" | "response">("request");

  const isTabbed = layout === "tabbed";
  const isVertical = isCompact || layout === "vertical";

  const handleResizeEnd = useCallback(
    (ratio: number) => {
      updateSettings({ panelRatio: Math.round(ratio * 100) / 100 });
    },
    [updateSettings],
  );

  const handleDoubleClick = useCallback(() => {
    // Reset to 50/50 — update DOM immediately + persist
    const panel = requestPanelRef.current;
    if (panel) {
      if (isVertical) panel.style.height = "50%";
      else panel.style.width = "50%";
    }
    updateSettings({ panelRatio: 0.5 });
  }, [updateSettings, isVertical]);

  switch (protocol) {
    case "graphql":
      return <GraphQLView />;
    case "grpc":
      return <GrpcView />;
    case "websocket":
      return <WebSocketView />;
    case "sse":
      return <SSEView />;
    default:
      return (
        <>
          <Breadcrumb />
          <UrlBar ref={urlBarRef} />
          {isTabbed ? (
            <div className="flex flex-1 flex-col overflow-hidden">
              {/* Tabbed layout panel switcher */}
              <div className="flex shrink-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
                <button
                  onClick={() => setTabbedActivePanel("request")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tabbedActivePanel === "request"
                      ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  Request
                </button>
                <button
                  onClick={() => setTabbedActivePanel("response")}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    tabbedActivePanel === "response"
                      ? "border-b-2 border-[var(--color-accent)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                  }`}
                >
                  Response
                </button>
              </div>
              <div className="flex flex-1 flex-col overflow-hidden">
                {tabbedActivePanel === "request" ? (
                  <div data-tour="request-panel" className="flex flex-1 flex-col overflow-hidden">
                    <RequestPanel />
                  </div>
                ) : (
                  <div data-tour="response-panel" className="flex flex-1 flex-col overflow-hidden">
                    <ResponsePanel />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div
              ref={containerRef}
              className={`flex flex-1 overflow-hidden ${isVertical ? "flex-col" : "flex-row"}`}
            >
              <div
                ref={requestPanelRef}
                data-tour="request-panel"
                className="flex shrink-0 flex-col overflow-hidden"
                style={isVertical
                  ? { height: `${panelRatio * 100}%` }
                  : { width: `${panelRatio * 100}%` }
                }
              >
                <RequestPanel />
              </div>
              <PanelDivider
                direction={isVertical ? "vertical" : "horizontal"}
                containerRef={containerRef}
                panelRef={requestPanelRef}
                onResizeEnd={handleResizeEnd}
                onDoubleClick={handleDoubleClick}
              />
              <div
                data-tour="response-panel"
                className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
              >
                <ResponsePanel />
              </div>
            </div>
          )}
        </>
      );
  }
}

function EmptyState() {
  const { newTab, newGraphQLTab, newWebSocketTab } = useTabStore();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      {/* Logo */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-accent)] shadow-lg">
        <ArrowRightLeft className="h-8 w-8 text-white" />
      </div>

      <div className="text-center">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">
          Ready to build something?
        </h2>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          Create a new request or open a collection to get started
        </p>
      </div>

      <div className="flex gap-3">
        <button
          onClick={newTab}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-[var(--color-accent-hover)] active:scale-[0.98]"
        >
          HTTP Request
        </button>
        <button
          onClick={newGraphQLTab}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-card-hover)] active:scale-[0.98]"
        >
          GraphQL
        </button>
        <button
          onClick={newWebSocketTab}
          className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-5 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] transition-all hover:bg-[var(--color-card-hover)] active:scale-[0.98]"
        >
          WebSocket
        </button>
      </div>

      <p className="text-xs text-[var(--color-text-dimmed)]">
        <kbd className="rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-1.5 py-0.5 text-[10px]">
          Ctrl+N
        </kbd>{" "}
        new request{" "}
        <kbd className="ml-2 rounded border border-[var(--color-border)] bg-[var(--color-elevated)] px-1.5 py-0.5 text-[10px]">
          Ctrl+K
        </kbd>{" "}
        command palette
      </p>
    </div>
  );
}

function UpdateBanner() {
  const [update, setUpdate] = useState<{ version: string; install: () => Promise<void> } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const checkUpdate = async () => {
      try {
        const { check } = await import("@tauri-apps/plugin-updater");
        const result = await check();
        if (result && !cancelled) {
          setUpdate({
            version: result.version,
            install: async () => {
              setInstalling(true);
              setStatus("Backing up current version...");
              try {
                const { backupCurrentBinary } = await import("@/lib/tauri-api");
                await backupCurrentBinary().catch(() => {});
              } catch { /* ignore */ }
              setStatus("Downloading update...");
              let totalSize = 0;
              let downloaded = 0;
              await result.downloadAndInstall((p) => {
                if (p.event === "Started" && p.data.contentLength) {
                  totalSize = p.data.contentLength;
                  setStatus(`Downloading... (${(totalSize / 1024 / 1024).toFixed(1)} MB)`);
                } else if (p.event === "Progress" && p.data.chunkLength) {
                  downloaded += p.data.chunkLength;
                  if (totalSize > 0) setProgress(Math.round((downloaded / totalSize) * 100));
                } else if (p.event === "Finished") {
                  setProgress(100);
                  setStatus("Download complete. Restart to apply.");
                }
              });
              setStatus("Update installed! Restart the app to apply.");
            },
          });
        }
      } catch {
        // Silently fail — don't bother the user if update check fails
      }
    };

    const timer = setTimeout(checkUpdate, 5000);
    const interval = setInterval(checkUpdate, 6 * 60 * 60 * 1000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  if (!update || dismissed) return null;

  const isFinished = status?.includes("Restart");

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && !installing) setDismissed(true); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl focus:outline-none">
          <div className="p-6">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent)]/15">
                <Download className="h-5 w-5 text-[var(--color-accent)]" />
              </div>
              <div>
                <Dialog.Title className="text-base font-semibold text-[var(--color-text-primary)]">
                  Update Available
                </Dialog.Title>
                <p className="text-sm text-[var(--color-text-secondary)]">
                  ApiArk v{update.version} is ready
                </p>
              </div>
            </div>

            {status && (
              <div className="mb-4">
                <p className="mb-2 text-sm text-[var(--color-text-secondary)]">{status}</p>
                {installing && !isFinished && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-border)]">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-300"
                      style={{ width: `${progress || 5}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              {!installing && (
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg px-4 py-2 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]"
                >
                  Later
                </button>
              )}
              {!installing && !isFinished && (
                <button
                  onClick={async () => {
                    try {
                      await update.install();
                    } catch (e) {
                      setStatus(`Update failed: ${e}`);
                      setInstalling(false);
                    }
                  }}
                  className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Update Now
                </button>
              )}
              {isFinished && (
                <button
                  onClick={async () => {
                    try {
                      const { relaunch } = await import("@tauri-apps/plugin-shell");
                      await relaunch();
                    } catch { /* fallback */ }
                  }}
                  className="rounded-lg bg-[var(--color-success)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <RefreshCw className="mr-1.5 inline h-3.5 w-3.5" />
                  Restart Now
                </button>
              )}
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function CrashReportBanner() {
  const { settings, updateSettings } = useSettingsStore();
  if (settings.crashReportsEnabled !== null) return null;

  return (
    <div className="flex items-center gap-2 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-accent)]">
      <Shield className="h-4 w-4 shrink-0" />
      <span className="flex-1">
        Help improve ApiArk by sending anonymous crash reports? No request data is ever included.
      </span>
      <button
        onClick={() => updateSettings({ crashReportsEnabled: true })}
        className="rounded-md bg-[var(--color-accent)]/20 px-3 py-0.5 text-xs font-medium hover:bg-[var(--color-accent)]/30"
      >
        Enable
      </button>
      <button
        onClick={() => updateSettings({ crashReportsEnabled: false })}
        className="rounded-md bg-[var(--color-accent)]/20 px-3 py-0.5 text-xs font-medium hover:bg-[var(--color-accent)]/30"
      >
        No thanks
      </button>
    </div>
  );
}

function ConflictBanner({ tabId, conflictState }: { tabId: string; conflictState: "external-change" | "deleted" | "merge-conflict" }) {
  const { reloadFromDisk, dismissConflict, closeTab } = useTabStore();

  if (conflictState === "merge-conflict") {
    return (
      <div className="flex items-center gap-2 bg-[var(--color-warning)]/10 px-4 py-2 text-sm text-[var(--color-warning)]">
        <GitMerge className="h-4 w-4 shrink-0" />
        <span className="flex-1">
          This file has Git merge conflicts. Please resolve them in your editor or Git tool, then reload.
        </span>
        <button onClick={() => reloadFromDisk(tabId)} className="rounded-md bg-[var(--color-warning)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-warning)]/30">Reload</button>
        <button onClick={() => closeTab(tabId)} className="rounded-md bg-[var(--color-warning)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-warning)]/30">Close</button>
      </div>
    );
  }

  if (conflictState === "deleted") {
    return (
      <div className="flex items-center gap-2 bg-[var(--color-warning)]/10 px-4 py-2 text-sm text-[var(--color-warning)]">
        <FileX className="h-4 w-4 shrink-0" />
        <span className="flex-1">This file was deleted externally.</span>
        <button onClick={() => closeTab(tabId)} className="rounded-md bg-[var(--color-warning)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-warning)]/30">Close</button>
        <button onClick={() => dismissConflict(tabId)} className="rounded p-0.5 hover:bg-[var(--color-warning)]/20"><X className="h-3.5 w-3.5" /></button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 bg-[var(--color-accent)]/10 px-4 py-2 text-sm text-[var(--color-accent)]">
      <RefreshCw className="h-4 w-4 shrink-0" />
      <span className="flex-1">This file was changed externally.</span>
      <button onClick={() => reloadFromDisk(tabId)} className="rounded-md bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-accent)]/30">Reload</button>
      <button onClick={() => dismissConflict(tabId)} className="rounded-md bg-[var(--color-accent)]/20 px-2 py-0.5 text-xs hover:bg-[var(--color-accent)]/30">Keep Mine</button>
      <button onClick={() => dismissConflict(tabId)} className="rounded p-0.5 hover:bg-[var(--color-accent)]/20"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

function MigrationDialog() {
  const { migrationPrompt, dismissMigration, acceptMigration, openReadOnly } =
    useCollectionStore();

  if (!migrationPrompt) return null;
  const { status } = migrationPrompt;

  return (
    <Dialog.Root open onOpenChange={(open) => !open && dismissMigration()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl focus:outline-none">
          <div className="border-b border-[var(--color-border)] px-6 py-4">
            <Dialog.Title className="text-base font-semibold text-[var(--color-text-primary)]">
              {status.isNewer ? "Newer Collection Format" : "Collection Format Upgrade"}
            </Dialog.Title>
          </div>
          <div className="space-y-3 px-6 py-4">
            {status.isNewer ? (
              <p className="text-sm text-[var(--color-text-secondary)]">
                This collection uses format v{status.collectionVersion}, but this
                version of ApiArk only supports up to v{status.currentVersion}.
                You can open it in read-only mode.
              </p>
            ) : (
              <p className="text-sm text-[var(--color-text-secondary)]">
                This collection uses format v{status.collectionVersion}. The
                current version is v{status.currentVersion}. Would you like to
                upgrade?
              </p>
            )}
            {!status.isNewer && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Tip: commit your collection to Git before upgrading so you can
                revert if needed.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 border-t border-[var(--color-border)] px-6 py-3">
            <button onClick={dismissMigration} className="rounded-lg px-3 py-1.5 text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-elevated)]">Cancel</button>
            <button onClick={openReadOnly} className="rounded-lg bg-[var(--color-elevated)] px-3 py-1.5 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-border)]">Open Read-Only</button>
            {!status.isNewer && (
              <button onClick={acceptMigration} className="rounded-lg bg-[var(--color-accent)] px-3 py-1.5 text-sm text-white hover:brightness-110">Upgrade</button>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default App;
