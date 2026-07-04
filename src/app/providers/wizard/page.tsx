"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { ProviderCreate } from "@/lib/types";
import { ProviderIcon, getProviderMeta } from "@/components/ProviderIcon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PROVIDER_IDS = ["oci", "aws", "azure", "gcp", "cloudflare", "proxmox"];
const STEPS = ["Select Type", "Configure", "Test Connection", "Confirm"];

export default function ProviderWizardPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<ProviderCreate>({
    id: "",
    provider_type: "",
    display_name: "",
    region: "",
    credentials_path: "",
    instance_index: 0,
    is_active: true,
  });
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testError, setTestError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const update = (field: keyof ProviderCreate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const selectType = (type: string) => {
    update("provider_type", type);
    setStep(1);
  };

  const canProceedToTest = form.id.trim() && form.display_name.trim() && form.provider_type;

  const runTest = async () => {
    setTestStatus("testing");
    setTestError("");
    try {
      await apiFetch(`/api/providers/test`, {
        method: "POST",
        body: JSON.stringify({
          provider_type: form.provider_type,
          credentials_path: form.credentials_path,
          region: form.region,
        }),
      });
      setTestStatus("success");
    } catch (e) {
      setTestStatus("error");
      setTestError((e as Error).message);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    try {
      await apiFetch("/api/providers", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/providers/health");
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Wand2 size={20} />
          Add Provider
        </h1>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? "bg-emerald-600 text-white"
                  : i === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {i < step ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={`text-sm hidden sm:block ${
                i === step ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <ChevronRight size={14} className="text-muted-foreground" />
            )}
          </div>
        ))}
      </div>

      {/* Step 0: Select Type */}
      {step === 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {PROVIDER_IDS.map((id) => {
            const meta = getProviderMeta(id);
            return (
              <button
                key={id}
                onClick={() => selectType(id)}
                className={`rounded-xl border p-5 text-left transition-all hover:border-primary hover:bg-primary/5 hover:shadow-md cursor-pointer group ${
                  form.provider_type === id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-center gap-3 mb-1">
                  <ProviderIcon type={id} size={28} />
                  <div>
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">{id}</div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Step 1: Configure */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider-id">Provider ID</Label>
              <Input
                id="provider-id"
                value={form.id}
                onChange={(e) => update("id", e.target.value)}
                placeholder="my-oci-account"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="display-name">Display Name</Label>
              <Input
                id="display-name"
                value={form.display_name}
                onChange={(e) => update("display_name", e.target.value)}
                placeholder="My Cloud Account"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Input
                id="region"
                value={form.region ?? ""}
                onChange={(e) => update("region", e.target.value)}
                placeholder="us-east-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="creds-path">Credentials Path</Label>
              <Input
                id="creds-path"
                value={form.credentials_path ?? ""}
                onChange={(e) => update("credentials_path", e.target.value)}
                placeholder="local/config/api-key.pem"
              />
              <p className="text-xs text-muted-foreground">
                Path to credentials file in local/config/
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Test Connection */}
      {step === 2 && (
        <Card>
          <CardContent className="text-center space-y-4">
            <p className="text-sm text-muted-foreground">
              Test the connection to{" "}
              <span className="font-medium text-foreground">
                {form.display_name}
              </span>{" "}
              ({form.provider_type})
            </p>

            {testStatus === "idle" && (
              <Button onClick={runTest}>
                Run Connection Test
              </Button>
            )}

            {testStatus === "testing" && (
              <p className="text-sm text-muted-foreground">Testing connection...</p>
            )}

            {testStatus === "success" && (
              <div className="flex items-center justify-center gap-2 text-emerald-400">
                <Check size={16} />
                <span className="text-sm font-medium">Connection successful</span>
              </div>
            )}

            {testStatus === "error" && (
              <div className="space-y-2">
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>{testError || "Connection failed"}</AlertDescription>
                </Alert>
                <Button variant="outline" size="sm" onClick={runTest}>
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirm & Save */}
      {step === 3 && (
        <Card>
          <CardContent className="space-y-4">
            <h2 className="text-sm font-semibold mb-2">Review Configuration</h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Type</dt>
                <dd>
                  <Badge variant="secondary">{form.provider_type}</Badge>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">ID</dt>
                <dd className="font-mono">{form.id}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Display Name</dt>
                <dd>{form.display_name}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Region</dt>
                <dd>{form.region || "--"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Credentials</dt>
                <dd className="font-mono text-xs">{form.credentials_path || "--"}</dd>
              </div>
            </dl>

            {saveError && (
              <Alert variant="destructive">
                <AlertCircle className="size-4" />
                <AlertDescription>{saveError}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Check size={14} />
              {saving ? "Saving..." : "Save Provider"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setStep((s) => Math.max(0, s - 1))}
          disabled={step === 0}
        >
          <ChevronLeft size={14} />
          Back
        </Button>
        {step < 3 && step > 0 && (
          <Button
            size="sm"
            onClick={() => setStep((s) => s + 1)}
            disabled={step === 1 && !canProceedToTest}
          >
            Next
            <ChevronRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
