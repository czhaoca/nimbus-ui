"use client";

import { useState, useEffect } from "react";
import { Gauge, Save } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getRateLimits, saveRateLimits } from "@/lib/api/client";
import type { RateLimitConfig } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2 } from "lucide-react";

// The engine's rate-limit config is exactly these two fields (schema
// component RateLimitConfig; nimbus-ui#15). The old burst_size/enabled
// controls were UI-only phantoms the engine silently dropped on save.
const DEFAULT_CONFIG: RateLimitConfig = {
  requests_per_minute: 60,
  requests_per_hour: 1000,
};

export default function RateLimitsPage() {
  const [config, setConfig] = useState<RateLimitConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getRateLimits()
      .then(setConfig)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // The contract exposes POST (not PUT) for rate-limit updates.
      await saveRateLimits(config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const update = (field: keyof RateLimitConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <PageHeader title="Rate Limits" icon={<Gauge size={20} />} />

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle2 className="size-4" />
          <AlertDescription>Rate limits saved successfully.</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpm">Requests per Minute</Label>
            <Input
              id="rpm"
              type="number"
              min={1}
              value={config.requests_per_minute}
              onChange={(e) =>
                update("requests_per_minute", parseInt(e.target.value, 10) || 1)
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="rph">Requests per Hour</Label>
            <Input
              id="rph"
              type="number"
              min={1}
              value={config.requests_per_hour}
              onChange={(e) =>
                update("requests_per_hour", parseInt(e.target.value, 10) || 1)
              }
            />
          </div>

          <Button onClick={handleSave} disabled={saving} size="sm">
            <Save size={14} />
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
