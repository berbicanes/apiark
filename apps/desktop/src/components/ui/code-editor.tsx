import { useRef, useCallback } from "react";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import { useResolvedTheme } from "@/hooks/use-theme";

// Configure Monaco to use local bundled files (not CDN) for Tauri offline support
loader.config({
  paths: {
    vs: "/node_modules/monaco-editor/min/vs",
  },
});

// ApiArk light theme
const APIARK_LIGHT: Monaco.editor.IStandaloneThemeData = {
  base: "vs",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "7c3aed" },
    { token: "string", foreground: "059669" },
    { token: "number", foreground: "d97706" },
    { token: "type", foreground: "4f46e5" },
    { token: "variable", foreground: "2563eb" },
  ],
  colors: {
    "editor.background": "#ffffff",
    "editor.foreground": "#111827",
    "editor.lineHighlightBackground": "#f5f6fa",
    "editor.selectionBackground": "#6366f130",
    "editorCursor.foreground": "#6366f1",
    "editorLineNumber.foreground": "#9ca3af",
    "editorLineNumber.activeForeground": "#374151",
    "editor.inactiveSelectionBackground": "#6366f115",
    "editorIndentGuide.background": "#e4e6ed",
    "editorWidget.background": "#f8f9fc",
    "editorWidget.border": "#d1d5e0",
    "input.background": "#ffffff",
    "input.border": "#d1d5e0",
  },
};

// ApiArk dark theme
const APIARK_DARK: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: [
    { token: "comment", foreground: "6b7280", fontStyle: "italic" },
    { token: "keyword", foreground: "a78bfa" },
    { token: "string", foreground: "34d399" },
    { token: "number", foreground: "fbbf24" },
    { token: "type", foreground: "818cf8" },
    { token: "variable", foreground: "60a5fa" },
  ],
  colors: {
    "editor.background": "#141416",
    "editor.foreground": "#e4e4e7",
    "editor.lineHighlightBackground": "#1c1c1f",
    "editor.selectionBackground": "#6366f140",
    "editorCursor.foreground": "#6366f1",
    "editorLineNumber.foreground": "#52525b",
    "editorLineNumber.activeForeground": "#a1a1aa",
    "editor.inactiveSelectionBackground": "#6366f120",
    "editorIndentGuide.background": "#2a2a2e",
    "editorWidget.background": "#141416",
    "editorWidget.border": "#2a2a2e",
    "input.background": "#1c1c1f",
    "input.border": "#2a2a2e",
  },
};

// ApiArk black/OLED theme
const APIARK_BLACK: Monaco.editor.IStandaloneThemeData = {
  base: "vs-dark",
  inherit: true,
  rules: APIARK_DARK.rules,
  colors: {
    ...APIARK_DARK.colors,
    "editor.background": "#0a0a0a",
    "editor.lineHighlightBackground": "#141414",
    "editorIndentGuide.background": "#1f1f1f",
    "editorWidget.background": "#0a0a0a",
    "editorWidget.border": "#1f1f1f",
    "input.background": "#141414",
    "input.border": "#1f1f1f",
  },
};

let themesRegistered = false;

function registerThemes(monaco: typeof Monaco) {
  if (themesRegistered) return;
  monaco.editor.defineTheme("apiark-light", APIARK_LIGHT);
  monaco.editor.defineTheme("apiark-dark", APIARK_DARK);
  monaco.editor.defineTheme("apiark-black", APIARK_BLACK);
  themesRegistered = true;
}

function getMonacoTheme(resolved: "light" | "dark" | "black"): string {
  switch (resolved) {
    case "light": return "apiark-light";
    case "black": return "apiark-black";
    default: return "apiark-dark";
  }
}

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  height?: string | number;
  readOnly?: boolean;
  minimap?: boolean;
  lineNumbers?: boolean;
  placeholder?: string;
}

export function CodeEditor({
  value,
  onChange,
  language = "javascript",
  height = "200px",
  readOnly = false,
  minimap = false,
  lineNumbers = true,
  placeholder,
}: CodeEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const resolvedTheme = useResolvedTheme();
  const monacoTheme = getMonacoTheme(resolvedTheme);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    registerThemes(monaco);
    monaco.editor.setTheme(monacoTheme);
  }, [monacoTheme]);

  // Switch theme when app theme changes
  if (monacoRef.current && themesRegistered) {
    monacoRef.current.editor.setTheme(monacoTheme);
  }

  const showPlaceholder = placeholder && !value;

  return (
    <div className="relative h-full overflow-hidden rounded border border-[var(--color-border)]">
      {showPlaceholder && (
        <div className="pointer-events-none absolute left-14 top-2 z-10 text-sm text-[var(--color-text-dimmed)]">
          {placeholder}
        </div>
      )}
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        theme={monacoTheme}
        options={{
          minimap: { enabled: minimap },
          lineNumbers: lineNumbers ? "on" : "off",
          readOnly,
          scrollBeyondLastLine: false,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
          tabSize: 2,
          wordWrap: "on",
          automaticLayout: true,
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
          padding: { top: 8, bottom: 8 },
          renderLineHighlight: "line",
          folding: true,
          bracketPairColorization: { enabled: true },
          suggest: { showWords: false },
          quickSuggestions: language === "javascript" || language === "typescript",
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          overviewRulerBorder: false,
        }}
      />
    </div>
  );
}
