import { api, unwrap } from "@/lib/api/client";

import type { CiRunner } from "./types";

// The only CI surface with a /api/v1 route (admin-only). Pipeline/cron/status
// live in the ops registry without REST routes and are deferred — see the
// note in CiStatusPage and issue #6.
export const fetchCiRunners = (activeOnly = false) =>
  unwrap<CiRunner[]>(
    api.GET("/api/v1/ci-runners", {
      params: { query: { active_only: activeOnly } },
    }),
  );
