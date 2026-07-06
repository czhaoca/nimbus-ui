import { api, unwrap } from "./client";

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
  return unwrap(api.GET("/api/v1/workflows"));
}

export function createWorkflow(data: {
  name: string;
  description: string;
  yaml_definition: string;
}): Promise<WorkflowSummary> {
  return unwrap(api.POST("/api/v1/workflows", { body: data }));
}

export function deleteWorkflow(id: string): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/workflows/{workflow_id}", {
      params: { path: { workflow_id: id } },
    }),
  );
}

export function runWorkflow(
  id: string,
  params: Record<string, unknown> = {},
  dryRun = false
): Promise<WorkflowRunSummary> {
  // Contract carries dry_run in the request body (WorkflowRunRequest),
  // not as the query param the legacy client sent.
  return unwrap(
    api.POST("/api/v1/workflows/{workflow_id}/run", {
      params: { path: { workflow_id: id } },
      body: { dry_run: dryRun, parameters: params },
    }),
  );
}

export function listWorkflowRuns(workflowId: string): Promise<WorkflowRunSummary[]> {
  return unwrap(
    api.GET("/api/v1/workflows/{workflow_id}/runs", {
      params: { path: { workflow_id: workflowId } },
    }),
  );
}
