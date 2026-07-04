"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchProviders,
  addProvider,
  deleteProvider,
  syncProvider,
} from "@/lib/api/client";
import type { ProviderCreate, Provider, SyncResult } from "@/lib/types";
import { showToast } from "@/components/Toasts";
import { ProviderIcon } from "@/components/ProviderIcon";
import { CloudCog, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ---------- constants ---------- */

const PROVIDER_TYPES = ["oci", "cloudflare", "proxmox", "azure", "gcp", "aws"];

const TYPE_COLORS: Record<string, string> = {
  oci: "bg-red-500/20 text-red-400 border-transparent",
  cloudflare: "bg-orange-500/20 text-orange-400 border-transparent",
  proxmox: "bg-purple-500/20 text-purple-400 border-transparent",
  azure: "bg-blue-500/20 text-blue-400 border-transparent",
  gcp: "bg-emerald-500/20 text-emerald-400 border-transparent",
  aws: "bg-amber-500/20 text-amber-400 border-transparent",
};

/* ---------- sync result display ---------- */

interface SyncResultDisplay {
  providerId: string;
  result: SyncResult | null;
  error: string | null;
}

/* ---------- page ---------- */

export default function ProvidersPage() {
  const queryClient = useQueryClient();

  /* data */
  const { data: providers, isLoading } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });

  /* mutations */
  const createMut = useMutation({
    mutationFn: addProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      showToast("Provider added", "success");
      resetForm();
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const deleteMut = useMutation({
    mutationFn: deleteProvider,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      showToast("Provider deleted", "success");
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const syncMut = useMutation({
    mutationFn: syncProvider,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
      setSyncResults((prev) => [
        ...prev,
        { providerId: result.provider_id, result, error: null },
      ]);
      showToast(
        `Synced ${result.synced} resources (${result.created} new, ${result.updated} updated)`,
        "success",
      );
    },
    onError: (e, providerId) => {
      setSyncResults((prev) => [
        ...prev,
        { providerId, result: null, error: (e as Error).message },
      ]);
      showToast((e as Error).message, "error");
    },
  });

  /* form state */
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProviderCreate>({
    id: "",
    provider_type: "oci",
    display_name: "",
    region: "",
    credentials_path: "",
    instance_index: 0,
    is_active: true,
  });
  const [syncResults, setSyncResults] = useState<SyncResultDisplay[]>([]);

  const resetForm = () => {
    setForm({
      id: "",
      provider_type: "oci",
      display_name: "",
      region: "",
      credentials_path: "",
      instance_index: 0,
      is_active: true,
    });
    setShowForm(false);
  };

  const update = (field: keyof ProviderCreate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.display_name) return;
    createMut.mutate(form);
  };

  const handleDelete = (id: string) => {
    if (!confirm(`Delete provider "${id}" and all its resources?`)) return;
    deleteMut.mutate(id);
  };

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      <PageHeader
        title="Providers"
        action={
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "+ Add Provider"}
          </Button>
        }
      />

      {/* Create form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">New Provider</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider-id">ID</Label>
                  <Input
                    id="provider-id"
                    value={form.id}
                    onChange={(e) => update("id", e.target.value)}
                    placeholder="my-oci"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider-type">Type</Label>
                  <Select
                    value={form.provider_type}
                    onValueChange={(value) => update("provider_type", value)}
                  >
                    <SelectTrigger id="provider-type" className="w-full">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="display-name">Display Name</Label>
                  <Input
                    id="display-name"
                    value={form.display_name}
                    onChange={(e) => update("display_name", e.target.value)}
                    placeholder="My OCI Account"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="region">Region</Label>
                  <Input
                    id="region"
                    value={form.region ?? ""}
                    onChange={(e) => update("region", e.target.value)}
                    placeholder="us-ashburn-1"
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="creds-path">Credentials Path</Label>
                  <Input
                    id="creds-path"
                    value={form.credentials_path ?? ""}
                    onChange={(e) => update("credentials_path", e.target.value)}
                    placeholder="local/config/oci-api-key.pem"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForm}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMut.isPending}
                >
                  {createMut.isPending ? "Adding..." : "Add Provider"}
                </Button>
              </div>
              {createMut.isError && (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>
                    {(createMut.error as Error).message}
                  </AlertDescription>
                </Alert>
              )}
            </form>
          </CardContent>
        </Card>
      )}

      {/* Provider cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-12" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2 pt-1">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !providers || providers.length === 0 ? (
        <Card className="py-16">
          <CardContent className="text-center">
            <CloudCog size={36} className="mx-auto mb-3 text-muted-foreground opacity-40" />
            <p className="text-muted-foreground mb-1">
              No providers configured yet.
            </p>
            <p className="text-sm text-muted-foreground opacity-60">
              Add a cloud provider to start managing resources.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {providers.map((p: Provider) => (
            <Card key={p.id} className="transition-all hover:shadow-md hover:border-primary/30">
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ProviderIcon type={p.provider_type} size={18} />
                    <Badge
                      variant="secondary"
                      className={TYPE_COLORS[p.provider_type] ?? "bg-gray-500/20 text-gray-400 border-transparent"}
                    >
                      {p.provider_type.toUpperCase()}
                    </Badge>
                    <CardTitle className="text-sm">{p.display_name}</CardTitle>
                  </div>
                  <Badge variant={p.is_active ? "default" : "secondary"} className={
                    p.is_active
                      ? "bg-emerald-500/20 text-emerald-400 border-transparent"
                      : "bg-muted text-muted-foreground"
                  }>
                    {p.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-1 text-xs text-muted-foreground">
                <p>
                  <span className="inline-block w-16">ID:</span>
                  <span className="font-mono">{p.id}</span>
                </p>
                <p>
                  <span className="inline-block w-16">Region:</span>
                  {p.region || "\u2014"}
                </p>
                <p>
                  <span className="inline-block w-16">Created:</span>
                  {new Date(p.created_at).toLocaleDateString()}
                </p>
              </CardContent>

              <CardFooter className="gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={syncMut.isPending || !p.is_active}
                  onClick={() => syncMut.mutate(p.id)}
                >
                  {syncMut.isPending ? "Syncing..." : "Sync"}
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={deleteMut.isPending}
                  onClick={() => handleDelete(p.id)}
                >
                  Delete
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Sync results */}
      {syncResults.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Sync Results</CardTitle>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setSyncResults([])}
              >
                Clear
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {syncResults.map((sr, i) => (
              <Alert
                key={i}
                variant={sr.error ? "destructive" : "default"}
                className={sr.error ? "" : "border-emerald-500/30 text-emerald-400"}
              >
                <AlertDescription className={sr.error ? "" : "text-emerald-400"}>
                  <span className="font-mono">{sr.providerId}</span>
                  {sr.result && (
                    <span>
                      {" "}
                      &mdash; {sr.result.synced} synced ({sr.result.created} created,{" "}
                      {sr.result.updated} updated)
                    </span>
                  )}
                  {sr.error && <span> &mdash; {sr.error}</span>}
                </AlertDescription>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
