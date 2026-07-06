// Runner record shape returned by GET /api/v1/ci-runners (schema types the
// body as unknown; fields mirror the engine's list_ci_runners serializer).
export interface CiRunner {
  id: string;
  github_job_id: number;
  github_run_id: number;
  container_vmid: number;
  status: string; // pending | cloning | running | completed | failed | timeout
  repository: string;
  workflow_name: string;
  created_at: string | null;
  started_at: string | null;
  completed_at: string | null;
}
