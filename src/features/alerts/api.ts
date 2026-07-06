import { api, getAuditLogs, unwrap } from "@/lib/api/client";
import type { OpEnvelope } from "@/lib/api/ops";
import type { AlertRuleCreate } from "@/lib/types";

import type {
  ActiveSilence,
  AlertConfigStatus,
  AlertRule,
  SilenceConfirmData,
  SilenceDryrun,
} from "./types";

// Rules CRUD is plain authenticated REST — no server-side role gate (unlike
// the Tier-2 alerts.silence op below), so the page's operator gate on
// create/delete is cosmetic-only and the UI says so (DEC-A panel condition).

export const fetchAlertRules = () =>
  unwrap<AlertRule[]>(api.GET("/api/v1/alerts/rules"));

export const createAlertRule = (input: AlertRuleCreate) =>
  unwrap<AlertRule>(api.POST("/api/v1/alerts/rules", { body: input }));

export const deleteAlertRule = (ruleId: string) =>
  unwrap<{ deleted: string }>(
    api.DELETE("/api/v1/alerts/rules/{rule_id}", {
      params: { path: { rule_id: ruleId } },
    }),
  );

export const fetchAlertConfigStatus = () =>
  unwrap<AlertConfigStatus>(api.GET("/api/v1/alerts/config-status"));

// Mirrors the engine's services.alerts.get_active_silence: the latest
// successful alert_silence ActionLog row IS the silence record (its
// details.until ends the window). A newer row always supersedes older ones —
// a shorter re-silence cuts a longer window — and expired or unparseable
// windows mean "not silenced". Honest cap: rows older than the newest `limit`
// audit entries are only visible on /audit.
export const fetchActiveSilence = async (
  limit = 50,
): Promise<ActiveSilence | null> => {
  const logs = await getAuditLogs({ action_type: "alert_silence", limit });
  const newest = logs
    .filter((l) => l.status === "success")
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  if (!newest) return null;
  const until = newest.details?.until;
  if (typeof until !== "string") return null;
  const ts = new Date(until).getTime();
  if (Number.isNaN(ts) || ts <= Date.now()) return null;
  return { until, recordedAt: newest.created_at };
};

// alerts.silence is two-phase (Tier-2, operator, engine-enforced 403): the
// dryrun stages a pending ActionLog row and returns its id as the confirm
// token; the confirm applies it. The single-phase executeOp path is refused
// by the engine for two-phase ops.

export const dryrunSilence = (durationMinutes: number) =>
  unwrap<SilenceDryrun>(
    api.POST("/api/v1/ops/{op_id}/dryrun", {
      params: { path: { op_id: "alerts.silence" } },
      body: { duration_minutes: durationMinutes },
    }),
  );

export const confirmSilence = (actionLogId: string) =>
  unwrap<OpEnvelope<SilenceConfirmData>>(
    api.POST("/api/v1/ops/{op_id}/confirm", {
      params: { path: { op_id: "alerts.silence" } },
      body: { action_log_id: actionLogId },
    }),
  );
