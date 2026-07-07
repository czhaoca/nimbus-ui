import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "../client";
import {
  createWorkflow,
  deleteWorkflow,
  listWorkflowRuns,
  listWorkflows,
  runWorkflow,
} from "../workflows";

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

const runSummary = {
  id: "run-1",
  workflow_id: "wf-1",
  status: "completed",
  trigger: "manual",
  started_at: "2026-07-06T10:00:00+00:00",
  completed_at: "2026-07-06T10:00:05+00:00",
  result: { steps: 2 },
};

describe("workflows api wrappers — CRUD paths and methods", () => {
  it("listWorkflows GETs /api/v1/workflows", async () => {
    const fetchMock = mockFetch(200, [
      {
        id: "wf-1",
        name: "nightly-lockdown",
        description: "Stop lab VMs overnight",
        is_active: true,
        created_at: "2026-07-01T00:00:00+00:00",
      },
    ]);

    const workflows = await listWorkflows();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/workflows");
    expect(req.method).toBe("GET");
    expect(workflows).toHaveLength(1);
    expect(workflows[0].id).toBe("wf-1");
  });

  it("createWorkflow POSTs /api/v1/workflows with the exact create body", async () => {
    const fetchMock = mockFetch(200, {
      id: "wf-2",
      name: "drain-198.51.100.0",
      description: "Drain the 198.51.100.0/24 test range",
      is_active: true,
      created_at: "2026-07-06T00:00:00+00:00",
    });

    const created = await createWorkflow({
      name: "drain-198.51.100.0",
      description: "Drain the 198.51.100.0/24 test range",
      yaml_definition: "steps:\n  - action: stop\n",
    });

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/workflows");
    expect(req.method).toBe("POST");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(await req.text())).toStrictEqual({
      name: "drain-198.51.100.0",
      description: "Drain the 198.51.100.0/24 test range",
      yaml_definition: "steps:\n  - action: stop\n",
    });
    expect(created.id).toBe("wf-2");
  });

  it("deleteWorkflow DELETEs /api/v1/workflows/{workflow_id}", async () => {
    const fetchMock = mockFetch(200, null);

    await deleteWorkflow("wf-1");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/workflows/wf-1");
    expect(req.method).toBe("DELETE");
  });

  it("listWorkflowRuns GETs /api/v1/workflows/{workflow_id}/runs", async () => {
    const fetchMock = mockFetch(200, [runSummary]);

    const runs = await listWorkflowRuns("wf-1");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/workflows/wf-1/runs");
    expect(req.method).toBe("GET");
    expect(runs[0].workflow_id).toBe("wf-1");
  });
});

describe("runWorkflow — dry_run/parameters ride in the request body (WorkflowRunRequest)", () => {
  // The contract carries dry_run in the body, not the query param the
  // legacy client sent — the exact body shape below is the load-bearing pin.

  it("defaults to dry_run:false with empty parameters, nothing in the query string", async () => {
    const fetchMock = mockFetch(200, runSummary);

    const run = await runWorkflow("wf-1");

    const req = requestOf(fetchMock);
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/workflows/wf-1/run");
    expect(req.method).toBe("POST");
    // Regression pin: the legacy client sent ?dry_run= as a query param.
    expect(url.search).toBe("");
    expect(req.headers.get("Content-Type")).toBe("application/json");
    expect(JSON.parse(await req.text())).toStrictEqual({
      dry_run: false,
      parameters: {},
    });
    expect(run.id).toBe("run-1");
  });

  it("sends dry_run:true with empty parameters when only dryRun is set", async () => {
    const fetchMock = mockFetch(200, runSummary);

    await runWorkflow("wf-1", {}, true);

    const req = requestOf(fetchMock);
    expect(new URL(req.url).search).toBe("");
    expect(JSON.parse(await req.text())).toStrictEqual({
      dry_run: true,
      parameters: {},
    });
  });

  it("sends dry_run:false with the caller's parameters in-body", async () => {
    const fetchMock = mockFetch(200, runSummary);

    await runWorkflow("wf-1", { target_cidr: "192.0.2.0/24", batch: 5 });

    const req = requestOf(fetchMock);
    expect(new URL(req.url).search).toBe("");
    expect(JSON.parse(await req.text())).toStrictEqual({
      dry_run: false,
      parameters: { target_cidr: "192.0.2.0/24", batch: 5 },
    });
  });

  it("sends dry_run:true together with parameters", async () => {
    const fetchMock = mockFetch(200, runSummary);

    await runWorkflow("wf-9", { host: "192.0.2.17" }, true);

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/workflows/wf-9/run");
    expect(JSON.parse(await req.text())).toStrictEqual({
      dry_run: true,
      parameters: { host: "192.0.2.17" },
    });
  });
});
