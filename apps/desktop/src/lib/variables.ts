/**
 * Shared definition of what a `{{variable}}` reference looks like in the UI.
 *
 * The backend interpolator matches `{{([^}]+)}}` (see
 * `apps/desktop/src-tauri/src/http/interpolation.rs` and
 * `apps/cli/src/interpolation.rs`), so it resolves names containing hyphens,
 * dots, etc. — e.g. `{{bff-host}}` or `{{api.key}}`. The frontend previously
 * used `[\w$]+`, which silently dropped those names from highlighting,
 * extraction, hover preview and click-to-edit even though the request itself
 * resolved them correctly. Keep this pattern in one place so the frontend
 * stays in sync with what the backend accepts.
 */
export const VARIABLE_NAME_PATTERN = String.raw`[\w$.-]+`;

/**
 * Returns a fresh global RegExp matching `{{name}}` references.
 *
 * A new instance is returned on every call because the `g` flag makes
 * `RegExp` stateful (`lastIndex`); sharing a single instance across callers
 * that use `.exec()` in a loop would corrupt their iteration.
 */
export function variableRegex(): RegExp {
  return new RegExp(String.raw`\{\{(${VARIABLE_NAME_PATTERN})\}\}`, "g");
}
