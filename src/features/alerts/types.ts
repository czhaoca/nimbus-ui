// Rule row shape returned by the /api/v1/alerts/rules endpoints (responses
// are unknown in the schema; fields mirror the engine's _serialize_alert_rule
// in nimbus/domains/operations/alerts.py). The create BODY is schema-typed —
// use the AlertRuleCreate alias from @/lib/types (DEC-4).
export interface AlertRule {
  id: string;
  name: string;
  metric: string; // spending | resource_count | health_status
  operator: string; // gt | lt | eq
  threshold: number;
  severity: string; // engine default "warning"; UI offers info | warning | critical
  created_at: string | null;
}

// Engine-validated field sets (core/services/alert_rules.py VALID_METRICS /
// VALID_OPERATORS; invalid values → 400 detail). Severity is free-form on the
// engine side — these are the UI's offered levels.
export const RULE_METRICS = ["spending", "resource_count", "health_status"] as const;
export const RULE_OPERATORS = ["gt", "lt", "eq"] as const;
export const RULE_SEVERITIES = ["info", "warning", "critical"] as const;

// Mirrors the engine's alert_config_status (nimbus/domains/operations/alerts.py).
export interface AlertConfigStatus {
  configured: boolean;
  webhook_count: number;
  slack_webhook_count: number;
  discord_webhook_count: number;
  email_recipients: number;
  enabled_channels: string[];
  config_path: string;
}

// Envelope of POST /api/v1/ops/{op_id}/dryrun (op_registry/adapters/api.py
// dryrun_op): action_log_id is the pending row the confirm applies; data
// mirrors _silence_dryrun in op_registry/ops/alerts.py.
export interface SilenceDryrun {
  action_log_id: string | null;
  summary: string;
  data: {
    status: string;
    duration_minutes: number;
    until: string;
    existing_until: string | null;
  };
}

// alerts.silence confirm result data (_silence_confirm; the window restarts
// at confirm time, so this until — not the dryrun preview — is the record).
export interface SilenceConfirmData {
  duration_minutes: number;
  until: string;
}

// Active window derived from the audit trail (see fetchActiveSilence).
export interface ActiveSilence {
  until: string;
  recordedAt: string;
}

// Engine bound: AlertSilenceParams duration_minutes ≤ one week.
export const MAX_SILENCE_MINUTES = 10080;
