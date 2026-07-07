import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { executeOp, type OpEnvelope } from "../ops";

// Direct pins for the ops bridge (nimbus-ui#16) — previously only covered
// indirectly through the four feature modules that compose it.

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

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

describe("ops bridge", () => {
  it("dispatches to /api/v1/ops/{op_id} with the given body", async () => {
    const fetchMock = mockFetch(200, {
      status: "success",
      message: "",
      data: { ok: true },
      action_log_id: "a1b2c3d4-0000-0000-0000-000000000000",
    });

    const env = await executeOp<{ ok: boolean }>("security.review.list", {
      severity: "HIGH",
    });

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/ops/security.review.list");
    expect(req.method).toBe("POST");
    expect(await req.clone().json()).toEqual({ severity: "HIGH" });
    expect(env.data.ok).toBe(true);
  });

  it("defaults the body to an empty object", async () => {
    const fetchMock = mockFetch(200, {
      status: "success",
      message: "",
      data: {},
      action_log_id: null,
    });

    await executeOp("budget.digest");

    expect(await requestOf(fetchMock).clone().json()).toEqual({});
  });

  it("carries the engine's string action_log_id through the envelope", async () => {
    mockFetch(200, {
      status: "success",
      message: "",
      data: {},
      action_log_id: "0f8fad5b-d9cb-469f-a165-70867728950e",
    });

    const env: OpEnvelope<Record<string, never>> = await executeOp("noop.op");

    expect(env.action_log_id).toBe("0f8fad5b-d9cb-469f-a165-70867728950e");
  });

  it("throws the engine's detail on a tier-gate denial", async () => {
    mockFetch(403, { detail: "denied" });

    await expect(executeOp("alerts.silence")).rejects.toThrow(/denied/);
  });

  it("falls back to the HTTP status when no detail is present", async () => {
    mockFetch(500, {});

    await expect(executeOp("budget.digest")).rejects.toThrow(/HTTP 500/);
  });
});
