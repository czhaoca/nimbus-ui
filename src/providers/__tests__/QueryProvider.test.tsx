/**
 * Pins QueryProvider (#24/G4): the TanStack wrapper must expose a
 * client through context carrying the repo's pinned defaults
 * (retry: 1, staleTime: 10_000).
 */
import { useQueryClient } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { QueryProvider } from "@/providers/QueryProvider";

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
});

function OptionsProbe() {
  const client = useQueryClient();
  const queries = client.getDefaultOptions().queries;
  return (
    <span data-testid="opts">
      {`retry=${String(queries?.retry)} stale=${String(queries?.staleTime)}`}
    </span>
  );
}

describe("QueryProvider", () => {
  it("provides a query client with the pinned defaults", () => {
    render(
      <QueryProvider>
        <OptionsProbe />
      </QueryProvider>,
    );
    expect(screen.getByTestId("opts").textContent).toBe(
      "retry=1 stale=10000",
    );
  });

  it("renders its children", () => {
    render(
      <QueryProvider>
        <div data-testid="child">content</div>
      </QueryProvider>,
    );
    expect(screen.getByTestId("child").textContent).toBe("content");
  });
});
