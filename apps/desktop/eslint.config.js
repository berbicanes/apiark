import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "src-tauri"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-empty-object-type": "off",
      "@typescript-eslint/no-require-imports": "off",
      // Force text-entry fields through the shared UI wrappers, which disable
      // auto-capitalize/auto-correct. Raw inputs break on macOS WKWebView (#86).
      "no-restricted-syntax": [
        "warn",
        {
          selector: "JSXOpeningElement[name.name='textarea']",
          message:
            "Use the shared <TextArea> from @/components/ui/textarea instead of a raw <textarea>. It disables auto-capitalize/auto-correct (broken on macOS WKWebView).",
        },
        {
          selector:
            "JSXOpeningElement[name.name='input']:not(:has(JSXAttribute[name.name='type'] JSXExpressionContainer)):not(:has(JSXAttribute[name.name='type'][value.value=/^(checkbox|radio|file|range|color|button|submit|reset|image)$/]))",
          message:
            "Use the shared <Input> from @/components/ui/input for text-entry inputs instead of a raw <input>. It disables auto-capitalize/auto-correct (broken on macOS WKWebView).",
        },
      ],
    },
  },
  {
    // The shared wrappers are the one legitimate place to render raw elements.
    files: ["src/components/ui/input.tsx", "src/components/ui/textarea.tsx"],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
