import type { ResponseData } from "@apiark/types";

interface TimingPanelProps {
  response: ResponseData;
}

export function TimingPanel({ response }: TimingPanelProps) {
  const totalMs = response.timeMs;

  // We show a visual bar of the total time with size/speed metrics
  const sizeKB = response.sizeBytes / 1024;
  const speedKBps = totalMs > 0 ? (sizeKB / (totalMs / 1000)).toFixed(1) : "—";

  return (
    <div className="space-y-4 p-4">
      {/* Total time */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Response Time
        </h4>
        <div className="flex items-center gap-3">
          <div className="h-6 flex-1 overflow-hidden rounded bg-[var(--color-elevated)]">
            <div
              className="flex h-full items-center rounded px-2 text-xs font-medium text-white"
              style={{
                width: "100%",
                backgroundColor: totalMs < 200 ? "#22c55e" : totalMs < 500 ? "#eab308" : totalMs < 1000 ? "#f97316" : "#ef4444",
              }}
            >
              {totalMs}ms
            </div>
          </div>
        </div>
        <div className="mt-1 text-xs text-[var(--color-text-muted)]">
          {totalMs < 200 ? "Excellent" : totalMs < 500 ? "Good" : totalMs < 1000 ? "Slow" : "Very slow"}
        </div>
      </div>

      {/* Transfer metrics */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Transfer
        </h4>
        <div className="grid grid-cols-2 gap-3">
          <MetricCard label="Response Size" value={formatSize(response.sizeBytes)} />
          <MetricCard label="Transfer Speed" value={`${speedKBps} KB/s`} />
          <MetricCard label="Status" value={`${response.status} ${response.statusText}`} />
          <MetricCard label="Headers" value={`${response.headers.length} headers`} />
        </div>
      </div>

      {/* Time comparison */}
      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          Performance Thresholds
        </h4>
        <div className="space-y-1.5">
          <ThresholdBar label="Fast" threshold={200} actual={totalMs} color="#22c55e" />
          <ThresholdBar label="Acceptable" threshold={500} actual={totalMs} color="#eab308" />
          <ThresholdBar label="Slow" threshold={1000} actual={totalMs} color="#f97316" />
          <ThresholdBar label="Very slow" threshold={2000} actual={totalMs} color="#ef4444" />
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-[var(--color-elevated)] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[var(--color-text-muted)]">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">{value}</div>
    </div>
  );
}

function ThresholdBar({
  label,
  threshold,
  actual,
  color,
}: {
  label: string;
  threshold: number;
  actual: number;
  color: string;
}) {
  const passed = actual <= threshold;
  return (
    <div className="flex items-center gap-2">
      <span className="w-20 text-xs text-[var(--color-text-secondary)]">{label}</span>
      <span className="w-14 text-xs text-[var(--color-text-muted)]">&lt;{threshold}ms</span>
      <div className="flex-1">
        <div className="h-2 rounded bg-[var(--color-elevated)]">
          <div
            className="h-full rounded transition-all"
            style={{
              width: `${Math.min(100, (actual / threshold) * 100)}%`,
              backgroundColor: passed ? color : "#ef4444",
            }}
          />
        </div>
      </div>
      <span className={`text-xs font-medium ${passed ? "text-green-400" : "text-red-400"}`}>
        {passed ? "PASS" : "FAIL"}
      </span>
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
