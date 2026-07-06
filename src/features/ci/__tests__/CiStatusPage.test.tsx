import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { CiStatusPage } from "../CiStatusPage";
import type { CiRunner } from "../types";

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

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <CiStatusPage />
    </QueryClientProvider>,
  );
}

const RUNNERS: CiRunner[] = [
  {
    id: "3f6a2c9e-0000-4000-8000-000000000001",
    github_job_id: 101,
    github_run_id: 900,
    container_vmid: 2101,
    status: "running",
    repository: "acme/widgets",
    workflow_name: "build",
    created_at: "2026-07-06T10:00:00+00:00",
    started_at: "2026-07-06T10:00:05+00:00",
    completed_at: null,
  },
  {
    id: "3f6a2c9e-0000-4000-8000-000000000002",
    github_job_id: 102,
    github_run_id: 901,
    container_vmid: 2102,
    status: "failed",
    repository: "acme/gadgets",
    workflow_name: "deploy",
    created_at: "2026-07-06T09:00:00+00:00",
    started_at: "2026-07-06T09:00:05+00:00",
    completed_at: "2026-07-06T09:05:00+00:00",
  },
];

describe("CiStatusPage", () => {
  beforeEach(() => {
    setAuthToken("admin-token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders runner rows with status badges", async () => {
    mockFetch(200, RUNNERS);
    renderPage();

    expect(await screen.findByText("acme/widgets")).toBeTruthy();
    expect(screen.getByText("acme/gadgets")).toBeTruthy();
    expect(screen.getByText("running")).toBeTruthy();
    expect(screen.getByText("failed")).toBeTruthy();
  });

  it("visibly notes the deferred pipeline/cron surfaces", async () => {
    mockFetch(200, RUNNERS);
    renderPage();

    await screen.findByText("acme/widgets");
    expect(screen.getByText(/pipeline and cron status/i)).toBeTruthy();
    expect(screen.getByText(/nimbus ci status/)).toBeTruthy();
  });

  it("offers no mutating affordances", async () => {
    mockFetch(200, RUNNERS);
    renderPage();

    await screen.findByText("acme/widgets");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("surfaces the admin-only rejection", async () => {
    mockFetch(403, { detail: "Admin privileges required" });
    renderPage();

    expect(await screen.findByText(/Admin privileges required/)).toBeTruthy();
  });

  it("shows an empty state when no runners exist", async () => {
    mockFetch(200, []);
    renderPage();

    expect(await screen.findByText(/no runner records/i)).toBeTruthy();
  });

  it("derives summary counts from the full status vocabulary", async () => {
    // One runner per engine status: active = pending|cloning|running,
    // failed bucket = failed|timeout, completed counts only toward total.
    const statuses = [
      "pending",
      "cloning",
      "running",
      "completed",
      "failed",
      "timeout",
    ];
    mockFetch(
      200,
      statuses.map((status, i) => ({
        ...RUNNERS[0],
        id: `runner-${i}`,
        github_job_id: 200 + i,
        status,
      })),
    );
    renderPage();

    await screen.findByText("pending");

    const cardValue = (label: string) => {
      const card = screen.getByText(label).closest('[data-slot="card"]');
      if (!card) throw new Error(`no card for ${label}`);
      return within(card as HTMLElement);
    };
    expect(cardValue("Active Runners").getByText("3")).toBeTruthy();
    expect(cardValue("Total Records").getByText("6")).toBeTruthy();
    expect(cardValue("Failed / Timed Out").getByText("2")).toBeTruthy();
  });
});
