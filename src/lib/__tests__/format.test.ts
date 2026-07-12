import { describe, expect, it } from "vitest";
import { formatCost, formatTimestamp } from "../format";

describe("formatCost", () => {
  it("renders dollars with two decimals (the inline `$x.toFixed(2)` idiom)", () => {
    expect(formatCost(12.5)).toBe("$12.50");
    expect(formatCost(1234.567)).toBe("$1234.57");
  });

  it("treats 0 as a real value, not an unknown", () => {
    expect(formatCost(0)).toBe("$0.00");
  });

  it("renders the em-dash unknown state for null/undefined/non-finite", () => {
    expect(formatCost(null)).toBe("—");
    expect(formatCost(undefined)).toBe("—");
    expect(formatCost(Number.NaN)).toBe("—");
    expect(formatCost(Infinity)).toBe("—");
  });
});

describe("formatTimestamp", () => {
  it("renders a deterministic UTC-pinned timestamp", () => {
    expect(formatTimestamp("2026-01-01T00:00:00Z")).toBe("Jan 1, 2026, 12:00 AM UTC");
    expect(formatTimestamp("2026-07-11T15:30:00Z")).toBe("Jul 11, 2026, 3:30 PM UTC");
  });

  it("normalizes to plain spaces (no ICU narrow no-break space)", () => {
    expect(formatTimestamp("2026-01-01T00:00:00Z")).not.toMatch(/[  ]/);
  });

  it("renders the em-dash unknown state for null/undefined/empty/invalid", () => {
    expect(formatTimestamp(null)).toBe("—");
    expect(formatTimestamp(undefined)).toBe("—");
    expect(formatTimestamp("")).toBe("—");
    expect(formatTimestamp("not-a-date")).toBe("—");
  });
});
