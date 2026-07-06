"use client";

import { useState, useEffect, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { DollarSign, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { listProviders, listResources } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";

interface CostRow {
  provider_id: string;
  display_name: string;
  provider_type: string;
  resource_count: number;
  monthly_estimate: number;
  avg_per_resource: number;
}

export default function CostsPage() {
  const [rows, setRows] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      listProviders(),
      listResources(),
    ])
      .then(([providers, resources]) => {
        const data: CostRow[] = providers.map((p) => {
          const provResources = resources.filter((r) => r.provider_id === p.id);
          const total = provResources.reduce(
            (sum, r) => sum + r.monthly_cost_estimate,
            0,
          );
          return {
            provider_id: p.id,
            display_name: p.display_name,
            provider_type: p.provider_type,
            resource_count: provResources.length,
            monthly_estimate: total,
            avg_per_resource: provResources.length > 0 ? total / provResources.length : 0,
          };
        });
        setRows(data);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const totalCost = rows.reduce((s, r) => s + r.monthly_estimate, 0);
  const totalResources = rows.reduce((s, r) => s + r.resource_count, 0);

  const columns = useMemo<ColumnDef<CostRow, unknown>[]>(
    () => [
      { accessorKey: "display_name", header: "Provider", cell: ({ getValue }) => <span className="font-medium">{getValue<string>()}</span> },
      { accessorKey: "provider_type", header: "Type", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span> },
      { accessorKey: "resource_count", header: "Resources", cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<number>()}</span> },
      { accessorKey: "monthly_estimate", header: "Monthly Est.", cell: ({ getValue }) => `$${getValue<number>().toFixed(2)}` },
      { accessorKey: "avg_per_resource", header: "Avg / Resource", cell: ({ getValue }) => <span className="text-muted-foreground">${getValue<number>().toFixed(2)}</span> },
      {
        id: "share",
        header: "Share",
        enableSorting: false,
        cell: ({ row }) => {
          const pct = totalCost > 0 ? (row.original.monthly_estimate / totalCost) * 100 : 0;
          return (
            <div className="flex items-center gap-2">
              <Progress value={pct} className="w-16 h-2" />
              <span className="text-xs text-muted-foreground">{pct.toFixed(1)}%</span>
            </div>
          );
        },
      },
    ],
    [totalCost],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Cost Comparison" icon={<DollarSign size={20} />} />

      {/* Summary */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Total Monthly Estimate</p>
            <p className="text-2xl font-bold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Total Resources</p>
            <p className="text-2xl font-bold">{totalResources}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Avg Cost / Resource</p>
            <p className="text-2xl font-bold">
              ${totalResources > 0 ? (totalCost / totalResources).toFixed(2) : "0.00"}
            </p>
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={columns}
        data={rows}
        sorting
        emptyIcon={<DollarSign size={32} />}
        emptyMessage="No cost data available."
      />
    </div>
  );
}
