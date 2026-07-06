import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import {
  confirmSilence,
  createAlertRule,
  deleteAlertRule,
  dryrunSilence,
  fetchActiveSilence,
  fetchAlertConfigStatus,
  fetchAlertRules,
} from "../api";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

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

const RULE = {
  id: "ab12cd34",
  name: "Monthly spend cap",
  metric: "spending",
  operator: "gt",
  threshold: 100,
  severity: "critical",
  created_at: "2026-07-01T00:00:00+00:00",
};

const auditRow = (
  id: string,
  createdAt: string,
  status: string,
  until: unknown,
) => ({
  id,
  action_type: "alert_silence",
  created_at: createdAt,
  details: until === undefined ? {} : { until },
  initiated_by: "operator",
  resource_id: null,
  status,
});

describe("alerts api module", () => {
  it("lists rules from GET /api/v1/alerts/rules", async () => {
    const fetchMock = mockFetch(200, [RULE]);

    const rules = await fetchAlertRules();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/alerts/rules");
    expect(req.method).toBe("GET");
    expect(rules[0].metric).toBe("spending");
    expect(rules[0].threshold).toBe(100);
  });

  it("creates a rule with the AlertRuleCreate body", async () => {
    const fetchMock = mockFetch(200, RULE);

    const rule = await createAlertRule({
      name: "Monthly spend cap",
      metric: "spending",
      operator: "gt",
      threshold: 100,
      severity: "critical",
    });

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/alerts/rules");
    expect(req.method).toBe("POST");
    expect(await req.clone().json()).toEqual({
      name: "Monthly spend cap",
      metric: "spending",
      operator: "gt",
      threshold: 100,
      severity: "critical",
    });
    expect(rule.id).toBe("ab12cd34");
  });

  it("surfaces the engine's 400 detail on an invalid rule", async () => {
    mockFetch(400, {
      detail: "metric must be one of: ['spending', 'resource_count', 'health_status']",
    });

    await expect(
      createAlertRule({
        name: "bad",
        metric: "nope",
        operator: "gt",
        threshold: 1,
        severity: "warning",
      }),
    ).rejects.toThrow(/metric must be one of/);
  });

  it("deletes a rule by id", async () => {
    const fetchMock = mockFetch(200, { deleted: "ab12cd34" });

    await deleteAlertRule("ab12cd34");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/alerts/rules/ab12cd34");
    expect(req.method).toBe("DELETE");
  });

  it("fetches channel config-status", async () => {
    const fetchMock = mockFetch(200, {
      configured: true,
      webhook_count: 1,
      slack_webhook_count: 2,
      discord_webhook_count: 0,
      email_recipients: 3,
      enabled_channels: ["webhook", "slack", "email"],
      config_path: "local/config/alerts.json",
    });

    const status = await fetchAlertConfigStatus();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/alerts/config-status");
    expect(status.configured).toBe(true);
    expect(status.slack_webhook_count).toBe(2);
  });

  describe("active-silence derivation (mirrors engine get_active_silence)", () => {
    it("queries the audit trail filtered to alert_silence", async () => {
      const fetchMock = mockFetch(200, []);

      const silence = await fetchActiveSilence();

      const req = requestOf(fetchMock);
      const url = new URL(req.url);
      expect(url.pathname).toBe("/api/v1/audit");
      expect(url.searchParams.get("action_type")).toBe("alert_silence");
      expect(silence).toBeNull();
    });

    it("the newest successful row wins, even over a longer older window", async () => {
      // Older row silences until 2099; the newer, shorter re-silence cuts it —
      // exactly the supersede rule the engine applies.
      mockFetch(200, [
        auditRow("a-1", "2026-07-01T00:00:00+00:00", "success", "2099-12-31T00:00:00+00:00"),
        auditRow("a-2", "2026-07-05T00:00:00+00:00", "success", "2098-01-01T00:00:00+00:00"),
      ]);

      const silence = await fetchActiveSilence();

      expect(silence?.until).toBe("2098-01-01T00:00:00+00:00");
    });

    it("ignores non-success rows", async () => {
      mockFetch(200, [
        auditRow("a-1", "2026-07-05T00:00:00+00:00", "pending", "2099-12-31T00:00:00+00:00"),
        auditRow("a-2", "2026-07-01T00:00:00+00:00", "success", "2097-01-01T00:00:00+00:00"),
      ]);

      const silence = await fetchActiveSilence();

      expect(silence?.until).toBe("2097-01-01T00:00:00+00:00");
    });

    it("an expired window means not silenced", async () => {
      mockFetch(200, [
        auditRow("a-1", "2020-01-01T00:00:00+00:00", "success", "2020-01-02T00:00:00+00:00"),
      ]);

      expect(await fetchActiveSilence()).toBeNull();
    });

    it("an unparseable or missing until means not silenced", async () => {
      mockFetch(200, [
        auditRow("a-1", "2026-07-05T00:00:00+00:00", "success", "not-a-date"),
        auditRow("a-2", "2026-07-04T00:00:00+00:00", "success", undefined),
      ]);

      expect(await fetchActiveSilence()).toBeNull();
    });
  });

  describe("two-phase silence (ops bridge)", () => {
    it("dryrun posts duration_minutes to the alerts.silence dryrun route", async () => {
      const fetchMock = mockFetch(200, {
        action_log_id: "log-uuid-1",
        summary: "silence 60m",
        data: {
          status: "preview",
          duration_minutes: 60,
          until: "2026-07-06T12:00:00+00:00",
          existing_until: null,
        },
      });

      const preview = await dryrunSilence(60);

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/ops/alerts.silence/dryrun");
      expect(req.method).toBe("POST");
      expect(await req.clone().json()).toEqual({ duration_minutes: 60 });
      expect(preview.action_log_id).toBe("log-uuid-1");
      expect(preview.data.until).toBe("2026-07-06T12:00:00+00:00");
    });

    it("confirm posts the pending action_log_id back", async () => {
      const fetchMock = mockFetch(200, {
        status: "success",
        message: "",
        data: { duration_minutes: 60, until: "2026-07-06T12:00:00+00:00" },
        action_log_id: "log-uuid-1",
      });

      const result = await confirmSilence("log-uuid-1");

      const req = requestOf(fetchMock);
      expect(new URL(req.url).pathname).toBe("/api/v1/ops/alerts.silence/confirm");
      expect(req.method).toBe("POST");
      expect(await req.clone().json()).toEqual({ action_log_id: "log-uuid-1" });
      expect(result.data.until).toBe("2026-07-06T12:00:00+00:00");
    });

    it("surfaces the engine's 403 denial for viewers", async () => {
      mockFetch(403, { detail: "denied" });

      await expect(dryrunSilence(60)).rejects.toThrow(/denied/);
    });
  });
});
