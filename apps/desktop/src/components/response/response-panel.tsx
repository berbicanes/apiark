import { useState } from "react";
import { useActiveTab, useTabStore } from "@/stores/tab-store";
import { AlertCircle, ClipboardCopy, Download, Check, ArrowLeftRight, BookmarkPlus } from "lucide-react";
import { useDiffStore } from "@/stores/diff-store";
import { CodeGenerationPanel } from "./code-generation-panel";
import { TestResultsPanel } from "./test-results-panel";
import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { readFullResponse } from "@/lib/tauri-api";
import type { ConsoleEntry } from "@apiark/types";
import { TimingPanel } from "./timing-panel";

type ResponseTab = "body" | "headers" | "cookies" | "tests" | "timing" | "console" | "code";

function statusColor(status: number): string {
  if (status < 200) return "text-blue-400";
  if (status < 300) return "text-green-500";
  if (status < 400) return "text-yellow-500";
  if (status < 500) return "text-red-400";
  return "text-red-500";
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ResponsePanel() {
  const tab = useActiveTab();
  const [activeTab, setActiveTab] = useState<ResponseTab>("body");

  if (!tab) return null;

  const { response, error, loading, testResults, assertionResults, consoleOutput } = tab;

  const hasTestResults = testResults.length > 0 || assertionResults.length > 0;
  const failedCount = (testResults?.filter((t) => !t.passed).length ?? 0) +
    (assertionResults?.filter((a) => !a.passed).length ?? 0);

  // Code generation is always available (doesn't need a response)
  if (activeTab === "code") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResponseTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          response={response}
          hasTestResults={hasTestResults}
          failedCount={failedCount}
          consoleCount={consoleOutput.length}
        />
        <CodeGenerationPanel />
      </div>
    );
  }

  // Tests tab can be shown even without a response (shows empty state)
  if (activeTab === "tests") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResponseTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          response={response}
          hasTestResults={hasTestResults}
          failedCount={failedCount}
          consoleCount={consoleOutput.length}
        />
        <div className="flex-1 overflow-auto p-3">
          <TestResultsPanel
            testResults={testResults}
            assertionResults={assertionResults}
          />
        </div>
      </div>
    );
  }

  // Console tab
  if (activeTab === "console") {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResponseTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          response={response}
          hasTestResults={hasTestResults}
          failedCount={failedCount}
          consoleCount={consoleOutput.length}
        />
        <div className="flex-1 overflow-auto p-3">
          <ConsolePanel entries={consoleOutput} />
        </div>
      </div>
    );
  }

  // Empty state
  if (!response && !error && !loading) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <ResponseTabs
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          response={null}
          hasTestResults={hasTestResults}
          failedCount={failedCount}
          consoleCount={consoleOutput.length}
        />
        <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-dimmed)]">
          Send a request to see the response
        </div>
      </div>
    );
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-muted)]">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
          Sending request...
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center" role="alert">
        <AlertCircle className="h-10 w-10 text-red-500" aria-hidden="true" />
        <div>
          <p className="text-sm font-medium text-red-400">{error.message}</p>
          {error.suggestion && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">{error.suggestion}</p>
          )}
        </div>
      </div>
    );
  }

  if (!response) return null;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Status bar */}
      <div className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2" role="status" aria-live="polite">
        <span className={`text-sm font-semibold ${statusColor(response.status)}`} aria-label={`Response: ${response.status} ${response.statusText}, ${response.status < 300 ? "success" : response.status < 400 ? "redirect" : response.status < 500 ? "client error" : "server error"}`}>
          {response.status} {response.statusText}
        </span>
        <span className="text-xs text-[var(--color-text-muted)]">{response.timeMs}ms</span>
        <span className="text-xs text-[var(--color-text-muted)]">
          {formatSize(response.sizeBytes)}
        </span>
      </div>

      {/* Tabs */}
      <ResponseTabs
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        response={response}
        hasTestResults={hasTestResults}
        failedCount={failedCount}
        consoleCount={consoleOutput.length}
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {activeTab === "body" && (
          <div>
            <ResponseBodyActions body={response.body} />
            {response.truncated && <TruncationBanner response={response} />}
            <pre className="whitespace-pre-wrap break-all font-mono text-sm text-[var(--color-text-primary)]">
              {tryFormatJson(response.body)}
            </pre>
          </div>
        )}

        {activeTab === "headers" && (
          <table className="w-full text-sm">
            <tbody>
              {response.headers.map((h, i) => (
                <tr key={i} className="border-b border-[var(--color-elevated)]">
                  <td className="py-1 pr-4 font-medium text-[var(--color-text-secondary)]">
                    {h.key}
                  </td>
                  <td className="py-1 text-[var(--color-text-primary)]">{h.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === "cookies" && (
          <>
            {response.cookies.length === 0 ? (
              <p className="text-sm text-[var(--color-text-dimmed)]">No cookies</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-[var(--color-text-muted)]">
                    <th className="pb-1 pr-4">Name</th>
                    <th className="pb-1 pr-4">Value</th>
                    <th className="pb-1 pr-4">Domain</th>
                    <th className="pb-1">Path</th>
                  </tr>
                </thead>
                <tbody>
                  {response.cookies.map((c, i) => (
                    <tr key={i} className="border-b border-[var(--color-elevated)]">
                      <td className="py-1 pr-4 font-medium text-[var(--color-text-secondary)]">
                        {c.name}
                      </td>
                      <td className="py-1 pr-4 text-[var(--color-text-primary)]">{c.value}</td>
                      <td className="py-1 pr-4 text-[var(--color-text-muted)]">
                        {c.domain ?? "—"}
                      </td>
                      <td className="py-1 text-[var(--color-text-muted)]">{c.path ?? "/"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {activeTab === "timing" && <TimingPanel response={response} />}
      </div>
    </div>
  );
}

function ResponseBodyActions({ body }: { body: string }) {
  const [copied, setCopied] = useState(false);
  const tab = useActiveTab();
  const { saveSnapshot, open: openDiff } = useDiffStore();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleSave = async () => {
    try {
      const filePath = await save({
        filters: [
          { name: "JSON", extensions: ["json"] },
          { name: "XML", extensions: ["xml"] },
          { name: "Text", extensions: ["txt"] },
          { name: "All Files", extensions: ["*"] },
        ],
      });
      if (filePath) {
        await writeTextFile(filePath, body);
      }
    } catch (err) {
      console.error("Failed to save response:", err);
    }
  };

  return (
    <div className="mb-2 flex gap-1">
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
        title="Copy to clipboard"
      >
        {copied ? <Check className="h-3 w-3 text-green-500" /> : <ClipboardCopy className="h-3 w-3" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <button
        onClick={handleSave}
        className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
        title="Save to file"
      >
        <Download className="h-3 w-3" />
        Save
      </button>
      {tab?.response && (
        <>
          <button
            onClick={() => {
              if (tab.response) {
                saveSnapshot(tab.name || "Response", tab.response);
              }
            }}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            title="Save response for diff comparison"
          >
            <BookmarkPlus className="h-3 w-3" />
            Save for Diff
          </button>
          <button
            onClick={openDiff}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-muted)] hover:bg-[var(--color-elevated)] hover:text-[var(--color-text-secondary)]"
            title="Compare responses"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Compare
          </button>
        </>
      )}
    </div>
  );
}

function ResponseTabs({
  activeTab,
  setActiveTab,
  response,
  hasTestResults,
  failedCount,
  consoleCount,
}: {
  activeTab: ResponseTab;
  setActiveTab: (tab: ResponseTab) => void;
  response: { headers: { key: string; value: string }[]; cookies: { name: string }[] } | null;
  hasTestResults: boolean;
  failedCount: number;
  consoleCount: number;
}) {
  const tabs: { id: ResponseTab; label: string }[] = [
    { id: "body", label: "Body" },
    { id: "headers", label: "Headers" },
    { id: "cookies", label: "Cookies" },
    { id: "tests", label: "Tests" },
    { id: "timing", label: "Timing" },
    { id: "console", label: "Console" },
    { id: "code", label: "Code" },
  ];

  return (
    <div className="flex gap-0 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => setActiveTab(t.id)}
          className={`px-4 py-2 text-sm transition-colors ${
            activeTab === t.id
              ? "border-b-2 border-blue-500 text-[var(--color-text-primary)]"
              : "text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          }`}
        >
          {t.label}
          {t.id === "headers" && response && (
            <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
              ({response.headers.length})
            </span>
          )}
          {t.id === "cookies" && response && response.cookies.length > 0 && (
            <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
              ({response.cookies.length})
            </span>
          )}
          {t.id === "tests" && hasTestResults && (
            <span className={`ml-1 text-xs ${failedCount > 0 ? "text-red-400" : "text-green-500"}`}>
              {failedCount > 0 ? `${failedCount} fail` : "pass"}
            </span>
          )}
          {t.id === "console" && consoleCount > 0 && (
            <span className="ml-1 text-xs text-[var(--color-text-dimmed)]">
              ({consoleCount})
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

function ConsolePanel({ entries }: { entries: ConsoleEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--color-text-dimmed)]">
        No console output. Use <code className="rounded bg-[var(--color-elevated)] px-1">console.log()</code> in scripts.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 font-mono text-sm">
      {entries.map((entry, i) => (
        <div
          key={i}
          className={`rounded px-2 py-1 ${
            entry.level === "error"
              ? "bg-red-500/10 text-red-400"
              : entry.level === "warn"
                ? "bg-yellow-500/10 text-yellow-400"
                : "text-[var(--color-text-primary)]"
          }`}
        >
          <span className="mr-2 text-xs text-[var(--color-text-dimmed)]">
            [{entry.level}]
          </span>
          {entry.message}
        </div>
      ))}
    </div>
  );
}

function TruncationBanner({ response }: { response: { truncated?: boolean; fullSize?: number; tempPath?: string } }) {
  const [loading, setLoading] = useState(false);
  const tab = useActiveTab();

  const handleLoadFull = async () => {
    if (!response.tempPath || !tab) return;
    setLoading(true);
    try {
      const fullBody = await readFullResponse(response.tempPath);
      // Update the tab's response body in-place
      useTabStore.getState().updateResponse(tab.id, { body: fullBody, truncated: false });
    } catch (err) {
      console.error("Failed to load full response:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-2 flex items-center gap-2 rounded bg-yellow-500/10 px-3 py-2 text-xs text-yellow-400">
      <span>
        Response truncated (showing 1 MB of {formatSize(response.fullSize ?? 0)}).
      </span>
      {response.tempPath && (
        <button
          onClick={handleLoadFull}
          disabled={loading}
          className="rounded bg-yellow-500/20 px-2 py-0.5 font-medium hover:bg-yellow-500/30 disabled:opacity-50"
        >
          {loading ? "Loading..." : "Load Full Response"}
        </button>
      )}
    </div>
  );
}

function tryFormatJson(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}
