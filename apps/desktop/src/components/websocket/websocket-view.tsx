import { useState, useRef, useEffect } from "react";
import { useActiveTab } from "@/stores/tab-store";
import { useTabStore } from "@/stores/tab-store";
import { useWebSocket } from "@/hooks/use-websocket";
import { KeyValueEditor } from "@/components/request/key-value-editor";
import { Send, Plug, Unplug, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronRight } from "lucide-react";
import { Breadcrumb } from "@/components/layout/breadcrumb";
import { UrlBar } from "@/components/request/url-bar";

export function WebSocketView() {
  const tab = useActiveTab();
  const { setHeaders } = useTabStore();
  const [messageInput, setMessageInput] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [showHeaders, setShowHeaders] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  const connectionId = tab?.id ?? "";
  const { status, messages, error, connect, send, disconnect, clearMessages } =
    useWebSocket(connectionId);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  if (!tab) return null;

  const handleConnect = () => {
    if (status === "connected") {
      disconnect();
    } else {
      connect(tab.url, tab.headers.filter((h) => h.key.trim() && h.enabled));
    }
  };

  const handleSend = () => {
    if (!messageInput.trim() || status !== "connected") return;
    send(messageInput);
    setMessageInput("");
  };

  const sentCount = messages.filter((m) => m.direction === "sent").length;
  const receivedCount = messages.filter((m) => m.direction === "received").length;

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <Breadcrumb />
      <UrlBar
        urlDisabled={status === "connected"}
        extraActions={
          <div className="flex items-center gap-1">
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
        }
        sendButton={
          <button
            onClick={handleConnect}
            disabled={status === "connecting" || !tab.url.trim()}
            className={`flex items-center gap-1.5 rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50 ${
              status === "connected"
                ? "bg-red-600 hover:bg-red-700"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {status === "connected" ? (
              <>
                <Unplug className="h-4 w-4" />
                Disconnect
              </>
            ) : (
              <>
                <Plug className="h-4 w-4" />
                {status === "connecting" ? "Connecting..." : "Connect"}
              </>
            )}
          </button>
        }
      />

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

      {/* Error */}
      {error && (
        <div className="border-b border-[var(--color-border)] bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Message input */}
      <div className="flex items-end gap-2 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
        <textarea
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          placeholder={status === "connected" ? "Type a message..." : "Connect first to send messages"}
          disabled={status !== "connected"}
          className="flex-1 resize-none rounded bg-[var(--color-elevated)] p-2 font-mono text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-50"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <button
          onClick={handleSend}
          disabled={status !== "connected" || !messageInput.trim()}
          className="flex items-center gap-1 rounded bg-cyan-600 px-3 py-2 text-sm font-medium text-white hover:bg-cyan-700 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          Send
        </button>
      </div>

      {/* Stats bar */}
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text-muted)]">
        <div className="flex gap-3">
          <span>Messages: {messages.length}</span>
          <span className="text-green-500">Sent: {sentCount}</span>
          <span className="text-blue-500">Received: {receivedCount}</span>
        </div>
        <div className="flex items-center gap-2">
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
            onClick={clearMessages}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-[var(--color-elevated)]"
            title="Clear log"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Message log */}
      <div ref={logRef} className="flex-1 overflow-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center py-8 text-sm text-[var(--color-text-dimmed)]">
            {status === "connected" ? "No messages yet" : "Connect to start"}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 border-b border-[var(--color-border)] px-3 py-2 text-sm ${
                msg.direction === "sent"
                  ? "bg-green-500/5"
                  : "bg-blue-500/5"
              }`}
            >
              <div className="shrink-0 pt-0.5">
                {msg.direction === "sent" ? (
                  <ArrowUp className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-blue-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <pre className="whitespace-pre-wrap break-all font-mono text-xs text-[var(--color-text-primary)]">
                  {msg.content}
                </pre>
              </div>
              <div className="shrink-0 text-right text-[10px] text-[var(--color-text-dimmed)]">
                <div>{new Date(msg.timestamp).toLocaleTimeString()}</div>
                <div>{msg.sizeBytes}B</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
