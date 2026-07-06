import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { BudgetGuardianPage } from "../BudgetGuardianPage";
import type { BillingConfig, BudgetStatus } from "@/lib/types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope(data: unknown) {
  return { status: "success", message: "", data, action_log_id: null };
}

const PROVIDERS = [
  { id: "p-gcp", display_name: "GCP Main", provider_type: "gcp", is_active: true },
  { id: "p-oci", display_name: "OCI Home", provider_type: "oci", is_active: true },
  { id: "p-aws", display_name: "AWS Lab", provider_type: "aws", is_active: true },
];

const STATUSES: BudgetStatus[] = [
  {
    provider_id: null,
    period: "2026-07",
    total_spent: 12.5,
    monthly_limit: 100,
    utilization: 0.125,
    status: "ok",
    action_on_exceed: "alert",
    alerts: [],
  },
  {
    provider_id: "p-oci",
    period: "2026-07",
    total_spent: 55,
    monthly_limit: 50,
    utilization: 1.1,
    status: "exceeded",
    action_on_exceed: "alert",
    alerts: ["Budget exceeded: $55.00 / $50.00"],
  },
];

const CONFIGS: BillingConfig[] = [
  {
    id: "bc-gcp",
    provider_id: "p-gcp",
    billing_enabled: true,
    polling_interval_seconds: 3600,
    cache_ttl_seconds: 3600,
    // Never successfully polled (spend API unsupported) — must render an
    // unknown state, not the default-0 last_amount.
    last_poll_at: null,
    last_amount: 0,
    created_at: "2026-07-01T00:00:00+00:00",
    updated_at: "2026-07-01T00:00:00+00:00",
  },
  {
    id: "bc-oci",
    provider_id: "p-oci",
    billing_enabled: true,
    polling_interval_seconds: 3600,
    cache_ttl_seconds: 3600,
    last_poll_at: "2026-07-06T09:00:00+00:00",
    last_amount: 3.21,
    created_at: "2026-07-01T00:00:00+00:00",
    updated_at: "2026-07-06T09:00:00+00:00",
  },
];

const RULES = [
  {
    id: "rule-1",
    provider_id: null,
    monthly_limit: 100,
    alert_threshold: 0.8,
    action_on_exceed: "alert",
    is_active: true,
    created_at: "2026-07-01T00:00:00+00:00",
  },
];

const AUDIT_ROWS = [
  {
    id: "a-1",
    action_type: "terminate",
    created_at: "2026-07-05T10:00:00+00:00",
    details: { reason: "Budget exceeded: $55.00 / $50.00" },
    initiated_by: "budget_monitor",
    resource_id: "r-9",
    status: "pending",
  },
  {
    id: "a-2",
    action_type: "stop",
    created_at: "2026-07-05T09:00:00+00:00",
    details: {},
    initiated_by: "admin",
    resource_id: "r-2",
    status: "success",
  },
];

interface Overrides {
  digest?: { status: number; detail: string };
  audit?: typeof AUDIT_ROWS;
  providers?: { status: number; detail: string };
}

function routeFetch(overrides: Overrides = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/providers") {
      if (overrides.providers) {
        return json(overrides.providers.status, {
          detail: overrides.providers.detail,
        });
      }
      return json(200, PROVIDERS);
    }
    if (path === "/api/v1/ops/budget.digest") {
      if (overrides.digest) {
        return json(overrides.digest.status, { detail: overrides.digest.detail });
      }
      return json(200, envelope({ statuses: STATUSES, active_resources: 4 }));
    }
    if (path === "/api/v1/budget/rules") return json(200, RULES);
    if (path === "/api/v1/billing-configs") return json(200, CONFIGS);
    if (path === "/api/v1/audit") return json(200, overrides.audit ?? AUDIT_ROWS);
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <BudgetGuardianPage />
    </QueryClientProvider>,
  );
}

describe("BudgetGuardianPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders the digest: statuses with scope names and active-resource count", async () => {
    routeFetch();
    renderPage();

    // "Global" also shows in the rules table, so pin the digest's own row
    // by scoping every assertion to the Digest card.
    await screen.findAllByText("Global");
    const digestCard = screen
      .getByText("Digest")
      .closest('[data-slot="card"]') as HTMLElement;
    const globalRow = within(digestCard).getByText("Global").closest("tr");
    expect(within(globalRow as HTMLElement).getByText("ok")).toBeTruthy();
    expect(within(digestCard).getByText("OCI Home")).toBeTruthy();
    expect(within(digestCard).getByText("exceeded")).toBeTruthy();
    expect(within(digestCard).getByText("4")).toBeTruthy(); // active resources
  });

  it("shows unknown cost for a never-polled provider instead of $0", async () => {
    routeFetch();
    renderPage();

    const billingCard = (await screen.findByText("Provider Billing")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    // findByText: the card title renders before the providers/configs
    // queries resolve, so the rows arrive async.
    const gcpRow = (await within(billingCard).findByText("GCP Main")).closest(
      "tr",
    );
    expect(within(gcpRow as HTMLElement).getByText(/unknown/i)).toBeTruthy();
    expect(within(gcpRow as HTMLElement).queryByText(/\$0\.00/)).toBeNull();

    const ociRow = within(billingCard).getByText("OCI Home").closest("tr");
    expect(within(ociRow as HTMLElement).getByText("$3.21")).toBeTruthy();
  });

  it("marks providers without a billing config as not configured", async () => {
    routeFetch();
    renderPage();

    const row = (await screen.findByText("AWS Lab")).closest("tr");
    expect(within(row as HTMLElement).getByText(/not configured/i)).toBeTruthy();
    expect(within(row as HTMLElement).queryByText(/\$/)).toBeNull();
  });

  it("lists guardian rules read-only with the GAP-029 note and no buttons", async () => {
    routeFetch();
    renderPage();

    await screen.findAllByText("Global");
    expect(screen.getByText(/GAP-029/)).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows only budget_monitor rows as enforcement history", async () => {
    routeFetch();
    renderPage();

    const row = (await screen.findByText("r-9")).closest("tr");
    // The same alert text also shows in the digest panel — scope to the row.
    expect(
      within(row as HTMLElement).getByText(/Budget exceeded: \$55\.00/),
    ).toBeTruthy();
    expect(screen.queryByText("r-2")).toBeNull();
  });

  it("shows an explicit empty state when no enforcement was recorded", async () => {
    routeFetch({ audit: [] });
    renderPage();

    expect(
      await screen.findByText(/no budget enforcement actions/i),
    ).toBeTruthy();
  });

  it("surfaces digest errors honestly", async () => {
    routeFetch({ digest: { status: 500, detail: "digest backend down" } });
    renderPage();

    expect(await screen.findByText(/digest backend down/)).toBeTruthy();
  });

  it("shows an error in Provider Billing when the providers list fails", async () => {
    routeFetch({ providers: { status: 500, detail: "provider store down" } });
    renderPage();

    const billingCard = (await screen.findByText("Provider Billing")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(
      await within(billingCard).findByText(/provider store down/),
    ).toBeTruthy();
  });
});
