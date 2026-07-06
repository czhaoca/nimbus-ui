import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { AlertsPage } from "../AlertsPage";
import type { AlertRule } from "../types";

vi.mock("@/components/Toasts", () => ({
  showToast: vi.fn(),
}));

// Radix Select/Dialog in jsdom: pointer-capture and scrollIntoView APIs are
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

const CONFIG_STATUS = {
  configured: true,
  webhook_count: 1,
  slack_webhook_count: 2,
  discord_webhook_count: 0,
  email_recipients: 3,
  enabled_channels: ["webhook", "slack"],
  config_path: "local/config/alerts.json",
};

interface Routes {
  role?: string;
  rules?: AlertRule[] | { status: number; detail: string };
  audit?: unknown[];
}

// Routed fetch stub: auth-me (role gate) + rules REST + config-status +
// audit-derived silence + the two-phase silence ops.
function routeFetch(routes: Routes) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/auth/me") {
      return json(200, { username: "u", role: routes.role ?? "viewer" });
    }
    if (path === "/api/v1/alerts/rules" && req.method === "GET") {
      const r = routes.rules ?? [];
      if (!Array.isArray(r)) return json(r.status, { detail: r.detail });
      return json(200, r);
    }
    if (path === "/api/v1/alerts/rules" && req.method === "POST") {
      const body = await req.clone().json();
      return json(200, { ...body, id: "new-rule-1", created_at: null });
    }
    if (path.startsWith("/api/v1/alerts/rules/") && req.method === "DELETE") {
      return json(200, { deleted: path.split("/").pop() });
    }
    if (path === "/api/v1/alerts/config-status") {
      return json(200, CONFIG_STATUS);
    }
    if (path === "/api/v1/audit") {
      return json(200, routes.audit ?? []);
    }
    if (path === "/api/v1/ops/alerts.silence/dryrun") {
      return json(200, {
        action_log_id: "log-uuid-1",
        summary: "silence 60m",
        data: {
          status: "preview",
          duration_minutes: 60,
          until: "2099-01-01T12:00:00+00:00",
          existing_until: "2099-01-01T00:30:00+00:00",
        },
      });
    }
    if (path === "/api/v1/ops/alerts.silence/confirm") {
      return json(200, {
        status: "success",
        message: "",
        data: { duration_minutes: 60, until: "2099-01-01T12:00:00+00:00" },
        action_log_id: "log-uuid-1",
      });
    }
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(
  fetchMock: ReturnType<typeof vi.fn>,
  path: string,
  method?: string,
) {
  return fetchMock.mock.calls
    .map((c) => c[0] as Request)
    .filter(
      (r) =>
        new URL(r.url).pathname === path && (!method || r.method === method),
    );
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AlertsPage />
    </QueryClientProvider>,
  );
}

const RULE: AlertRule = {
  id: "ab12cd34",
  name: "Monthly spend cap",
  metric: "spending",
  operator: "gt",
  threshold: 100,
  severity: "critical",
  created_at: "2026-07-01T00:00:00+00:00",
};

const SILENCE_ROW = {
  id: "a-1",
  action_type: "alert_silence",
  created_at: "2026-07-05T00:00:00+00:00",
  details: { until: "2099-01-01T00:30:00+00:00" },
  initiated_by: "operator",
  resource_id: null,
  status: "success",
};

describe("AlertsPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists rules with metric and severity rendering", async () => {
    routeFetch({ rules: [RULE] });
    renderPage();

    expect(await screen.findByText("Monthly spend cap")).toBeTruthy();
    expect(screen.getByText("spending")).toBeTruthy();
    expect(screen.getByText("critical")).toBeTruthy();
  });

  it("states the missing active-alerts/history surface honestly", async () => {
    routeFetch({});
    renderPage();

    expect(
      await screen.findByText(/no.*active-alerts feed or alert-history/i),
    ).toBeTruthy();
  });

  it("viewer sees no mutation affordances anywhere", async () => {
    routeFetch({ role: "viewer", rules: [RULE], audit: [SILENCE_ROW] });
    renderPage();

    await screen.findByText("Monthly spend cap");
    expect(screen.queryByRole("button", { name: /new rule/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /silence alerts/i })).toBeNull();
  });

  it("notes that the rules role gate has no engine backstop", async () => {
    routeFetch({ role: "operator", rules: [RULE] });
    renderPage();

    await screen.findByText("Monthly spend cap");
    expect(screen.getByText(/UI-only.*no server-side role gate/i)).toBeTruthy();
  });

  it("operator creates a rule through the dialog", async () => {
    const fetchMock = routeFetch({ role: "operator", rules: [RULE] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /new rule/i }));

    const submit = await screen.findByRole("button", { name: /create rule/i });
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByLabelText(/name/i), "Idle fleet");
    await user.type(screen.getByLabelText(/threshold/i), "25");
    expect((submit as HTMLButtonElement).disabled).toBe(false);
    await user.click(submit);

    await waitFor(() => {
      expect(callsTo(fetchMock, "/api/v1/alerts/rules", "POST")).toHaveLength(1);
    });
    const req = callsTo(fetchMock, "/api/v1/alerts/rules", "POST")[0];
    expect(await req.clone().json()).toEqual({
      name: "Idle fleet",
      metric: "spending",
      operator: "gt",
      threshold: 25,
      severity: "warning",
    });
  });

  it("operator deletes a rule through the confirm dialog", async () => {
    const fetchMock = routeFetch({ role: "operator", rules: [RULE] });
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /delete/i }));
    await user.click(
      await screen.findByRole("button", { name: /confirm delete/i }),
    );

    await waitFor(() => {
      expect(
        callsTo(fetchMock, "/api/v1/alerts/rules/ab12cd34", "DELETE"),
      ).toHaveLength(1);
    });
  });

  it("shows channel config-status read-only with a link to Settings", async () => {
    routeFetch({});
    renderPage();

    expect(await screen.findByText("Slack")).toBeTruthy();
    expect(screen.getByText("Email recipients")).toBeTruthy();
    const link = screen.getByRole("link", { name: /settings/i });
    expect(link.getAttribute("href")).toBe("/settings");
    // Read-only: no channel editing or test-alert affordances here.
    expect(screen.queryByRole("button", { name: /test alert/i })).toBeNull();
  });

  it("shows 'not silenced' when the audit trail has no active window", async () => {
    routeFetch({ audit: [] });
    renderPage();

    expect(await screen.findByText(/not silenced/i)).toBeTruthy();
  });

  it("shows the active silence window derived from the audit trail", async () => {
    routeFetch({ audit: [SILENCE_ROW] });
    renderPage();

    expect(await screen.findByText(/silenced until/i)).toBeTruthy();
  });

  it("operator silences through dryrun preview then confirm", async () => {
    const fetchMock = routeFetch({ role: "operator", audit: [] });
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /silence alerts/i }),
    );

    const preview = await screen.findByRole("button", { name: /preview/i });
    await user.type(screen.getByLabelText(/duration/i), "60");
    await user.click(preview);

    await waitFor(() => {
      expect(
        callsTo(fetchMock, "/api/v1/ops/alerts.silence/dryrun", "POST"),
      ).toHaveLength(1);
    });
    const dryrunReq = callsTo(
      fetchMock,
      "/api/v1/ops/alerts.silence/dryrun",
      "POST",
    )[0];
    expect(await dryrunReq.clone().json()).toEqual({ duration_minutes: 60 });

    // The dryrun preview (until + the existing window it would replace) is
    // shown before the confirm.
    expect(await screen.findByText(/would silence until/i)).toBeTruthy();
    expect(screen.getByText(/replaces the current window/i)).toBeTruthy();

    await user.click(screen.getByRole("button", { name: /confirm silence/i }));

    await waitFor(() => {
      expect(
        callsTo(fetchMock, "/api/v1/ops/alerts.silence/confirm", "POST"),
      ).toHaveLength(1);
    });
    const confirmReq = callsTo(
      fetchMock,
      "/api/v1/ops/alerts.silence/confirm",
      "POST",
    )[0];
    expect(await confirmReq.clone().json()).toEqual({
      action_log_id: "log-uuid-1",
    });
  });

  it("surfaces rules list errors honestly", async () => {
    routeFetch({ rules: { status: 500, detail: "rules store unavailable" } });
    renderPage();

    expect(await screen.findByText(/rules store unavailable/)).toBeTruthy();
  });
});
