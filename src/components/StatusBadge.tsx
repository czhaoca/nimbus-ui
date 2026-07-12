import { Badge } from "@/components/ui/badge";

type StatusVariant = "default" | "secondary" | "destructive" | "outline";

// Superset union of the four local status→variant maps this replaces
// (ResourceCard, resources/[id], resources/[id]/dependencies,
// providers/health). ResourceCard is the base, so its values win the
// conflicting keys: stopped → secondary, unknown → outline.
export const STATUS_VARIANT: Record<string, StatusVariant> = {
  running: "default",
  stopped: "secondary",
  terminated: "destructive",
  unknown: "outline",
  connected: "default",
  degraded: "outline",
  down: "destructive",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  // Unmapped statuses render the raw string on outline — never hidden.
  return (
    <Badge variant={STATUS_VARIANT[status] ?? "outline"} className={className}>
      {status}
    </Badge>
  );
}
