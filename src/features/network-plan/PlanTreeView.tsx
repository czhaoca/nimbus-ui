"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import { fetchPlanTree } from "./api";
import type { PlanTreeNode } from "./types";

const statusVariant = (status: string) => {
  switch (status) {
    case "active":
      return "default" as const;
    case "planned":
      return "secondary" as const;
    case "decommissioning":
      return "destructive" as const;
    default:
      return "outline" as const;
  }
};

function TreeNode({ node, depth = 0 }: { node: PlanTreeNode; depth?: number }) {
  return (
    <div style={{ paddingLeft: depth * 24 }}>
      <div className="flex items-center gap-2 py-1.5 border-b border-border/40">
        <span className="font-mono text-sm font-semibold">{node.cidr_block}</span>
        <span className="text-muted-foreground text-sm">
          {node.network_name || node.provider_type}
        </span>
        {node.vlan_id != null && (
          <span className="text-xs text-muted-foreground">VLAN {node.vlan_id}</span>
        )}
        <Badge variant={statusVariant(node.status)}>{node.status}</Badge>
        <Badge variant="outline" className="text-xs">
          {node.provider_type}
        </Badge>
        {node.site_label && (
          <span className="text-xs text-muted-foreground">{node.site_label}</span>
        )}
      </div>
      {node.children.map((child) => (
        <TreeNode key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  );
}

export function PlanTreeView() {
  const { data: roots, isLoading, error } = useQuery({
    queryKey: ["network-plan-tree"],
    queryFn: () => fetchPlanTree(),
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load the network plan"}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>CIDR Master Plan</CardTitle>
      </CardHeader>
      <CardContent>
        {!roots || roots.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No allocations registered. Use{" "}
            <code className="text-xs">nimbus network register</code> to add entries.
          </p>
        ) : (
          roots.map((root) => <TreeNode key={root.id} node={root} />)
        )}
      </CardContent>
    </Card>
  );
}
