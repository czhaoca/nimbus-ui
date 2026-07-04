"use client";

import { useQueries } from "@tanstack/react-query";
import {
  Activity,
  Boxes,
  Globe,
  Layers,
  Network,
  Server,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

import {
  fetchCidrAllocations,
  fetchRegistryPortPools,
  fetchRegistryProjects,
  fetchRegistrySlots,
  fetchRegistryTargets,
} from "./api";

export function DashboardCards() {
  const [projectsQ, slotsQ, targetsQ, poolsQ, cidrQ] = useQueries({
    queries: [
      { queryKey: ["registry-projects"], queryFn: fetchRegistryProjects, refetchInterval: 30_000 },
      { queryKey: ["registry-slots"], queryFn: fetchRegistrySlots, refetchInterval: 30_000 },
      { queryKey: ["registry-targets"], queryFn: fetchRegistryTargets, refetchInterval: 30_000 },
      { queryKey: ["registry-port-pools"], queryFn: fetchRegistryPortPools, refetchInterval: 60_000 },
      { queryKey: ["cidr-allocations"], queryFn: fetchCidrAllocations, refetchInterval: 60_000 },
    ],
  });

  const loading = projectsQ.isLoading || slotsQ.isLoading;

  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  const projects = projectsQ.data ?? [];
  const slots = slotsQ.data ?? [];
  const targets = targetsQ.data ?? [];
  const pools = poolsQ.data ?? [];
  const cidrs = cidrQ.data ?? [];

  const cards = [
    { icon: Boxes, label: "Projects", value: projects.length },
    { icon: Globe, label: "Reserved Slots", value: slots.filter((s) => s.status === "reserved").length },
    { icon: Server, label: "Allocatable Targets", value: targets.filter((t) => t.is_allocatable).length },
    { icon: Network, label: "Port Pools", value: pools.filter((p) => p.is_active).length },
    { icon: Layers, label: "CIDR Allocations", value: cidrs.length },
    { icon: Activity, label: "Total Endpoints", value: slots.reduce((n, s) => n + s.endpoints.length, 0) },
  ];

  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => (
        <Card key={card.label} className="py-4">
          <CardContent className="pt-0">
            <div className="flex items-center gap-2 text-muted-foreground mb-1 text-sm">
              <card.icon className="size-4" />
              {card.label}
            </div>
            <p className="text-2xl font-semibold">{card.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
