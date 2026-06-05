/** Bounds for the collections side panel width, shared by the drag handle and the settings slider. */
export const SIDEBAR_MIN_WIDTH = 180;
export const SIDEBAR_MAX_WIDTH = 700;
export const SIDEBAR_DEFAULT_WIDTH = 400;

/** Clamp a (possibly fractional) pixel width to the allowed sidebar range, rounded to a whole pixel. */
export function clampSidebarWidth(width: number): number {
  return Math.round(Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, width)));
}
