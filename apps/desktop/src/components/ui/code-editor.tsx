import { useRef, useCallback } from "react";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";

// Configure Monaco to use local bundled files (not CDN) for Tauri offline support
loader.config({
  paths: {
    vs: "/node_modules/monaco-editor/min/vs",
  },
});

// ApiArk light theme definition
const APIARK_THEME: Monaco.editor.IStandaloneThemeData = {
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

let themesRegistered = false;

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

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;

    if (!themesRegistered) {
      monaco.editor.defineTheme("apiark", APIARK_THEME);
      themesRegistered = true;
    }

    monaco.editor.setTheme("apiark");
  }, []);

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
        theme="apiark"
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
