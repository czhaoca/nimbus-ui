import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { setAuthToken } from "@/lib/api/client";
import {
  useHealth,
  useProviders,
  useResources,
  useResourceAction,
  useSyncResources,
  useBudgetRules,
  useBudgetStatus,
  useSpending,
  useCreateBudgetRule,
  useDeleteBudgetRule,
  useEnforceBudget,
  useSettings,
  useProviderStatus,
  useErrors,
} from "../useApi";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>): Request {
  return fetchMock.mock.calls[0][0] as Request;
}

describe("useApi hooks", () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or hook trees leak across tests.
    cleanup();
    queryClient.clear();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  /** queryKey of every invalidateQueries call, in call order. */
  function invalidatedKeys(): unknown[][] {
    return invalidateSpy.mock.calls.map(
      (c: unknown[]) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
  }

  describe("query hook queryKey shapes", () => {
    const cases: {
      name: string;
      useHook: () => { isSuccess: boolean };
      key: unknown[];
    }[] = [
      { name: "useHealth", useHook: () => useHealth(), key: ["health"] },
      { name: "useProviders", useHook: () => useProviders(), key: ["providers"] },
      {
        name: "useResources (unscoped)",
        useHook: () => useResources(),
        key: ["resources", undefined],
      },
      {
        name: "useResources (scoped)",
        useHook: () => useResources("prov-1"),
        key: ["resources", "prov-1"],
      },
      {
        name: "useBudgetRules",
        useHook: () => useBudgetRules(),
        key: ["budget-rules"],
      },
      {
        name: "useBudgetStatus",
        useHook: () => useBudgetStatus(),
        key: ["budget-status"],
      },
      {
        name: "useSpending (unscoped)",
        useHook: () => useSpending(),
        key: ["spending", undefined],
      },
      {
        name: "useSpending (scoped)",
        useHook: () => useSpending("prov-1"),
        key: ["spending", "prov-1"],
      },
      { name: "useSettings", useHook: () => useSettings(), key: ["settings"] },
      {
        name: "useProviderStatus",
        useHook: () => useProviderStatus(),
        key: ["provider-status"],
      },
      {
        name: "useErrors (unscoped)",
        useHook: () => useErrors(),
        key: ["errors", undefined],
      },
      {
        name: "useErrors (scoped)",
        useHook: () => useErrors("adapter"),
        key: ["errors", "adapter"],
      },
    ];

    it.each(cases)("$name registers queryKey $key", async ({ useHook, key }) => {
      mockFetch(200, []);

      const { result } = renderHook(useHook, { wrapper });

      const keys = queryClient.getQueryCache().getAll().map((q) => q.queryKey);
      expect(keys).toEqual([key]);
      // Let the stubbed fetch settle so no state update lands post-test.
      await waitFor(() => expect(result.current.isSuccess).toBe(true));
    });
  });

  describe("mutation cache invalidation", () => {
    it("useResourceAction POSTs the action and invalidates resources plus the detail keys", async () => {
      const fetchMock = mockFetch(200, {
        success: true,
        resource_id: "r-1",
        action: "stop",
      });
      const { result } = renderHook(() => useResourceAction(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync({ id: "r-1", action: "stop" });
      });

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/resources/r-1/action");
      expect(req.method).toBe("POST");
      await expect(req.json()).resolves.toEqual({ action: "stop" });
      // #36: an open detail page must refetch itself after an action.
      expect(invalidatedKeys()).toEqual([
        ["resources"],
        ["resource", "r-1"],
        ["action-logs", "r-1"],
      ]);
    });

    it("useSyncResources POSTs the provider sync and invalidates exactly [resources]", async () => {
      const fetchMock = mockFetch(200, { synced: 3, provider_id: "prov-1" });
      const { result } = renderHook(() => useSyncResources(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("prov-1");
      });

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/resources/sync/prov-1");
      expect(req.method).toBe("POST");
      expect(invalidatedKeys()).toEqual([["resources"]]);
    });

    it("useCreateBudgetRule invalidates budget-rules then budget-status", async () => {
      const rule = {
        action_on_exceed: "alert",
        alert_threshold: 0.8,
        is_active: true,
        monthly_limit: 100,
        provider_id: null,
      };
      const fetchMock = mockFetch(201, {
        ...rule,
        id: "rule-1",
        created_at: "2026-07-06T00:00:00+00:00",
      });
      const { result } = renderHook(() => useCreateBudgetRule(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync(rule);
      });

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/budget/rules");
      expect(req.method).toBe("POST");
      await expect(req.json()).resolves.toEqual(rule);
      expect(invalidatedKeys()).toEqual([["budget-rules"], ["budget-status"]]);
    });

    it("useDeleteBudgetRule invalidates budget-rules then budget-status", async () => {
      const fetchMock = mockFetch(200, {});
      const { result } = renderHook(() => useDeleteBudgetRule(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync("rule-1");
      });

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/budget/rules/rule-1");
      expect(req.method).toBe("DELETE");
      expect(invalidatedKeys()).toEqual([["budget-rules"], ["budget-status"]]);
    });

    it("useEnforceBudget invalidates exactly [budget-status]", async () => {
      const fetchMock = mockFetch(200, {
        period: "2026-07",
        actions_taken: 0,
        details: [],
      });
      const { result } = renderHook(() => useEnforceBudget(), { wrapper });

      await act(async () => {
        await result.current.mutateAsync();
      });

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/budget/enforce");
      expect(req.method).toBe("POST");
      expect(invalidatedKeys()).toEqual([["budget-status"]]);
    });
  });
});
