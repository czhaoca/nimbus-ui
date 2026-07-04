"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createProvider, deleteProvider } from "@/lib/api/client";
import type { ProviderCreate } from "@/lib/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";

const PROVIDER_TYPES = ["oci", "cloudflare", "proxmox", "azure", "gcp", "aws"];

export function ProviderForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ProviderCreate>({
    id: "", provider_type: "oci", display_name: "", region: "", credentials_path: "", instance_index: 0, is_active: true,
  });

  const mutation = useMutation({
    mutationFn: createProvider,
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["providers"] }); onClose(); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.id || !form.display_name) return;
    mutation.mutate(form);
  };

  const update = (field: keyof ProviderCreate, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Provider</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="provider-id">ID</Label>
            <Input id="provider-id" value={form.id} onChange={(e) => update("id", e.target.value)} placeholder="my-oci" required />
          </div>
          <div className="space-y-2">
            <Label>Type</Label>
            <Select value={form.provider_type} onValueChange={(v) => update("provider_type", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROVIDER_TYPES.map((t) => <SelectItem key={t} value={t}>{t.toUpperCase()}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input id="display-name" value={form.display_name} onChange={(e) => update("display_name", e.target.value)} placeholder="My OCI Account" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Input id="region" value={form.region ?? ""} onChange={(e) => update("region", e.target.value)} placeholder="us-ashburn-1" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="creds-path">Credentials Path</Label>
            <Input id="creds-path" value={form.credentials_path ?? ""} onChange={(e) => update("credentials_path", e.target.value)} placeholder="local/config/oci-api-key.pem" />
            <p className="text-xs text-muted-foreground">Path to credentials file in local/config/</p>
          </div>
          {mutation.isError && (
            <Alert variant="destructive">
              <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
            </Alert>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Adding..." : "Add Provider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ProviderDeleteButton({ providerId }: { providerId: string }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteProvider(providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }),
  });

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
      onClick={() => { if (confirm(`Delete provider "${providerId}"?`)) mutation.mutate(); }}
      disabled={mutation.isPending}
    >
      {mutation.isPending ? "..." : "\u2715"}
    </Button>
  );
}
