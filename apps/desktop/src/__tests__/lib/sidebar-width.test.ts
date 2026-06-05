import { describe, it, expect } from "vitest";
import {
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_DEFAULT_WIDTH,
  clampSidebarWidth,
} from "@/lib/sidebar-width";

describe("clampSidebarWidth", () => {
  it("returns the value unchanged when within bounds", () => {
    expect(clampSidebarWidth(360)).toBe(360);
  });

  it("clamps values below the minimum up to the minimum", () => {
    expect(clampSidebarWidth(50)).toBe(SIDEBAR_MIN_WIDTH);
  });

  it("clamps values above the maximum down to the maximum", () => {
    expect(clampSidebarWidth(5000)).toBe(SIDEBAR_MAX_WIDTH);
  });

  it("allows widening beyond the old 400px cap so request names are no longer truncated", () => {
    // Regression guard for issue #63: the sidebar must be expandable past 400px.
    expect(SIDEBAR_MAX_WIDTH).toBeGreaterThan(400);
    expect(clampSidebarWidth(600)).toBe(600);
  });

  it("rounds fractional widths produced by drag deltas", () => {
    expect(clampSidebarWidth(320.7)).toBe(321);
  });

  it("exposes a default that sits within the allowed range", () => {
    expect(SIDEBAR_DEFAULT_WIDTH).toBeGreaterThanOrEqual(SIDEBAR_MIN_WIDTH);
    expect(SIDEBAR_DEFAULT_WIDTH).toBeLessThanOrEqual(SIDEBAR_MAX_WIDTH);
  });
});
