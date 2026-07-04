"use client";

import { RefreshCw, Shield, ShieldAlert, ShieldOff } from "lucide-react";
import Link from "next/link";
import type { Resource, ResourceAction } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  resource: Resource;
  onAction: (id: string, action: ResourceAction) => void;
  actionPending: boolean;
  selected?: boolean;
  onSelect?: () => void;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "secondary",
  terminated: "destructive",
  unknown: "outline",
};

const PROTECTION_ICONS: Record<string, typeof Shield> = {
  critical: ShieldAlert,
  standard: Shield,
  ephemeral: ShieldOff,
};

export function ResourceCard({ resource, onAction, actionPending, selected, onSelect }: Props) {
  const ProtIcon = PROTECTION_ICONS[resource.protection_level] ?? Shield;

  return (
    <Card className={cn("transition-all hover:shadow-md hover:border-primary/30", selected && "border-primary bg-primary/5")}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {onSelect && (
              <Checkbox checked={!!selected} onCheckedChange={onSelect} />
            )}
            <Badge variant="outline" className="text-xs">{resource.resource_type}</Badge>
          </div>
          <Badge variant={STATUS_VARIANT[resource.status] ?? "outline"} className="text-xs">
            {resource.status}
          </Badge>
        </div>

        <Link href={`/resources/${resource.id}`} className="block mb-2 no-underline hover:no-underline">
          <h3 className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate">
            {resource.display_name || resource.external_id}
          </h3>
        </Link>

        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{resource.provider_id}</span>
          <span className="flex items-center gap-1" title={resource.protection_level}>
            <ProtIcon className="size-3.5" />
            {resource.protection_level}
          </span>
        </div>

        {resource.external_id && (
          <div className="text-xs text-muted-foreground font-mono mb-3 truncate" title={resource.external_id}>
            {resource.external_id.length > 24
              ? `${resource.external_id.slice(0, 12)}...${resource.external_id.slice(-8)}`
              : resource.external_id}
          </div>
        )}

        <div className="flex gap-2">
          {resource.status === "running" && (
            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={actionPending} onClick={() => onAction(resource.id, "stop")}>
              Stop
            </Button>
          )}
          {resource.status === "stopped" && (
            <Button variant="outline" size="sm" className="h-7 text-xs text-emerald-600" disabled={actionPending} onClick={() => onAction(resource.id, "start")}>
              Start
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" disabled={actionPending} onClick={() => onAction(resource.id, "health_check")}>
            <RefreshCw className="size-3" /> Check
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
