"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { getResourceMetrics } from "../api";

// Engine bound: hours ∈ [1, 168] (analytics.py Query(24, ge=1, le=168)).
const PERIOD_OPTIONS = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
];

const CHART_CONFIG = {
  cpu_percent: { label: "CPU %", color: "var(--chart-1)" },
  memory_percent: { label: "Memory %", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MetricsPanel({ resourceId }: { resourceId: string }) {
  const [hours, setHours] = useState(24);

  const { data, isLoading, error } = useQuery({
    queryKey: ["resource-metrics", resourceId, hours],
    queryFn: () => getResourceMetrics(resourceId, hours),
    staleTime: 60_000,
  });

  const points = data?.data ?? [];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Metrics</CardTitle>
          <div className="flex gap-1">
            {PERIOD_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={hours === opt.value ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs px-2.5"
                onClick={() => setHours(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : error ? (
          // A failed fetch is an error, never an empty history (honest
          // degradation — mirrors the sibling panels).
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load metrics."}
            </AlertDescription>
          </Alert>
        ) : points.length === 0 ? (
          // Honest empty state: the demo seed writes zero ResourceMetric
          // rows, so this is the steady state — never a blank chart, and
          // null samples are never rendered as zeros.
          <p className="text-sm text-muted-foreground py-8 text-center">
            No metrics recorded for this period.
          </p>
        ) : (
          <ChartContainer
            config={CHART_CONFIG}
            className="aspect-auto h-[240px] w-full"
          >
            <LineChart
              data={points}
              margin={{ top: 5, right: 12, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tick={{ fontSize: 11 }}
                tickFormatter={(v: string) => v.slice(5, 16).replace("T", " ")}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {/* connectNulls stays off: a null sample is a gap, not a 0. */}
              <Line
                dataKey="cpu_percent"
                type="monotone"
                stroke="var(--color-cpu_percent)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="memory_percent"
                type="monotone"
                stroke="var(--color-memory_percent)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
