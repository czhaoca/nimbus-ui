import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { OrchestrationPage } from "../OrchestrationPage";
import type { OrchestrationSchedule, TaskRun, TaskSnapshot } from "../types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const SCHEDULES: OrchestrationSchedule[] = [
  {
    id: "s-1",
    resource_id: "r-web",
    action: "stop",
    cron: "0 20 * * *",
    enabled: true,
    last_run: "2026-07-05T20:00:00+00:00",
  },
  {
    id: "s-2",
    resource_id: "r-web",
    action: "start",
    cron: "0 8 * * 1-5",
    enabled: false,
    last_run: null,
  },
];

const TASKS: TaskSnapshot[] = [
  {
    name: "oci-a1-hunter",
    description: "Retry OCI A1 capacity",
    schedule: "*/15 * * * *",
    execution_target: "host",
    last_run_at: "2026-07-06T09:45:00+00:00",
    last_status: "no_op",
    last_message: "capacity unavailable",
    last_result: {},
    total_runs: 812,
    is_complete: false,
    healthy: true,
  },
  {
    name: "nightly-backup",
    description: "Backup engine DB",
    schedule: null,
    execution_target: "host",
    last_run_at: "2026-07-06T02:00:00+00:00",
    last_status: "error",
    last_message: "disk full",
    last_result: {},
    total_runs: 41,
    is_complete: false,
    healthy: false,
  },
];

const RUNS: TaskRun[] = [
  {
    id: "run-1",
    status: "error",
    started_at: "2026-07-06T02:00:00+00:00",
    finished_at: "2026-07-06T02:00:09+00:00",
    invoked_by: "cron",
    actor: "scheduler",
    message: "",
    error_message: "disk full",
    result_json: null,
  },
];

interface Overrides {
  schedules?: OrchestrationSchedule[] | { status: number; detail: string };
  tasks?: TaskSnapshot[];
  runs?: TaskRun[] | { status: number; detail: string };
}

// Per-task runs so switching the inspected task is observable.
const RUNS_BY_TASK: Record<string, TaskRun[]> = {
  "nightly-backup": RUNS,
  "oci-a1-hunter": [
    { ...RUNS[0], id: "run-2", status: "no_op", error_message: null, message: "capacity unavailable" },
  ],
};

function routeFetch(overrides: Overrides = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/schedules") {
      const s = overrides.schedules ?? SCHEDULES;
      if (!Array.isArray(s)) return json(s.status, { detail: s.detail });
      return json(200, s);
    }
    if (path === "/api/v1/tasks") {
      return json(200, { tasks: overrides.tasks ?? TASKS });
    }
    const runsMatch = path.match(/^\/api\/v1\/tasks\/([^/]+)\/runs$/);
    if (runsMatch) {
      if (overrides.runs && !Array.isArray(overrides.runs)) {
        return json(overrides.runs.status, { detail: overrides.runs.detail });
      }
      const runs = overrides.runs ?? RUNS_BY_TASK[runsMatch[1]] ?? [];
      return json(200, { task: runsMatch[1], runs });
    }
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function callsTo(fetchMock: ReturnType<typeof vi.fn>, pattern: RegExp) {
  return fetchMock.mock.calls
    .map((c) => c[0] as Request)
    .filter((r) => pattern.test(new URL(r.url).pathname));
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <OrchestrationPage />
    </QueryClientProvider>,
  );
}

describe("OrchestrationPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("lists schedules with cron, action, and enabled state", async () => {
    routeFetch();
    renderPage();

    const enabledRow = (await screen.findByText("0 20 * * *")).closest("tr");
    expect(within(enabledRow as HTMLElement).getByText("Enabled")).toBeTruthy();
    const disabledRow = screen.getByText("0 8 * * 1-5").closest("tr");
    expect(within(disabledRow as HTMLElement).getByText("Disabled")).toBeTruthy();
    expect(screen.getByText("stop")).toBeTruthy();
  });

  it("lists tasks with health and schedule; on-demand tasks marked", async () => {
    routeFetch();
    renderPage();

    const hunterRow = (await screen.findByText("oci-a1-hunter")).closest("tr");
    expect(within(hunterRow as HTMLElement).getByText("*/15 * * * *")).toBeTruthy();
    expect(within(hunterRow as HTMLElement).getByText("healthy")).toBeTruthy();

    const backupRow = screen.getByText("nightly-backup").closest("tr");
    expect(within(backupRow as HTMLElement).getByText(/on-demand/i)).toBeTruthy();
    expect(within(backupRow as HTMLElement).getByText("error")).toBeTruthy();
    expect(within(backupRow as HTMLElement).getByText(/unhealthy/i)).toBeTruthy();
  });

  it("loads run history read-only when a task is inspected", async () => {
    const fetchMock = routeFetch();
    renderPage();
    const user = userEvent.setup();

    const backupRow = (await screen.findByText("nightly-backup")).closest("tr");
    await user.click(
      within(backupRow as HTMLElement).getByRole("button", { name: /runs/i }),
    );

    expect(await screen.findByText("disk full")).toBeTruthy();
    expect(
      callsTo(fetchMock, /^\/api\/v1\/tasks\/nightly-backup\/runs$/),
    ).toHaveLength(1);
  });

  it("offers no mutating affordances", async () => {
    routeFetch();
    renderPage();

    await screen.findByText("oci-a1-hunter");
    const buttons = screen.queryAllByRole("button");
    // Only per-task read-only "Runs" inspectors may render — any other
    // button (trigger/toggle/create/delete) fails this loop.
    expect(buttons.length).toBeGreaterThan(0);
    for (const b of buttons) {
      expect(b.textContent).toMatch(/runs/i);
    }
  });

  it("switching the inspected task fetches and shows that task's runs", async () => {
    const fetchMock = routeFetch();
    renderPage();
    const user = userEvent.setup();

    const hunterRow = (await screen.findByText("oci-a1-hunter")).closest("tr");
    await user.click(
      within(hunterRow as HTMLElement).getByRole("button", { name: /^runs/i }),
    );
    expect(await screen.findByText("capacity unavailable")).toBeTruthy();

    const backupRow = screen.getByText("nightly-backup").closest("tr");
    await user.click(
      within(backupRow as HTMLElement).getByRole("button", { name: /^runs/i }),
    );
    expect(await screen.findByText("disk full")).toBeTruthy();
    expect(
      callsTo(fetchMock, /^\/api\/v1\/tasks\/oci-a1-hunter\/runs$/),
    ).toHaveLength(1);
    expect(
      callsTo(fetchMock, /^\/api\/v1\/tasks\/nightly-backup\/runs$/),
    ).toHaveLength(1);
  });

  it("the runs inspector toggles closed from its own button", async () => {
    routeFetch();
    renderPage();
    const user = userEvent.setup();

    const backupRow = (await screen.findByText("nightly-backup")).closest("tr");
    await user.click(
      within(backupRow as HTMLElement).getByRole("button", { name: /^runs/i }),
    );
    expect(await screen.findByText(/Run History —/)).toBeTruthy();

    await user.click(
      within(backupRow as HTMLElement).getByRole("button", {
        name: /hide runs/i,
      }),
    );
    expect(screen.queryByText(/Run History —/)).toBeNull();
  });

  it("shows the run-history empty state", async () => {
    routeFetch({ runs: [] });
    renderPage();
    const user = userEvent.setup();

    const backupRow = (await screen.findByText("nightly-backup")).closest("tr");
    await user.click(
      within(backupRow as HTMLElement).getByRole("button", { name: /^runs/i }),
    );

    expect(await screen.findByText(/no recorded runs/i)).toBeTruthy();
  });

  it("surfaces run-history errors inside the inspector card", async () => {
    routeFetch({ runs: { status: 500, detail: "run store down" } });
    renderPage();
    const user = userEvent.setup();

    const backupRow = (await screen.findByText("nightly-backup")).closest("tr");
    await user.click(
      within(backupRow as HTMLElement).getByRole("button", { name: /^runs/i }),
    );

    expect(await screen.findByText(/run store down/)).toBeTruthy();
  });

  it("notes the deferred mutation surfaces honestly", async () => {
    routeFetch();
    renderPage();

    expect(
      await screen.findByText(/dns-failover|orchestrate/i),
    ).toBeTruthy();
  });

  it("shows empty states distinct from errors", async () => {
    routeFetch({ schedules: [], tasks: [] });
    renderPage();

    expect(await screen.findByText(/no resource schedules/i)).toBeTruthy();
    expect(screen.getByText(/no registered tasks/i)).toBeTruthy();
  });

  it("surfaces schedule-list errors honestly", async () => {
    routeFetch({ schedules: { status: 500, detail: "scheduler store down" } });
    renderPage();

    expect(await screen.findByText(/scheduler store down/)).toBeTruthy();
  });
});
