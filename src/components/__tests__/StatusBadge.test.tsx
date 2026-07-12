import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { STATUS_VARIANT, StatusBadge } from "../StatusBadge";

afterEach(cleanup);

describe("StatusBadge", () => {
  // Superset union of the four local maps this component replaces;
  // conflicting keys (stopped, unknown) keep the ResourceCard base values.
  const cases: [string, string][] = [
    ["running", "default"],
    ["stopped", "secondary"],
    ["terminated", "destructive"],
    ["unknown", "outline"],
    ["connected", "default"],
    ["degraded", "outline"],
    ["down", "destructive"],
  ];

  it.each(cases)("renders %s with the %s variant", (status, variant) => {
    render(<StatusBadge status={status} />);
    expect(screen.getByText(status).getAttribute("data-variant")).toBe(variant);
  });

  it("falls back to outline for statuses outside the map, showing the raw string", () => {
    render(<StatusBadge status="provisioning" />);
    expect(screen.getByText("provisioning").getAttribute("data-variant")).toBe("outline");
  });

  it("passes className through", () => {
    render(<StatusBadge status="running" className="text-xs" />);
    expect(screen.getByText("running").className).toContain("text-xs");
  });

  it("exports exactly the union of the four source maps", () => {
    expect(Object.keys(STATUS_VARIANT).sort()).toEqual([
      "connected",
      "degraded",
      "down",
      "running",
      "stopped",
      "terminated",
      "unknown",
    ]);
  });
});
