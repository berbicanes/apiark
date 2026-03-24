import { useState, useEffect } from "react";
import { useGitStore } from "@/stores/git-store";
import { useCollectionStore } from "@/stores/collection-store";
import {
  GitBranch,
  Plus,
  Minus,
  Check,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Loader2,
  FolderGit2,
  ChevronDown,
  ChevronRight,
  Clock,
} from "lucide-react";

export function GitPanel() {
  const { collections } = useCollectionStore();
  const {
    collectionPath,
    status,
    log,
    loading,
    error,
    setCollection,
    loadStatus,
    stage,
    unstage,
    commit,
    push,
    pull,
    init,
  } = useGitStore();

  const [commitMessage, setCommitMessage] = useState("");
  const [showLog, setShowLog] = useState(false);

  // Auto-select first collection
  useEffect(() => {
    if (!collectionPath && collections.length > 0) {
      setCollection(collections[0].path);
    }
  }, [collections, collectionPath, setCollection]);

  // No collections open
  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <FolderGit2 className="h-8 w-8 text-[var(--color-text-dimmed)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          Open a collection to use Git
        </p>
      </div>
    );
  }

  // Not a git repo
  if (status && !status.isRepo) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
        <FolderGit2 className="h-8 w-8 text-[var(--color-text-dimmed)]" />
        <p className="text-sm text-[var(--color-text-muted)]">
          This collection is not a Git repository
        </p>
        <button
          onClick={() => init()}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
        >
          <GitBranch className="h-3.5 w-3.5" />
          Initialize Git Repo
        </button>
      </div>
    );
  }

  const stagedChanges = status?.changes.filter((c) => c.staged) ?? [];
  const unstagedChanges = status?.changes.filter((c) => !c.staged) ?? [];

  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    await commit(commitMessage.trim());
    setCommitMessage("");
  };

  const handleStageAll = () => {
    const paths = unstagedChanges.map((c) => c.path);
    if (paths.length > 0) stage(paths);
  };

  const handleUnstageAll = () => {
    const paths = stagedChanges.map((c) => c.path);
    if (paths.length > 0) unstage(paths);
  };

  return (
    <div className="flex flex-col gap-2 p-3">
      {/* Collection selector */}
      {collections.length > 1 && (
        <select
          value={collectionPath ?? ""}
          onChange={(e) => setCollection(e.target.value)}
          className="w-full rounded bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] outline-none"
        >
          {collections.map((c) => (
            <option key={c.path} value={c.path}>
              {c.name}
            </option>
          ))}
        </select>
      )}

      {/* Branch & status */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="h-4 w-4 text-orange-400" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">
              {status?.branch || "main"}
            </span>
          </div>
          <button
            onClick={() => loadStatus()}
            disabled={loading}
            className="rounded p-1 text-[var(--color-text-muted)] hover:bg-[var(--color-border)]"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {(status?.ahead ?? 0) > 0 || (status?.behind ?? 0) > 0 ? (
          <div className="mt-1 flex gap-3 text-[10px] text-[var(--color-text-muted)]">
            {(status?.ahead ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <ArrowUp className="h-2.5 w-2.5" /> {status?.ahead} ahead
              </span>
            )}
            {(status?.behind ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <ArrowDown className="h-2.5 w-2.5" /> {status?.behind} behind
              </span>
            )}
          </div>
        ) : null}

        {/* Push / Pull buttons */}
        <div className="mt-2 flex gap-1.5">
          <button
            onClick={() => pull()}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] disabled:opacity-50"
          >
            <ArrowDown className="h-3 w-3" /> Pull
          </button>
          <button
            onClick={() => push()}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] disabled:opacity-50"
          >
            <ArrowUp className="h-3 w-3" /> Push
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Staged changes */}
      {stagedChanges.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase text-green-400">
              Staged ({stagedChanges.length})
            </span>
            <button
              onClick={handleUnstageAll}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Unstage all
            </button>
          </div>
          {stagedChanges.map((change) => (
            <div
              key={change.path}
              className="flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-1.5"
            >
              <StatusIcon status={change.status} />
              <span className="flex-1 truncate text-xs text-[var(--color-text-primary)]">
                {change.path}
              </span>
              <button
                onClick={() => unstage([change.path])}
                className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-red-400"
                title="Unstage"
              >
                <Minus className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Unstaged changes */}
      {unstagedChanges.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)]">
          <div className="flex items-center justify-between px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase text-[var(--color-text-muted)]">
              Changes ({unstagedChanges.length})
            </span>
            <button
              onClick={handleStageAll}
              className="text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
            >
              Stage all
            </button>
          </div>
          {unstagedChanges.map((change) => (
            <div
              key={change.path}
              className="flex items-center gap-2 border-t border-[var(--color-border)] px-3 py-1.5"
            >
              <StatusIcon status={change.status} />
              <span className="flex-1 truncate text-xs text-[var(--color-text-primary)]">
                {change.path}
              </span>
              <button
                onClick={() => stage([change.path])}
                className="rounded p-0.5 text-[var(--color-text-muted)] hover:text-green-400"
                title="Stage"
              >
                <Plus className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Clean state */}
      {status?.isClean && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] px-3 py-4 text-center">
          <Check className="mx-auto h-5 w-5 text-green-500" />
          <p className="mt-1 text-xs text-[var(--color-text-muted)]">
            Working tree clean
          </p>
        </div>
      )}

      {/* Commit box */}
      {stagedChanges.length > 0 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)] p-2">
          <textarea
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Commit message..."
            className="w-full resize-none rounded bg-[var(--color-surface)] px-2 py-1.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-orange-500"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleCommit();
              }
            }}
          />
          <button
            onClick={handleCommit}
            disabled={loading || !commitMessage.trim()}
            className="mt-1.5 flex w-full items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            Commit ({stagedChanges.length} file{stagedChanges.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}

      {/* Log */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-elevated)]">
        <button
          onClick={() => setShowLog(!showLog)}
          className="flex w-full items-center gap-1.5 px-3 py-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          {showLog ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          <Clock className="h-3 w-3" />
          History ({log.length})
        </button>
        {showLog && (
          <div className="max-h-48 overflow-auto">
            {log.map((entry) => (
              <div
                key={entry.hash}
                className="border-t border-[var(--color-border)] px-3 py-1.5"
              >
                <div className="flex items-center gap-2">
                  <code className="text-[10px] text-orange-400">
                    {entry.hash}
                  </code>
                  <span className="flex-1 truncate text-xs text-[var(--color-text-primary)]">
                    {entry.message}
                  </span>
                </div>
                <div className="mt-0.5 text-[10px] text-[var(--color-text-dimmed)]">
                  {entry.author} · {entry.date}
                </div>
              </div>
            ))}
            {log.length === 0 && (
              <div className="border-t border-[var(--color-border)] px-3 py-3 text-center text-xs text-[var(--color-text-dimmed)]">
                No commits yet
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    modified: "text-amber-400",
    added: "text-green-400",
    deleted: "text-red-400",
    renamed: "text-blue-400",
    untracked: "text-gray-400",
  };
  const labels: Record<string, string> = {
    modified: "M",
    added: "A",
    deleted: "D",
    renamed: "R",
    untracked: "?",
  };
  return (
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold ${colors[status] ?? "text-gray-400"}`}
    >
      {labels[status] ?? "?"}
    </span>
  );
}
