import { useState, useRef, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  X,
  Send,
  Sparkles,
  FlaskConical,
  Loader2,
  ChevronDown,
  ChevronRight,
  Settings,
  AlertCircle,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { useActiveTab, useTabStore } from "@/stores/tab-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  aiGenerateRequest,
  aiGenerateTests,
  type AiGenerateParams,
  type AiGeneratedRequest,
} from "@/lib/tauri-api";
import type { HttpMethod, KeyValuePair } from "@apiark/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  type?: "request" | "tests" | "chat";
  debug?: {
    model: string;
    endpoint: string;
    durationMs: number;
    prompt: string;
  };
  generatedRequest?: AiGeneratedRequest;
  generatedTests?: { tests: string; assertions: string | null };
  error?: string;
}

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiAssistantDialog({ open, onOpenChange }: AiAssistantDialogProps) {
  const tab = useActiveTab();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const aiEndpoint = useSettingsStore((s) => s.settings.aiEndpoint);
  const aiApiKey = useSettingsStore((s) => s.settings.aiApiKey);
  const aiModel = useSettingsStore((s) => s.settings.aiModel);

  const isConfigured = !!(aiEndpoint && aiApiKey && aiModel);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const getParams = useCallback((): AiGenerateParams => ({
    prompt: "",
    apiKey: aiApiKey ?? "",
    endpoint: aiEndpoint ?? "https://api.openai.com/v1",
    model: aiModel ?? "gpt-4o-mini",
  }), [aiApiKey, aiEndpoint, aiModel]);

  const addMessage = (msg: Omit<ChatMessage, "id" | "timestamp">) => {
    setMessages((prev) => [...prev, {
      ...msg,
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }]);
  };

  const handleGenerateRequest = async () => {
    if (!input.trim() || !isConfigured) return;

    const userPrompt = input.trim();
    setInput("");
    addMessage({ role: "user", content: userPrompt, type: "request" });
    setLoading(true);

    const start = Date.now();
    const params = getParams();
    params.prompt = userPrompt;

    if (tab) {
      params.context = `Current tab: ${tab.method} ${tab.url}`;
    }

    try {
      const result = await aiGenerateRequest(params);
      addMessage({
        role: "assistant",
        content: `Generated **${result.method} ${result.url}**${result.description ? `\n${result.description}` : ""}`,
        type: "request",
        generatedRequest: result,
        debug: {
          model: params.model,
          endpoint: params.endpoint,
          durationMs: Date.now() - start,
          prompt: userPrompt,
        },
      });
    } catch (err) {
      addMessage({
        role: "assistant",
        content: "Failed to generate request",
        error: String(err),
      });
    }
    setLoading(false);
  };

  const handleGenerateTests = async () => {
    if (!isConfigured || !tab?.response) return;

    addMessage({ role: "user", content: "Generate tests for the current response", type: "tests" });
    setLoading(true);

    const start = Date.now();
    const params = getParams();
    params.prompt = "Generate comprehensive tests for this API response";

    const requestYaml = `method: ${tab.method}\nurl: ${tab.url}`;
    const responseBody = tab.response.body ?? "";
    const responseStatus = tab.response.status ?? 200;

    try {
      const result = await aiGenerateTests(params, requestYaml, responseBody, responseStatus);
      addMessage({
        role: "assistant",
        content: "Generated tests for your response:",
        type: "tests",
        generatedTests: result,
        debug: {
          model: params.model,
          endpoint: params.endpoint,
          durationMs: Date.now() - start,
          prompt: `Tests for ${tab.method} ${tab.url} (status ${responseStatus})`,
        },
      });
    } catch (err) {
      addMessage({
        role: "assistant",
        content: "Failed to generate tests",
        error: String(err),
      });
    }
    setLoading(false);
  };

  const applyRequest = (req: AiGeneratedRequest) => {
    const store = useTabStore.getState();
    const headers: KeyValuePair[] = [
      ...Object.entries(req.headers).map(([key, value], i) => ({
        id: `kv_${Date.now()}_${i}`,
        key,
        value,
        enabled: true,
      })),
      { id: `kv_${Date.now()}_empty`, key: "", value: "", enabled: true },
    ];

    store.setMethod(req.method as HttpMethod);
    store.setUrl(req.url);
    store.setHeaders(headers);
    if (req.body) {
      store.setBody({
        type: (req.bodyType as "json" | "raw") ?? "json",
        content: req.body,
        formData: [],
      });
    }
    // Update tab name
    useTabStore.setState((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, name: req.name } : t,
      ),
    }));
  };

  const applyTests = (tests: { tests: string; assertions: string | null }) => {
    const store = useTabStore.getState();
    store.setTestScript(tests.tests);
    if (tests.assertions) {
      store.setAssertions(tests.assertions);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSubmit = () => {
    handleGenerateRequest();
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/30" />
        <Dialog.Content className="fixed right-4 top-16 bottom-16 z-50 flex w-[480px] flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl focus:outline-none">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <Dialog.Title className="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
              <Sparkles className="h-4 w-4 text-purple-400" />
              AI Assistant
            </Dialog.Title>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className={`rounded-lg p-1.5 transition-colors hover:bg-[var(--color-elevated)] ${
                  showConfig ? "text-purple-400" : "text-[var(--color-text-muted)]"
                }`}
                title="Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setMessages([])}
                className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-elevated)]"
                title="Clear chat"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
              <Dialog.Close className="rounded-lg p-1.5 text-[var(--color-text-muted)] transition-colors hover:bg-[var(--color-elevated)]">
                <X className="h-3.5 w-3.5" />
              </Dialog.Close>
            </div>
          </div>

          {/* Config panel */}
          {showConfig && (
            <div className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <span className={`h-2 w-2 rounded-full ${isConfigured ? "bg-green-500" : "bg-red-500"}`} />
                <span className="text-[var(--color-text-muted)]">
                  {isConfigured ? "Connected" : "Not configured"}
                </span>
              </div>
              <p className="text-[var(--color-text-dimmed)]">
                Configure your AI provider in{" "}
                <button
                  onClick={() => {
                    onOpenChange(false);
                    // Open settings
                    window.dispatchEvent(new CustomEvent("apiark:open-settings"));
                  }}
                  className="text-purple-400 hover:underline"
                >
                  Settings → AI
                </button>
              </p>
              {isConfigured && (
                <div className="mt-2 flex gap-3 text-[var(--color-text-dimmed)]">
                  <span>Model: <code className="text-[var(--color-text-secondary)]">{aiModel}</code></span>
                  <span>Endpoint: <code className="text-[var(--color-text-secondary)]">{aiEndpoint?.replace("https://", "")}</code></span>
                </div>
              )}
            </div>
          )}

          {/* Not configured warning */}
          {!isConfigured && messages.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <AlertCircle className="h-8 w-8 text-amber-400" />
              <div>
                <p className="text-sm font-medium text-[var(--color-text-primary)]">
                  Set up your AI provider
                </p>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Go to Settings → AI and add your OpenAI, Anthropic, or any OpenAI-compatible endpoint.
                  Supports OpenAI, Ollama, LM Studio, and more.
                </p>
              </div>
            </div>
          )}

          {/* Messages */}
          <div ref={logRef} className="flex-1 overflow-auto px-4 py-3 space-y-3">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                copiedId={copiedId}
                onCopy={handleCopy}
                onApplyRequest={applyRequest}
                onApplyTests={applyTests}
              />
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-400" />
                Thinking...
              </div>
            )}
          </div>

          {/* Quick actions */}
          {isConfigured && (
            <div className="flex gap-1.5 border-t border-[var(--color-border)] px-4 py-2">
              <button
                onClick={handleGenerateTests}
                disabled={loading || !tab?.response}
                className="flex items-center gap-1.5 rounded-lg bg-[var(--color-elevated)] px-2.5 py-1.5 text-[10px] font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)] disabled:opacity-40"
              >
                <FlaskConical className="h-3 w-3" />
                Generate Tests
              </button>
            </div>
          )}

          {/* Input */}
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isConfigured ? "Describe an API request..." : "Configure AI provider first"}
                disabled={!isConfigured || loading}
                className="flex-1 resize-none rounded-lg bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                rows={2}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!isConfigured || loading || !input.trim()}
                className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function MessageBubble({
  message,
  copiedId,
  onCopy,
  onApplyRequest,
  onApplyTests,
}: {
  message: ChatMessage;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onApplyRequest: (req: AiGeneratedRequest) => void;
  onApplyTests: (tests: { tests: string; assertions: string | null }) => void;
}) {
  const [showDebug, setShowDebug] = useState(false);
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${
          isUser
            ? "bg-purple-600 text-white"
            : message.error
              ? "bg-red-500/10 text-[var(--color-text-primary)] border border-red-500/20"
              : "bg-[var(--color-elevated)] text-[var(--color-text-primary)]"
        }`}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>

        {/* Error */}
        {message.error && (
          <p className="mt-1 text-xs text-red-400">{message.error}</p>
        )}

        {/* Generated request */}
        {message.generatedRequest && (
          <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-blue-500/15 px-1.5 py-0.5 text-[10px] font-bold text-blue-400">
                {message.generatedRequest.method}
              </span>
              <span className="text-xs text-[var(--color-text-secondary)] truncate">
                {message.generatedRequest.url}
              </span>
            </div>
            {message.generatedRequest.body && (
              <pre className="mt-1 max-h-24 overflow-auto whitespace-pre-wrap text-[10px] text-[var(--color-text-muted)] font-mono">
                {tryFormatJson(message.generatedRequest.body)}
              </pre>
            )}
            <button
              onClick={() => onApplyRequest(message.generatedRequest!)}
              className="mt-2 w-full rounded-lg bg-purple-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Apply to Current Tab
            </button>
          </div>
        )}

        {/* Generated tests */}
        {message.generatedTests && (
          <div className="mt-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-2">
            <pre className="max-h-32 overflow-auto whitespace-pre-wrap text-[10px] text-[var(--color-text-secondary)] font-mono">
              {message.generatedTests.tests}
            </pre>
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => onApplyTests(message.generatedTests!)}
                className="flex-1 rounded-lg bg-purple-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
              >
                Apply Tests
              </button>
              <button
                onClick={() => onCopy(message.generatedTests!.tests, message.id)}
                className="rounded-lg bg-[var(--color-elevated)] px-2 py-1.5 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
              >
                {copiedId === message.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Debug info */}
      {message.debug && (
        <button
          onClick={() => setShowDebug(!showDebug)}
          className="mt-0.5 flex items-center gap-1 text-[10px] text-[var(--color-text-dimmed)] hover:text-[var(--color-text-muted)]"
        >
          {showDebug ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}
          {message.debug.model} · {message.debug.durationMs}ms
        </button>
      )}
      {message.debug && showDebug && (
        <div className="mt-0.5 max-w-[90%] rounded bg-[var(--color-surface)] p-2 text-[10px] text-[var(--color-text-dimmed)] font-mono">
          <div>Endpoint: {message.debug.endpoint}</div>
          <div>Model: {message.debug.model}</div>
          <div>Duration: {message.debug.durationMs}ms</div>
          <div className="mt-1">Prompt: {message.debug.prompt}</div>
        </div>
      )}

      {/* Timestamp */}
      <span className="mt-0.5 text-[9px] text-[var(--color-text-dimmed)]">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}

function tryFormatJson(str: string): string {
  try {
    return JSON.stringify(JSON.parse(str), null, 2);
  } catch {
    return str;
  }
}
