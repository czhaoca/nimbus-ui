"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { showToast } from "@/components/Toasts";
import type { ResourceUpdate } from "@/lib/types";
import { updateResource } from "./api";
import type { Resource } from "./types";

// The engine's documented set (core/models/resource.py: "critical,
// standard, ephemeral").
const PROTECTION_LEVELS = ["critical", "standard", "ephemeral"];

interface Props {
  resource: Resource;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditResourceDialog({ resource, open, onOpenChange }: Props) {
  const qc = useQueryClient();

  const mut = useMutation({
    mutationFn: (body: ResourceUpdate) => updateResource(resource.id, body),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ["resource", resource.id] });
      qc.invalidateQueries({ queryKey: ["resources"] });
      showToast(
        `Updated ${updated.display_name || updated.external_id}`,
        "success",
      );
      onOpenChange(false);
    },
    // Honest passthrough: a 403 (tier gate) or any engine error renders the
    // engine's own detail string, never a rephrasing.
    onError: (e) => showToast((e as Error).message, "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Edit {resource.display_name || resource.external_id}
          </DialogTitle>
          <DialogDescription>
            Display name, protection level, auto-terminate, and tags persist
            via the typed PUT contract. Status is owned by the actions above;
            cost estimates are the engine&apos;s.
          </DialogDescription>
        </DialogHeader>
        {/* Radix unmounts DialogContent when closed, so the form re-mounts —
            and re-prefills from the current cache value — on every open. */}
        <EditForm
          resource={resource}
          pending={mut.isPending}
          onCancel={() => onOpenChange(false)}
          onSave={(body) => mut.mutate(body)}
        />
      </DialogContent>
    </Dialog>
  );
}

function EditForm({
  resource,
  pending,
  onCancel,
  onSave,
}: {
  resource: Resource;
  pending: boolean;
  onCancel: () => void;
  onSave: (body: ResourceUpdate) => void;
}) {
  const [displayName, setDisplayName] = useState(resource.display_name ?? "");
  const [protectionLevel, setProtectionLevel] = useState(
    resource.protection_level || "standard",
  );
  const [autoTerminate, setAutoTerminate] = useState(!!resource.auto_terminate);
  const [tagRows, setTagRows] = useState<{ key: string; value: string }[]>(
    Object.entries(resource.tags ?? {}).map(([key, value]) => ({
      key,
      value: String(value),
    })),
  );

  // An off-list current value (e.g. legacy "protected") stays selectable —
  // the form must not silently coerce data it merely renders.
  const levelOptions = PROTECTION_LEVELS.includes(protectionLevel)
    ? PROTECTION_LEVELS
    : [protectionLevel, ...PROTECTION_LEVELS];

  // Exactly the four owner-scoped fields — status and monthly_cost_estimate
  // are deliberately never part of this body.
  const buildBody = (): ResourceUpdate => ({
    display_name: displayName.trim() || null,
    protection_level: protectionLevel,
    auto_terminate: autoTerminate,
    tags: Object.fromEntries(
      tagRows
        .filter((r) => r.key.trim() !== "")
        .map((r) => [r.key.trim(), r.value]),
    ),
  });

  return (
    <>
      <div className="space-y-3">
        <div className="space-y-1">
          <Label htmlFor="edit-display-name">Display name</Label>
          <Input
            id="edit-display-name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={resource.external_id}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="edit-protection-level">Protection level</Label>
          <Select value={protectionLevel} onValueChange={setProtectionLevel}>
            <SelectTrigger id="edit-protection-level" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {levelOptions.map((level) => (
                <SelectItem key={level} value={level}>
                  {level}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between">
          <Label htmlFor="edit-auto-terminate">Auto-terminate</Label>
          <Switch
            id="edit-auto-terminate"
            checked={autoTerminate}
            onCheckedChange={setAutoTerminate}
          />
        </div>

        <div className="space-y-1">
          <Label>Tags</Label>
          <div className="space-y-2">
            {tagRows.map((row, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Input
                  placeholder="key"
                  aria-label={`Tag key ${idx + 1}`}
                  value={row.key}
                  onChange={(e) =>
                    setTagRows((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, key: e.target.value } : r,
                      ),
                    )
                  }
                />
                <Input
                  placeholder="value"
                  aria-label={`Tag value ${idx + 1}`}
                  value={row.value}
                  onChange={(e) =>
                    setTagRows((rows) =>
                      rows.map((r, i) =>
                        i === idx ? { ...r, value: e.target.value } : r,
                      ),
                    )
                  }
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove tag ${idx + 1}`}
                  onClick={() =>
                    setTagRows((rows) => rows.filter((_, i) => i !== idx))
                  }
                >
                  <X className="size-4" />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setTagRows((rows) => [...rows, { key: "", value: "" }])
              }
            >
              Add tag
            </Button>
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button disabled={pending} onClick={() => onSave(buildBody())}>
          Save changes
        </Button>
      </DialogFooter>
    </>
  );
}
