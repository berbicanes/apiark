import { useState, useRef, useEffect, useCallback } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { TextArea } from "@/components/ui/textarea";
import {
  X,
  Send,
  Sparkles,
  FlaskConical,
  Loader2,
  ChevronDown,
  ChevronRight,
  Settings,
  Copy,
  Check,
  Trash2,
} from "lucide-react";
import { useActiveTab, useTabStore } from "@/stores/tab-store";
import { useSettingsStore } from "@/stores/settings-store";
import {
  aiChat,
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
  runPrompt?: boolean;
}

interface AiAssistantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenSettings?: () => void;
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

  const handleSend = async () => {
    if (!input.trim() || !isConfigured) return;

    const userPrompt = input.trim();
    setInput("");
    addMessage({ role: "user", content: userPrompt, type: "chat" });
    setLoading(true);

    const start = Date.now();
    const params = getParams();
    params.prompt = userPrompt;

    if (tab) {
      params.context = `Current tab: ${tab.method} ${tab.url}`;
    }

    try {
      const result = await aiChat(params);
      addMessage({
        role: "assistant",
        content: result.message,
        type: result.generatedRequest ? "request" : "chat",
        generatedRequest: result.generatedRequest ?? undefined,
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
        content: "Could not reach your AI provider",
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
        content: "Could not generate tests — check your AI provider settings",
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

    // Ask if user wants to run the request
    addMessage({
      role: "assistant",
      content: "Request applied! Do you want me to send it?",
      runPrompt: true,
    });
  };

  const handleRunRequest = async () => {
    // Remove the run prompt message
    setMessages((prev) => prev.filter((m) => !m.runPrompt));
    addMessage({ role: "user", content: "Yes, run it" });
    const store = useTabStore.getState();
    await store.send();
    addMessage({
      role: "assistant",
      content: "Done! Check the response panel for results and test outcomes.",
    });
  };

  const handleDismissRun = () => {
    setMessages((prev) => prev.filter((m) => !m.runPrompt));
    addMessage({
      role: "assistant",
      content: "No problem, you can send it whenever you're ready.",
    });
  };

  const applyTests = (tests: { tests: string; assertions: string | null }) => {
    const store = useTabStore.getState();
    store.setTestScript(tests.tests);
    if (tests.assertions) {
      store.setAssertions(tests.assertions);
    }

    // Ask if user wants to send the request to run the tests
    addMessage({
      role: "assistant",
      content: "Tests applied! Want me to send the request so we can run them?",
      runPrompt: true,
    });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenSettings = () => {
    onOpenChange(false);
    window.dispatchEvent(new CustomEvent("apiark:open-settings", { detail: { section: "ai" } }));
  };

  const handleSubmit = () => {
    handleSend();
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
              <span className="rounded bg-[var(--color-surface)] px-1.5 py-0.5 text-[9px] font-medium text-[var(--color-text-dimmed)] uppercase tracking-wider">
                Optional
              </span>
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
                <span className={`h-2 w-2 rounded-full ${isConfigured ? "bg-yellow-500" : "bg-red-500"}`} />
                <span className="text-[var(--color-text-muted)]">
                  {isConfigured ? "Configured — using your own API key" : "Not configured — bring your own API key to use this optional feature"}
                </span>
              </div>
              <p className="text-[var(--color-text-dimmed)]">
                Configure your AI provider in{" "}
                <button
                  onClick={handleOpenSettings}
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

          {/* Not configured — full setup screen */}
          {!isConfigured && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-10 text-center">
              <div className="rounded-full bg-purple-500/10 p-4">
                <Sparkles className="h-10 w-10 text-purple-400" />
              </div>
              <div>
                <p className="text-base font-semibold text-[var(--color-text-primary)]">
                  AI Assistant — Optional Feature
                </p>
                <p className="mt-2 text-sm text-[var(--color-text-muted)] leading-relaxed">
                  This is an <strong>optional</strong> feature that requires your own API key (BYOK).
                  ApiArk does not include or provide an AI service — you bring your own.
                </p>
              </div>
              <div className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-left text-xs text-[var(--color-text-muted)] space-y-2">
                <p className="font-medium text-[var(--color-text-secondary)]">To get started:</p>
                <ol className="list-decimal ml-4 space-y-1">
                  <li>Get an API key from your preferred AI provider</li>
                  <li>Go to <strong>Settings → AI</strong> and enter your endpoint, key, and model</li>
                  <li>Start chatting or generating requests</li>
                </ol>
                <p className="pt-1 text-[var(--color-text-dimmed)]">
                  Supports any OpenAI-compatible API: OpenAI, Ollama, LM Studio, and more.
                </p>
              </div>
              <button
                onClick={handleOpenSettings}
                className="rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium text-white hover:bg-purple-700"
              >
                Open Settings
              </button>
              <p className="text-[10px] text-[var(--color-text-dimmed)]">
                All other features of ApiArk work without AI configuration.
              </p>
            </div>
          )}

          {/* Messages — only shown when configured */}
          {isConfigured && (
            <>
              {/* BYOK reminder banner */}
              <div className="border-b border-[var(--color-border)] bg-amber-500/5 px-4 py-2 text-[10px] text-[var(--color-text-dimmed)]">
                This optional feature connects to <strong>your own</strong> AI provider. ApiArk does not include an AI service.{" "}
                Errors below mean your API key or endpoint needs attention in{" "}
                <button onClick={handleOpenSettings} className="text-purple-400 hover:underline">Settings → AI</button>.
              </div>
              <div ref={logRef} className="flex-1 overflow-auto px-4 py-3 space-y-3">
                {messages.length === 0 && (
                  <div className="flex flex-col items-center gap-2 py-8 text-center text-xs text-[var(--color-text-dimmed)]">
                    <Sparkles className="h-5 w-5 text-purple-400/40" />
                    <p>Ask anything about APIs, generate requests, or create tests.</p>
                  </div>
                )}
                {messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    message={msg}
                    copiedId={copiedId}
                    onCopy={handleCopy}
                    onApplyRequest={applyRequest}
                    onApplyTests={applyTests}
                    onRunRequest={handleRunRequest}
                    onDismissRun={handleDismissRun}
                    onOpenSettings={handleOpenSettings}
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

              {/* Input */}
              <div className="border-t border-[var(--color-border)] px-4 py-3">
                <div className="flex items-end gap-2">
                  <TextArea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Describe an API request..."
                    disabled={loading}
                    className="flex-1 resize-none rounded-lg bg-[var(--color-elevated)] px-3 py-2 text-sm text-[var(--color-text-primary)] placeholder-[var(--color-text-dimmed)] outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
                    rows={2}
                    autoCapitalize="sentences"
                    autoCorrect="on"
                    spellCheck={true}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmit();
                      }
                    }}
                  />
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !input.trim()}
                    className="flex items-center gap-1 rounded-lg bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </>
          )}
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
  onRunRequest,
  onDismissRun,
  onOpenSettings,
}: {
  message: ChatMessage;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onApplyRequest: (req: AiGeneratedRequest) => void;
  onApplyTests: (tests: { tests: string; assertions: string | null }) => void;
  onRunRequest: () => void;
  onDismissRun: () => void;
  onOpenSettings?: () => void;
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
          <>
            <p className="mt-1 text-xs text-red-400">{message.error}</p>
            <p className="mt-1.5 text-[10px] text-[var(--color-text-dimmed)]">
              This optional feature uses your own API key.{" "}
              {onOpenSettings && (
                <button onClick={onOpenSettings} className="text-purple-400 hover:underline">
                  Check Settings → AI
                </button>
              )}
            </p>
          </>
        )}

        {/* Run prompt */}
        {message.runPrompt && (
          <div className="mt-2 flex gap-1.5">
            <button
              onClick={onRunRequest}
              className="flex-1 rounded-lg bg-purple-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-purple-700"
            >
              Run it
            </button>
            <button
              onClick={onDismissRun}
              className="flex-1 rounded-lg bg-[var(--color-elevated)] px-2 py-1.5 text-xs font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-border)]"
            >
              I'll run it myself
            </button>
          </div>
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
