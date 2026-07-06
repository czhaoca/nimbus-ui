// Shapes mirror the engine's orchestration surface (untyped in the schema):
// ResourceSchedule rows, TaskStatus.to_dict() snapshots, and TaskRun rows.

export interface OrchestrationSchedule {
  id: string;
  resource_id: string;
  action: string; // start | stop
  cron: string;
  enabled: boolean;
  // The engine stores no computed next-run — only cron + last_run are shown
  // (fabricating a client-side next-run could drift from the scheduler).
  last_run: string | null;
  created_at?: string;
}

export interface TaskSnapshot {
  name: string;
  description: string;
  schedule: string | null; // cron, or null = on-demand only
  execution_target: string;
  last_run_at: string | null;
  last_status: string | null; // success | no_op | rate_limited | error | skipped | pending
  last_message: string;
  last_result: Record<string, unknown>;
  total_runs: number;
  is_complete: boolean;
  healthy: boolean;
}

export interface TaskRun {
  id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  invoked_by: string;
  actor: string;
  message: string;
  error_message: string | null;
  result_json: Record<string, unknown> | null;
}
