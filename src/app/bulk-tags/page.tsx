"use client";

import { useState, useEffect } from "react";
import { Tags, Check } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { listResources, updateResourceTags } from "@/lib/api/client";
import type { Resource } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function BulkTagsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagKey, setTagKey] = useState("");
  const [tagValue, setTagValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"add" | "remove">("add");

  const fetchResources = () => {
    setLoading(true);
    listResources()
      .then(setResources)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchResources();
  }, []);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === resources.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(resources.map((r) => r.id)));
    }
  };

  const applyTags = async () => {
    if (!tagKey.trim() || selected.size === 0) return;
    setSaving(true);
    setError(null);

    try {
      for (const id of selected) {
        const resource = resources.find((r) => r.id === id);
        if (!resource) continue;

        let updatedTags: Record<string, unknown>;
        if (mode === "add") {
          updatedTags = { ...resource.tags, [tagKey.trim()]: tagValue.trim() };
        } else {
          updatedTags = { ...resource.tags };
          delete updatedTags[tagKey.trim()];
        }

        await updateResourceTags(id, updatedTags);
      }
      fetchResources();
      setSelected(new Set());
      setTagKey("");
      setTagValue("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Tag Management"
        icon={<Tags size={20} />}
        action={
          <span className="text-sm text-muted-foreground">
            {selected.size} selected
          </span>
        }
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Tag action form */}
      <Card className="py-4">
        <CardContent className="px-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1">
                Mode
              </Label>
              <Select
                value={mode}
                onValueChange={(value) => setMode(value as "add" | "remove")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Tag</SelectItem>
                  <SelectItem value="remove">Remove Tag</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1">
                Tag Key
              </Label>
              <Input
                type="text"
                value={tagKey}
                onChange={(e) => setTagKey(e.target.value)}
                placeholder="environment"
                className="w-[180px]"
              />
            </div>
            {mode === "add" && (
              <div>
                <Label className="text-xs text-muted-foreground mb-1">
                  Tag Value
                </Label>
                <Input
                  type="text"
                  value={tagValue}
                  onChange={(e) => setTagValue(e.target.value)}
                  placeholder="production"
                  className="w-[180px]"
                />
              </div>
            )}
            <Button
              onClick={applyTags}
              disabled={saving || !tagKey.trim() || selected.size === 0}
            >
              <Check size={14} />
              {saving ? "Applying..." : `Apply to ${selected.size} resource${selected.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Resource table */}
      <Card className="py-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selected.size === resources.length && resources.length > 0}
                  onCheckedChange={toggleAll}
                />
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Tags</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {resources.map((r) => (
              <TableRow
                key={r.id}
                data-state={selected.has(r.id) ? "selected" : undefined}
              >
                <TableCell>
                  <Checkbox
                    checked={selected.has(r.id)}
                    onCheckedChange={() => toggleSelect(r.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {r.display_name || r.external_id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.provider_id}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {r.resource_type}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {Object.entries(r.tags).map(([k, v]) => (
                      <Badge key={k} variant="secondary">
                        {k}={String(v)}
                      </Badge>
                    ))}
                    {Object.keys(r.tags).length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        none
                      </span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {resources.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tags size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No resources found.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
