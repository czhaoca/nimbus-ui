"use client";

import { RefreshCw } from "lucide-react";
import { ProviderIcon } from "@/components/ProviderIcon";
import type { Provider } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  provider: Provider;
  onSync: (id: string) => void;
  syncing: boolean;
  // The contract types resilience status as an open string; unrecognized
  // values render as-is with the outline variant below.
  status?: string;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  degraded: "secondary",
  down: "destructive",
  unknown: "outline",
};

export function ProviderBadge({ provider, onSync, syncing, status }: Props) {
  return (
    <Card className={cn("transition-all hover:shadow-md hover:border-primary/30", !provider.is_active && "opacity-60")}>
      <CardContent className="flex items-center gap-3 p-3">
        <ProviderIcon type={provider.provider_type} size={16} />
        <div className="flex-1 min-w-0">
          <span className="text-sm font-medium flex items-center gap-1.5">
            {provider.display_name}
            {status && (
              <Badge variant={STATUS_BADGE[status] ?? "outline"} className="text-[10px] px-1.5 py-0 h-4">
                {status}
              </Badge>
            )}
          </span>
          <span className="text-xs text-muted-foreground block">
            {provider.provider_type} &middot; {provider.region || "\u2014"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7"
          disabled={syncing || !provider.is_active}
          onClick={() => onSync(provider.id)}
          title="Sync resources"
        >
          <RefreshCw className={`size-3.5 ${syncing ? "spinning" : ""}`} />
        </Button>
      </CardContent>
    </Card>
  );
}
