import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { fetchSchedules, fetchTaskRuns, fetchTasks } from "../api";
import type { OrchestrationSchedule, TaskRun, TaskSnapshot } from "../types";

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

const SCHEDULE: OrchestrationSchedule = {
  id: "s-1",
  resource_id: "r-1",
  action: "stop",
  cron: "0 20 * * *",
  enabled: true,
  last_run: "2026-07-05T20:00:00+00:00",
};

const TASK: TaskSnapshot = {
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
};

const RUN: TaskRun = {
  id: "abc123",
  status: "success",
  started_at: "2026-07-06T09:45:00+00:00",
  finished_at: "2026-07-06T09:45:05+00:00",
  invoked_by: "cron",
  actor: "scheduler",
  message: "done",
  error_message: null,
  result_json: null,
};

describe("orchestration api module", () => {
  it("lists schedules from /api/v1/schedules", async () => {
    const fetchMock = mockFetch(200, [SCHEDULE]);

    const schedules = await fetchSchedules();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/schedules");
    expect(req.method).toBe("GET");
    expect(schedules[0].cron).toBe("0 20 * * *");
    expect(schedules[0].last_run).toBe("2026-07-05T20:00:00+00:00");
  });

  it("unwraps the tasks envelope from /api/v1/tasks", async () => {
    const fetchMock = mockFetch(200, { tasks: [TASK] });

    const tasks = await fetchTasks();

    expect(new URL(requestOf(fetchMock).url).pathname).toBe("/api/v1/tasks");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].healthy).toBe(true);
  });

  it("fetches task runs with the limit param and unwraps .runs", async () => {
    const fetchMock = mockFetch(200, { task: "oci-a1-hunter", runs: [RUN] });

    const runs = await fetchTaskRuns("oci-a1-hunter");

    const url = new URL(requestOf(fetchMock).url);
    expect(url.pathname).toBe("/api/v1/tasks/oci-a1-hunter/runs");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(runs[0].status).toBe("success");
  });

  it("surfaces the unknown-task 404 detail", async () => {
    mockFetch(404, { detail: "Unknown task: nope" });

    await expect(fetchTaskRuns("nope")).rejects.toThrow("Unknown task: nope");
  });
});
