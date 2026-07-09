import { api, unwrap } from "@/lib/api/client";

import type { SonarServiceStatus } from "./types";

// Both query params are optional with server defaults env_type="prod",
// slot_key="primary" (service_lifecycle.py:92-97) — call with none and
// label the shown slot in the UI rather than inventing one.
export const fetchSonarqubeStatus = () =>
  unwrap<SonarServiceStatus>(api.GET("/api/v1/services/sonarqube/status"));
