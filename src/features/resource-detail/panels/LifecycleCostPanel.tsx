import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCost, formatTimestamp } from "@/lib/format";
import type { Resource } from "../types";

const PROTECTION_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  critical: "destructive",
  standard: "default",
  ephemeral: "secondary",
};

export function LifecycleCostPanel({ resource }: { resource: Resource }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Lifecycle &amp; Cost</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid grid-cols-1 gap-y-3 text-sm">
          <div>
            <dt className="text-muted-foreground text-xs">Monthly Cost</dt>
            <dd className="mt-0.5 font-mono text-xs">
              {formatCost(resource.monthly_cost_estimate)}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Protection</dt>
            <dd className="mt-0.5">
              <Badge
                variant={
                  PROTECTION_BADGE_VARIANT[resource.protection_level] ?? "secondary"
                }
              >
                {resource.protection_level}
              </Badge>
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Auto-Terminate</dt>
            <dd className="mt-0.5 font-mono text-xs">
              {resource.auto_terminate ? "Yes" : "No"}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground text-xs">Last Seen</dt>
            <dd className="mt-0.5 font-mono text-xs">
              {formatTimestamp(resource.last_seen_at)}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground border-t pt-3">
          Per-resource health history is not exposed by the /api/v1 contract.
          Provider-level probes live on the Provider Health page.
        </p>
      </CardContent>
    </Card>
  );
}
