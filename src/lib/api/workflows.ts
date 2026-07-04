const BASE = "/api";

function headers(): Record<string, string> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = sessionStorage.getItem("nimbus_token");
    if (token) h["Authorization"] = `Bearer ${token}`;
  }
  return h;
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { ...headers(), ...init?.headers } });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || res.statusText);
  }
  return res.json();
}

export interface WorkflowSummary {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
}

export interface WorkflowRunSummary {
  id: string;
  workflow_id: string;
  status: string;
  trigger: string;
  started_at: string | null;
  completed_at: string | null;
  result: Record<string, unknown>;
}

export function listWorkflows(): Promise<WorkflowSummary[]> {
  return request(`${BASE}/workflows`);
}

export function createWorkflow(data: {
  name: string;
  description: string;
  yaml_definition: string;
}): Promise<WorkflowSummary> {
  return request(`${BASE}/workflows`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export function deleteWorkflow(id: string): Promise<void> {
  return request(`${BASE}/workflows/${id}`, { method: "DELETE" });
}

export function runWorkflow(
  id: string,
  params: Record<string, unknown> = {},
  dryRun = false
): Promise<WorkflowRunSummary> {
  return request(`${BASE}/workflows/${id}/run?dry_run=${dryRun}`, {
    method: "POST",
    body: JSON.stringify({ parameters: params }),
  });
}

export function listWorkflowRuns(workflowId: string): Promise<WorkflowRunSummary[]> {
  return request(`${BASE}/workflows/${workflowId}/runs`);
}
