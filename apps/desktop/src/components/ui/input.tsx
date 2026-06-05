import { forwardRef } from "react";

/**
 * Text input with auto-capitalization and auto-correction disabled by default.
 *
 * On macOS (WKWebView) native inputs auto-capitalize the first letter and
 * auto-correct what the user types, which corrupts technical values like
 * variable keys, headers, and URLs. These defaults turn that behavior off
 * while still allowing any prop to be overridden by the caller.
 */
export const Input = forwardRef<HTMLInputElement, React.ComponentPropsWithoutRef<"input">>(
  (
    {
      autoCapitalize = "off",
      autoCorrect = "off",
      autoComplete = "off",
      spellCheck = false,
      ...props
    },
    ref,
  ) => (
    <input
      ref={ref}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      {...props}
    />
  ),
);

Input.displayName = "Input";
