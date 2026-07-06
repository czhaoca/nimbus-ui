import { api, unwrap } from "@/lib/api/client";

import type { OrchestrationSchedule, TaskRun, TaskSnapshot } from "./types";

// Read-only surface (issue #9): schedule create/delete/toggle, task trigger
// (admin), the run callback, and the /orchestrate triggers are mutations and
// deliberately have no wrappers here.
export const fetchSchedules = () =>
  unwrap<OrchestrationSchedule[]>(api.GET("/api/v1/schedules"));

export const fetchTasks = async (): Promise<TaskSnapshot[]> => {
  const body = await unwrap<{ tasks: TaskSnapshot[] }>(
    api.GET("/api/v1/tasks"),
  );
  return body.tasks;
};

export const fetchTaskRuns = async (
  name: string,
  limit = 20,
): Promise<TaskRun[]> => {
  const body = await unwrap<{ task: string; runs: TaskRun[] }>(
    api.GET("/api/v1/tasks/{name}/runs", {
      params: { path: { name }, query: { limit } },
    }),
  );
  return body.runs;
};
