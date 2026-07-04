"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchPlanDiff } from "./api";
import type { PlanDiffItem } from "./types";

function DiffTable({ title, items, variant }: {
  title: string;
  items: PlanDiffItem[];
  variant: "secondary" | "default";
}) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>CIDR</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Provider</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-mono text-sm">{item.cidr_block}</TableCell>
                <TableCell>{item.name || "-"}</TableCell>
                <TableCell>
                  <Badge variant={variant}>{item.provider}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

export function PlanDiffView() {
  const { data: diff, isLoading } = useQuery({
    queryKey: ["network-plan-diff"],
    queryFn: fetchPlanDiff,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-40 rounded-xl" />;
  if (!diff) return null;

  const empty =
    diff.planned_unmatched.length === 0 &&
    diff.active_unplanned.length === 0 &&
    diff.matched_count === 0;

  if (empty) {
    return (
      <p className="text-muted-foreground text-center py-8">
        No allocations to compare.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <DiffTable
        title="Planned but NOT Active"
        items={diff.planned_unmatched}
        variant="secondary"
      />
      <DiffTable
        title="Active but NOT in Plan"
        items={diff.active_unplanned}
        variant="default"
      />
      {diff.matched_count > 0 && (
        <p className="text-sm text-muted-foreground text-center">
          {diff.matched_count} allocation(s) matched plan to active.
        </p>
      )}
    </div>
  );
}
