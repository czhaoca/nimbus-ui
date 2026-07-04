"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getSettings,
  updateSetting,
  getAlertConfig,
  updateAlertConfig,
  testAlert,
} from "@/lib/api/client";
import type { AlertConfigData } from "@/lib/api/client";
import { showToast } from "@/components/Toasts";
import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

/* ---------- constants ---------- */

const INTERVAL_KEYS = [
  { key: "sync_interval_seconds", label: "Sync Interval", unit: "seconds" },
  { key: "health_check_interval_seconds", label: "Health Check Interval", unit: "seconds" },
  { key: "budget_check_interval_seconds", label: "Budget Check Interval", unit: "seconds" },
];

/* ---------- page ---------- */

export default function SettingsPage() {
  const queryClient = useQueryClient();

  /* settings data */
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: getSettings,
  });

  /* alert config data */
  const { data: alertConfig, isLoading: alertLoading } = useQuery({
    queryKey: ["alert-config"],
    queryFn: getAlertConfig,
  });

  /* local form state for intervals */
  const [intervalValues, setIntervalValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (settings) {
      const vals: Record<string, string> = {};
      INTERVAL_KEYS.forEach((ik) => {
        vals[ik.key] = settings[ik.key] ?? "";
      });
      setIntervalValues(vals);
    }
  }, [settings]);

  /* local form state for SMTP / alerts */
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("587");
  const [emailFrom, setEmailFrom] = useState("");
  const [emailTo, setEmailTo] = useState("");
  const [webhooks, setWebhooks] = useState("");

  useEffect(() => {
    if (alertConfig) {
      setSmtpHost(alertConfig.smtp_host ?? "");
      setSmtpPort(String(alertConfig.smtp_port ?? 587));
      setEmailFrom(alertConfig.email_from ?? "");
      setEmailTo((alertConfig.email_to ?? []).join(", "));
      setWebhooks((alertConfig.webhooks ?? []).join("\n"));
    }
  }, [alertConfig]);

  /* mutations */
  const updateSettingMut = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      updateSetting(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      showToast("Setting updated", "success");
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const updateAlertMut = useMutation({
    mutationFn: updateAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-config"] });
      showToast("Alert config updated", "success");
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const testAlertMut = useMutation({
    mutationFn: testAlert,
    onSuccess: () => showToast("Test alert sent", "success"),
    onError: (e) => showToast((e as Error).message, "error"),
  });

  /* handlers */
  const saveInterval = (key: string) => {
    const value = intervalValues[key];
    if (value !== undefined) {
      updateSettingMut.mutate({ key, value });
    }
  };

  const saveAlertConfig = () => {
    const config: AlertConfigData = {
      smtp_host: smtpHost,
      smtp_port: parseInt(smtpPort, 10) || 587,
      email_from: emailFrom,
      email_to: emailTo
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      webhooks: webhooks
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    updateAlertMut.mutate(config);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" />

      {/* Interval settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Intervals</CardTitle>
        </CardHeader>
        <CardContent>
          {settingsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-9 w-32" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-9 w-16" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {INTERVAL_KEYS.map((ik) => (
                <div key={ik.key} className="flex items-center gap-3">
                  <Label className="w-48 shrink-0 text-muted-foreground">
                    {ik.label}
                  </Label>
                  <Input
                    type="number"
                    value={intervalValues[ik.key] ?? ""}
                    onChange={(e) =>
                      setIntervalValues((prev) => ({
                        ...prev,
                        [ik.key]: e.target.value,
                      }))
                    }
                    className="w-32"
                  />
                  <span className="text-xs text-muted-foreground">{ik.unit}</span>
                  <Button
                    size="sm"
                    disabled={updateSettingMut.isPending}
                    onClick={() => saveInterval(ik.key)}
                  >
                    Save
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* SMTP Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">SMTP Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          {alertLoading ? (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="smtp-host">SMTP Host</Label>
                  <Input
                    id="smtp-host"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtp-port">SMTP Port</Label>
                  <Input
                    id="smtp-port"
                    type="number"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-from">From Address</Label>
                <Input
                  id="email-from"
                  value={emailFrom}
                  onChange={(e) => setEmailFrom(e.target.value)}
                  placeholder="alerts@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email-to">
                  To Addresses{" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    (comma-separated)
                  </span>
                </Label>
                <Input
                  id="email-to"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  placeholder="admin@example.com, ops@example.com"
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook Config */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Webhooks</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="webhooks">
              Webhook URLs{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (one per line)
              </span>
            </Label>
            <Textarea
              id="webhooks"
              value={webhooks}
              onChange={(e) => setWebhooks(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              rows={3}
              className="resize-y"
            />
          </div>
        </CardContent>
      </Card>

      {/* Alert actions */}
      <div className="flex gap-3">
        <Button
          onClick={saveAlertConfig}
          disabled={updateAlertMut.isPending}
        >
          {updateAlertMut.isPending ? "Saving..." : "Save Alert Config"}
        </Button>
        <Button
          variant="outline"
          onClick={() => testAlertMut.mutate()}
          disabled={testAlertMut.isPending}
        >
          {testAlertMut.isPending ? "Sending..." : "Send Test Alert"}
        </Button>
      </div>
    </div>
  );
}
