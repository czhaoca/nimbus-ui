import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { dismissFinding, fetchFindings, promoteFinding } from "../api";
import type { ReviewFinding } from "../types";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

function envelope(data: unknown) {
  return { status: "success", message: "", data, action_log_id: 7 };
}

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

async function requestOf(fetchMock: ReturnType<typeof vi.fn>) {
  const req = fetchMock.mock.calls[0][0] as Request;
  return { req, body: await req.clone().json() };
}

const FINDING: ReviewFinding = {
  id: 12,
  run_id: "run-uuid-1",
  severity: "HIGH",
  category: "unifi.rule.orphaned",
  provider_types: ["unifi"],
  resource_ref: { rule_id: "fw-1" },
  message: "Firewall rule references a decommissioned VLAN",
  remediation: "Delete the rule or re-point it at an active VLAN",
  status: "open",
  promoted_proposal_id: null,
};

describe("security-review api module (ops bridge)", () => {
  it("lists findings via POST /api/v1/ops/security.review.list", async () => {
    const fetchMock = mockFetch(200, envelope({ findings: [FINDING] }));

    const findings = await fetchFindings();

    const { req } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/ops/security.review.list",
    );
    expect(req.method).toBe("POST");
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("HIGH");
  });

  it("passes severity/status filters in the op body", async () => {
    const fetchMock = mockFetch(200, envelope({ findings: [] }));

    await fetchFindings({ severity: "CRITICAL", status: "open" });

    const { body } = await requestOf(fetchMock);
    expect(body).toMatchObject({ severity: "CRITICAL", status: "open" });
  });

  it("promotes with finding_id + allocation_id via the promote op", async () => {
    const fetchMock = mockFetch(
      200,
      envelope({ finding_id: 12, status: "promoted", proposal_id: 3, change_kind: "ip" }),
    );

    const result = await promoteFinding({
      finding_id: 12,
      allocation_id: 42,
      proposed_ip: "192.0.2.10",
      note: "adopt",
    });

    const { req, body } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/ops/security.review.promote",
    );
    expect(body).toMatchObject({
      finding_id: 12,
      allocation_id: 42,
      proposed_ip: "192.0.2.10",
      note: "adopt",
    });
    expect(result.proposal_id).toBe(3);
  });

  it("dismisses with finding_id + note via the dismiss op", async () => {
    const fetchMock = mockFetch(
      200,
      envelope({ finding_id: 12, status: "dismissed" }),
    );

    const result = await dismissFinding(12, "false positive");

    const { req, body } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/ops/security.review.dismiss",
    );
    expect(body).toMatchObject({ finding_id: 12, note: "false positive" });
    expect(result.status).toBe("dismissed");
  });

  it("surfaces the registry's 403 denial detail", async () => {
    mockFetch(403, { detail: "operator role required" });

    await expect(dismissFinding(12)).rejects.toThrow("operator role required");
  });
});
