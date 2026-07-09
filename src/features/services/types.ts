/**
 * Services module types (#27).
 *
 * The /api/v1/services/* responses are untyped in the vendored schema,
 * so per DEC-4 this is a hand-written shim citing the engine serializer
 * it mirrors: engine/nimbus/services/sonarqube_lifecycle.py::
 * sonarqube_status (lines 185-204). `holders` is the live lease COUNT
 * (ADR-0009, lease.live_count); `detail` is present ONLY when
 * state === "crashed" (best-effort container exit info, #291).
 */

export type SonarServiceState = "up" | "starting" | "crashed" | "stopped";

export interface SonarServiceStatus {
  service: string;
  state: SonarServiceState;
  holders: number;
  detail?: Record<string, unknown>;
}
