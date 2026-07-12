import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useWebSocket } from "../useWebSocket";
import { resetIncidentFeed, useIncidentFeed } from "../incidentFeed";
import { showToast } from "@/components/Toasts";

vi.mock("@/components/Toasts", () => ({
  showToast: vi.fn(),
}));

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  url: string;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }
  close() {}
}

function lastSocket(): FakeWebSocket {
  const ws = FakeWebSocket.instances.at(-1);
  if (!ws) throw new Error("no WebSocket was constructed");
  return ws;
}

describe("useWebSocket incident handling", () => {
  let queryClient: QueryClient;
  let invalidateSpy: ReturnType<typeof vi.spyOn>;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    queryClient = new QueryClient();
    invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or hook trees leak across tests.
    cleanup();
    resetIncidentFeed();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  function fire(event: unknown) {
    lastSocket().onmessage?.({ data: JSON.stringify(event) });
  }

  it("health_failure → destructive toast + health/provider invalidation", () => {
    renderHook(() => useWebSocket(), { wrapper });

    fire({
      type: "incident",
      action: "health_failure",
      resource_id: "r-1",
      provider_id: "p-1",
      display_name: "vm-web-1",
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    const [message, toastType] = vi.mocked(showToast).mock.calls[0];
    expect(message).toContain("vm-web-1");
    expect(toastType).toBe("error");

    const invalidated = invalidateSpy.mock.calls.map(
      (c: unknown[]) => (c[0] as { queryKey: string[] }).queryKey[0],
    );
    expect(invalidated).toEqual(
      expect.arrayContaining(["health", "providers", "provider-status"]),
    );
  });

  it("health_recovery → success toast + same invalidation", () => {
    renderHook(() => useWebSocket(), { wrapper });

    fire({
      type: "incident",
      action: "health_recovery",
      resource_id: "r-2",
      provider_id: "p-1",
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    const [message, toastType] = vi.mocked(showToast).mock.calls[0];
    expect(message).toContain("r-2");
    expect(toastType).toBe("success");

    const invalidated = invalidateSpy.mock.calls.map(
      (c: unknown[]) => (c[0] as { queryKey: string[] }).queryKey[0],
    );
    expect(invalidated).toEqual(
      expect.arrayContaining(["health", "providers", "provider-status"]),
    );
  });

  it("resource_change keeps its existing behavior", () => {
    renderHook(() => useWebSocket(), { wrapper });

    fire({
      type: "resource_change",
      action: "stop",
      resource_id: "r-3",
      provider_id: "p-2",
    });

    expect(showToast).toHaveBeenCalledTimes(1);
    const invalidated = invalidateSpy.mock.calls.map(
      (c: unknown[]) => (c[0] as { queryKey: string[] }).queryKey[0],
    );
    expect(invalidated).toEqual(
      expect.arrayContaining(["resources", "providers", "budget-status"]),
    );
  });

  it("unknown event types are ignored without throwing", () => {
    renderHook(() => useWebSocket(), { wrapper });

    expect(() =>
      fire({ type: "future_event_type", payload: { x: 1 } }),
    ).not.toThrow();
    expect(showToast).not.toHaveBeenCalled();
    expect(invalidateSpy).not.toHaveBeenCalled();
  });

  it("pong frames are ignored silently", () => {
    renderHook(() => useWebSocket(), { wrapper });

    expect(() => fire({ type: "pong" })).not.toThrow();
    expect(showToast).not.toHaveBeenCalled();
  });

  it("incident events land in the session incident feed (#30 WS-reach pin)", () => {
    renderHook(() => useWebSocket(), { wrapper });
    const feed = renderHook(() => useIncidentFeed());

    act(() =>
      fire({
        type: "incident",
        action: "health_failure",
        resource_id: "r-7",
        provider_id: "p-1",
      }),
    );

    expect(feed.result.current).toHaveLength(1);
    expect(feed.result.current[0].event.resource_id).toBe("r-7");
    // The toast contract is unchanged — the feed is additive.
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("resource_change events never reach the incident feed", () => {
    renderHook(() => useWebSocket(), { wrapper });
    const feed = renderHook(() => useIncidentFeed());

    act(() =>
      fire({
        type: "resource_change",
        action: "stop",
        resource_id: "r-8",
        provider_id: "p-1",
      }),
    );

    expect(feed.result.current).toHaveLength(0);
  });

  function invalidatedKeys(): unknown[][] {
    return invalidateSpy.mock.calls.map(
      (c: unknown[]) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
  }

  it("resource_change also invalidates the detail keys (#34)", () => {
    renderHook(() => useWebSocket(), { wrapper });

    fire({
      type: "resource_change",
      action: "update",
      resource_id: "r-9",
      provider_id: "p-1",
    });

    const keys = invalidatedKeys();
    expect(keys).toContainEqual(["resource", "r-9"]);
    expect(keys).toContainEqual(["action-logs", "r-9"]);
    // The list invalidations and the single info toast are unchanged.
    expect(keys).toContainEqual(["resources"]);
    expect(keys).toContainEqual(["providers"]);
    expect(keys).toContainEqual(["budget-status"]);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("incident with resource_id also invalidates the detail keys (#34)", () => {
    renderHook(() => useWebSocket(), { wrapper });

    act(() =>
      fire({
        type: "incident",
        action: "health_failure",
        resource_id: "r-4",
        provider_id: "p-1",
      }),
    );

    const keys = invalidatedKeys();
    expect(keys).toContainEqual(["resource", "r-4"]);
    expect(keys).toContainEqual(["action-logs", "r-4"]);
    // The incident invalidations and the single toast are unchanged.
    expect(keys).toContainEqual(["health"]);
    expect(keys).toContainEqual(["providers"]);
    expect(keys).toContainEqual(["provider-status"]);
    expect(showToast).toHaveBeenCalledTimes(1);
  });

  it("events without resource_id never invalidate detail keys", () => {
    renderHook(() => useWebSocket(), { wrapper });

    fire({ type: "resource_change", action: "sweep", provider_id: "p-1" });
    act(() =>
      fire({ type: "incident", action: "health_recovery", provider_id: "p-1" }),
    );

    const heads = invalidatedKeys().map((k) => k[0]);
    expect(heads).not.toContain("resource");
    expect(heads).not.toContain("action-logs");
  });
});
