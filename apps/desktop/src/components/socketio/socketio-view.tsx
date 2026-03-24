import { useState, useRef, useEffect } from "react";
import { useActiveTab } from "@/stores/tab-store";
import { useTabStore } from "@/stores/tab-store";
import { useSocketIo, type SioEvent } from "@/hooks/use-socketio";
import { KeyValueEditor } from "@/components/request/key-value-editor";
import {
  Send,
  Plug,
  Unplug,
  Trash2,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";

export function SocketIoView() {
  const tab = useActiveTab();
  const { setHeaders } = useTabStore();
  const connectionId = tab?.id ?? "";

  const { status, events, error, serverInfo, connect, emit, disconnect, clearEvents } =
    useSocketIo(connectionId);

  // Connection
  const [url, setUrl] = useState("http://localhost:3000");
  const [namespace, setNamespace] = useState("/");
  const [showHeaders, setShowHeaders] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Emit
  const [eventName, setEventName] = useState("");
  const [eventArgs, setEventArgs] = useState("");

  // Listeners
  const [listenFilter, setListenFilter] = useState("");

  // UI
  const [autoScroll, setAutoScroll] = useState(true);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events, autoScroll]);

  if (!tab) return null;

  const handleConnect = () => {
    if (status === "connected") {
      disconnect();
    } else {
      const headers = tab.headers.filter((h) => h.key.trim() && h.enabled);
      connect(url, namespace, headers);
    }
  };

  const handleEmit = () => {
    if (!eventName.trim() || status !== "connected") return;
    emit(eventName.trim(), eventArgs);
    setEventArgs("");
  };

  const filteredEvents = listenFilter
    ? events.filter((e) => e.eventName.includes(listenFilter))
    : events;

  const sentCount = events.filter((e) => e.direction === "sent").length;
  const receivedCount = events.filter((e) => e.direction === "received").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Breadcrumb />

      {/* Connection bar */}
      <div className="flex items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <span className="rounded bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-bold text-pink-400">
          SIO
        </span>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="http://localhost:3000"
          disabled={status === "connected"}
          className="flex-1 rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
        />
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--color-text-dimmed)]">ns:</span>
          <input
            type="text"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            placeholder="/"
            disabled={status === "connected"}
            className="w-24 rounded bg-[var(--color-elevated)] px-2 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "connected"
                ? "bg-green-500"
                : status === "connecting"
                  ? "bg-yellow-500 animate-pulse"
                  : "bg-gray-500"
            }`}
          />
          <span className="text-xs text-[var(--color-text-muted)] capitalize">{status}</span>
        </div>
        <button
          onClick={handleConnect}
          disabled={status === "connecting" || !url.trim()}
          className={`flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-50 ${
            status === "connected"
              ? "bg-red-600 hover:bg-red-700"
              : "bg-pink-600 hover:bg-pink-700"
          }`}
        >
          {status === "connected" ? (
            <>
              <Unplug className="h-3.5 w-3.5" />
              Disconnect
            </>
          ) : (
            <>
              <Plug className="h-3.5 w-3.5" />
              {status === "connecting" ? "Connecting..." : "Connect"}
            </>
          )}
        </button>
      </div>

      {/* Headers (collapsible) */}
      <div className="border-b border-[var(--color-border)]">
        <button
          onClick={() => setShowHeaders(!showHeaders)}
          className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
        >
          {showHeaders ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          Headers
          {tab.headers.filter((h) => h.key.trim()).length > 0 && (
            <span className="text-[10px]">({tab.headers.filter((h) => h.key.trim()).length})</span>
          )}
        </button>
        {showHeaders && (
          <div className="px-3 pb-2">
            <KeyValueEditor
              pairs={tab.headers}
              onChange={setHeaders}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
            />
          </div>
        )}
      </div>

      {/* Server info (collapsible, shown when connected) */}
      {serverInfo && (
        <div className="border-b border-[var(--color-border)]">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex w-full items-center gap-1 px-3 py-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
          >
            {showSettings ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            Server Info
          </button>
          {showSettings && (
            <div className="flex gap-4 px-3 pb-2 text-xs text-[var(--color-text-muted)]">
              <span>SID: <code className="text-[var(--color-text-secondary)]">{serverInfo.sid}</code></span>
              <span>Ping: {serverInfo.pingInterval}ms</span>
              <span>Timeout: {serverInfo.pingTimeout}ms</span>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="border-b border-[var(--color-border)] bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Emit panel */}
      <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] p-2">
        <div className="mb-1.5 text-[10px] font-medium uppercase text-[var(--color-text-dimmed)]">
          Emit Event
        </div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <input
            type="text"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            placeholder="Event name (e.g. message, chat)"
            disabled={status !== "connected"}
            className="flex-1 rounded bg-[var(--color-elevated)] px-2.5 py-1.5 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
          />
        </div>
        <div className="flex items-end gap-1.5">
          <textarea
            value={eventArgs}
            onChange={(e) => setEventArgs(e.target.value)}
            placeholder='Arguments (JSON) e.g. "hello" or {"msg": "hi"} or ["a", 1]'
            disabled={status !== "connected"}
            className="flex-1 resize-none rounded bg-[var(--color-elevated)] p-2 font-mono text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-pink-500 disabled:opacity-50"
            rows={2}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                handleEmit();
              }
            }}
          />
          <button
            onClick={handleEmit}
            disabled={status !== "connected" || !eventName.trim()}
            className="flex items-center gap-1 rounded bg-pink-600 px-3 py-2 text-sm font-medium text-white hover:bg-pink-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" />
            Emit
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
        <div className="flex items-center gap-3">
          <span>Events: {events.length}</span>
          <span className="text-green-500">Emitted: {sentCount}</span>
          <span className="text-blue-500">Received: {receivedCount}</span>
          {namespace !== "/" && (
            <span className="text-pink-400">Namespace: {namespace}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={listenFilter}
            onChange={(e) => setListenFilter(e.target.value)}
            placeholder="Filter events..."
            className="w-36 rounded bg-[var(--color-elevated)] px-2 py-0.5 text-xs text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none"
          />
          <label className="flex items-center gap-1 cursor-pointer">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="h-3 w-3"
            />
            Auto-scroll
          </label>
          <button
            onClick={clearEvents}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--color-elevated)]"
            title="Clear log"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Event log */}
      <div ref={logRef} className="flex-1 overflow-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-dimmed)]">
            {status === "connected" ? "No events yet — emit or listen" : "Connect to start"}
          </div>
        ) : (
          filteredEvents.map((evt, i) => (
            <EventRow key={i} event={evt} />
          ))
        )}
      </div>
    </div>
  );
}

function EventRow({ event }: { event: SioEvent }) {
  return (
    <div
      className={`flex gap-2 border-b border-[var(--color-border)] px-3 py-2 text-sm ${
        event.direction === "sent" ? "bg-green-500/5" : "bg-blue-500/5"
      }`}
    >
      <div className="shrink-0 pt-0.5">
        {event.direction === "sent" ? (
          <ArrowUp className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="rounded bg-pink-500/15 px-1.5 py-0.5 text-[10px] font-medium text-pink-400">
            {event.eventName}
          </span>
          {event.namespace !== "/" && (
            <span className="text-[10px] text-[var(--color-text-dimmed)]">
              {event.namespace}
            </span>
          )}
        </div>
        {event.args && (
          <pre className="whitespace-pre-wrap break-all font-mono text-xs text-[var(--color-text-primary)]">
            {event.args}
          </pre>
        )}
      </div>
      <div className="shrink-0 text-[10px] text-[var(--color-text-dimmed)]">
        {new Date(event.timestamp).toLocaleTimeString()}
      </div>
    </div>
  );
}
