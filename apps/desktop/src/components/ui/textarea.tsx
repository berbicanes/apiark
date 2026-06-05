import { forwardRef } from "react";

/**
 * Textarea with auto-capitalization and auto-correction disabled by default.
 *
 * Same rationale as {@link Input}: on macOS (WKWebView) textareas auto-correct
 * and auto-capitalize technical content (request bodies, payloads, tokens).
 * Callers that hold natural-language text can re-enable these via props.
 */
export const TextArea = forwardRef<
  HTMLTextAreaElement,
  React.ComponentPropsWithoutRef<"textarea">
>(
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
    <textarea
      ref={ref}
      autoCapitalize={autoCapitalize}
      autoCorrect={autoCorrect}
      autoComplete={autoComplete}
      spellCheck={spellCheck}
      {...props}
    />
  ),
);

TextArea.displayName = "TextArea";
