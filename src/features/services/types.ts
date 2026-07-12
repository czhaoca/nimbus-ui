/**
 * Services module types (#27) — aliases over the vendored /api/v1
 * contract (SonarStatusOut; #40). `holders` is the live lease COUNT
 * (ADR-0009). `detail` is best-effort container exit info present only
 * when `state === "crashed"` — the contract types it optional and
 * nullable, so always read it defensively.
 */

import type { components } from "@/lib/api/schema";

export type SonarServiceStatus = components["schemas"]["SonarStatusOut"];

/** The lifecycle state union rides the component. */
export type SonarServiceState = SonarServiceStatus["state"];
