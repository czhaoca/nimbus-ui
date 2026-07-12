import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMe } from "../useMe";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

function mockMe(role: string) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify({ username: "u-1", role }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("useMe", () => {
  let queryClient: QueryClient;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or hook trees leak across tests.
    cleanup();
    queryClient.clear();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  const roleCases: [string, boolean][] = [
    ["operator", true],
    ["admin", true],
    ["viewer", false],
  ];

  it.each(roleCases)("role %s → isOperator %s", async (role, expected) => {
    mockMe(role);
    const { result } = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(result.current.me).not.toBeNull());
    expect(result.current.me?.role).toBe(role);
    expect(result.current.isOperator).toBe(expected);
  });

  it("is not operator while the role is still unknown (loading)", () => {
    mockMe("operator");
    const { result } = renderHook(() => useMe(), { wrapper });
    expect(result.current.me).toBeNull();
    expect(result.current.isOperator).toBe(false);
  });

  it('caches under ["auth-me"] with staleTime Infinity (no refetch on remount)', async () => {
    const fetchMock = mockMe("viewer");
    const first = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(first.result.current.me).not.toBeNull());
    expect(queryClient.getQueryData(["auth-me"])).toEqual({
      username: "u-1",
      role: "viewer",
    });
    first.unmount();

    const second = renderHook(() => useMe(), { wrapper });
    await waitFor(() => expect(second.result.current.me).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
