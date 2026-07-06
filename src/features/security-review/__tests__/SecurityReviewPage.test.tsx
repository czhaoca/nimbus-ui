import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { SecurityReviewPage } from "../SecurityReviewPage";
import type { ReviewFinding } from "../types";

vi.mock("@/components/Toasts", () => ({
  showToast: vi.fn(),
}));

// Radix Select/Sheet in jsdom: pointer-capture and scrollIntoView APIs are
// missing; stub them so the primitives' internal guards don't throw.
beforeEach(() => {
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  window.HTMLElement.prototype.hasPointerCapture = vi.fn(() => false);
  window.HTMLElement.prototype.releasePointerCapture = vi.fn();
});

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope(data: unknown) {
  return { status: "success", message: "", data, action_log_id: 7 };
}

interface Routes {
  role?: string;
  findings?: ReviewFinding[] | { status: number; detail: string };
}

// Routed fetch stub: the page issues auth-me (role gate) + ops-bridge calls.
function routeFetch(routes: Routes) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/auth/me") {
      return json(200, { username: "u", role: routes.role ?? "viewer" });
    }
    if (path === "/api/v1/ops/security.review.list") {
      const f = routes.findings ?? [];
      if (!Array.isArray(f)) return json(f.status, { detail: f.detail });
      return json(200, envelope({ findings: f }));
    }
    if (path === "/api/v1/ops/security.review.dismiss") {
      return json(200, envelope({ finding_id: 12, status: "dismissed" }));
    }
    if (path === "/api/v1/ops/security.review.promote") {
      return json(
        200,
        envelope({ finding_id: 12, status: "promoted", proposal_id: 3, change_kind: "ip" }),
      );
    }
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof vi.fn>, path: string) {
  return fetchMock.mock.calls
    .map((c) => c[0] as Request)
    .filter((r) => new URL(r.url).pathname === path);
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SecurityReviewPage />
    </QueryClientProvider>,
  );
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

const PROMOTED: ReviewFinding = {
  ...FINDING,
  id: 13,
  severity: "MEDIUM",
  message: "Static lease outside its allocation",
  status: "promoted",
  promoted_proposal_id: 3,
};

describe("SecurityReviewPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists findings with severity and status badges", async () => {
    routeFetch({ findings: [FINDING, PROMOTED] });
    renderPage();

    expect(
      await screen.findByText("Firewall rule references a decommissioned VLAN"),
    ).toBeTruthy();
    expect(screen.getByText("HIGH")).toBeTruthy();
    expect(screen.getByText("open")).toBeTruthy();
    expect(screen.getByText("promoted")).toBeTruthy();
  });

  it("notes that on-demand runs stay on the ops surface", async () => {
    routeFetch({ findings: [] });
    renderPage();

    expect(await screen.findByText(/security\.review\.run/)).toBeTruthy();
  });

  it("viewer sees detail but no promote/dismiss affordances", async () => {
    routeFetch({ role: "viewer", findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /view/i }));

    expect(
      await screen.findByText("Delete the rule or re-point it at an active VLAN"),
    ).toBeTruthy();
    expect(screen.queryByRole("button", { name: /dismiss/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /promote/i })).toBeNull();
  });

  it("operator dismisses through the confirm dialog", async () => {
    const fetchMock = routeFetch({ role: "operator", findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /view/i }));
    await user.click(await screen.findByRole("button", { name: /dismiss/i }));

    // Confirm dialog with an optional note.
    const note = await screen.findByPlaceholderText(/note/i);
    await user.type(note, "false positive");
    await user.click(screen.getByRole("button", { name: /confirm dismiss/i }));

    await waitFor(() => {
      expect(callsTo(fetchMock, "/api/v1/ops/security.review.dismiss")).toHaveLength(1);
    });
    const req = callsTo(fetchMock, "/api/v1/ops/security.review.dismiss")[0];
    expect(await req.clone().json()).toMatchObject({
      finding_id: 12,
      note: "false positive",
    });
  });

  it("operator promote requires an allocation id before submitting", async () => {
    const fetchMock = routeFetch({ role: "operator", findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /view/i }));
    await user.click(await screen.findByRole("button", { name: /^promote/i }));

    const submit = await screen.findByRole("button", { name: /stage proposal/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText(/allocation id/i), "42");
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => {
      expect(callsTo(fetchMock, "/api/v1/ops/security.review.promote")).toHaveLength(1);
    });
    const req = callsTo(fetchMock, "/api/v1/ops/security.review.promote")[0];
    expect(await req.clone().json()).toMatchObject({
      finding_id: 12,
      allocation_id: 42,
    });
  });

  it("terminal findings get disabled actions for operators", async () => {
    routeFetch({ role: "operator", findings: [PROMOTED] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /view/i }));

    const dismiss = await screen.findByRole("button", { name: /dismiss/i });
    const promote = screen.getByRole("button", { name: /^promote/i });
    expect((dismiss as HTMLButtonElement).disabled).toBe(true);
    expect((promote as HTMLButtonElement).disabled).toBe(true);
  });

  it("severity filter is sent server-side in the list op body", async () => {
    const fetchMock = routeFetch({ findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await screen.findByText("Firewall rule references a decommissioned VLAN");
    const firstBody = await callsTo(
      fetchMock,
      "/api/v1/ops/security.review.list",
    )[0]
      .clone()
      .json();
    expect(firstBody.severity).toBeUndefined();

    await user.click(screen.getByRole("combobox", { name: /severity/i }));
    await user.click(await screen.findByRole("option", { name: "CRITICAL" }));

    await waitFor(async () => {
      const calls = callsTo(fetchMock, "/api/v1/ops/security.review.list");
      const lastBody = await calls[calls.length - 1].clone().json();
      expect(lastBody.severity).toBe("CRITICAL");
    });
  });

  it("status filter is sent server-side in the list op body", async () => {
    const fetchMock = routeFetch({ findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await screen.findByText("Firewall rule references a decommissioned VLAN");

    await user.click(screen.getByRole("combobox", { name: /status/i }));
    await user.click(await screen.findByRole("option", { name: "open" }));

    await waitFor(async () => {
      const calls = callsTo(fetchMock, "/api/v1/ops/security.review.list");
      const lastBody = await calls[calls.length - 1].clone().json();
      expect(lastBody.status).toBe("open");
    });
  });

  it("admin sees the same action affordances as operator", async () => {
    routeFetch({ role: "admin", findings: [FINDING] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /view/i }));

    expect(await screen.findByRole("button", { name: /dismiss/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^promote/i })).toBeTruthy();
  });

  it("shows the empty state distinct from an error", async () => {
    routeFetch({ findings: [] });
    renderPage();

    expect(await screen.findByText(/no findings/i)).toBeTruthy();
  });

  it("surfaces list errors honestly", async () => {
    routeFetch({ findings: { status: 500, detail: "review ledger unavailable" } });
    renderPage();

    expect(await screen.findByText(/review ledger unavailable/)).toBeTruthy();
  });
});
