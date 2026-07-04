"use client";

import { useState, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useProviders,
  useResources,
  useResourceAction,
  useSyncResources,
  useBudgetStatus,
  useEnforceBudget,
  useProviderStatus,
} from "@/lib/hooks/useApi";
import {
  getDashboardPreferences,
  saveDashboardPreferences,
} from "@/lib/api/client";
import type { DashboardWidget } from "@/lib/api/client";
import { ProviderBadge } from "@/components/ProviderBadge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Layers, Play, Square, CloudCog, Bell, Clock, TrendingUp as TrendingUpIcon,
  DollarSign, Monitor as MonitorIcon, Search as SearchIcon,
} from "lucide-react";
import { ProviderForm, ProviderDeleteButton } from "@/components/ProviderForm";
import { ResourceCard } from "@/components/ResourceCard";
import { BudgetOverview } from "@/components/BudgetOverview";
import { SpendingChart } from "@/components/SpendingChart";
import { ConfirmModal } from "@/components/ConfirmModal";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { showToast } from "@/components/Toasts";
import type { ResourceAction } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";


const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: "stats", visible: true, order: 0 },
  { id: "providers", visible: true, order: 1 },
  { id: "budget", visible: true, order: 2 },
  { id: "costs", visible: true, order: 3 },
  { id: "activity", visible: true, order: 4 },
  { id: "notifications", visible: true, order: 5 },
  { id: "provider-cards", visible: true, order: 6 },
  { id: "resources", visible: true, order: 7 },
];

type Layout = "2-col" | "3-col" | "compact";

function CostWidget() {
  const costData = [
    { name: "Mon", cost: 12 }, { name: "Tue", cost: 18 }, { name: "Wed", cost: 9 },
    { name: "Thu", cost: 24 }, { name: "Fri", cost: 15 }, { name: "Sat", cost: 6 },
    { name: "Sun", cost: 8 },
  ];

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <TrendingUpIcon className="size-4 text-muted-foreground" /> Weekly Cost Trend
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={costData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
          <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" tickFormatter={(v: number) => `$${v}`} />
          <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, color: "hsl(var(--popover-foreground))" }} />
          <Bar dataKey="cost" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityWidget() {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" /> Recent Activity
      </h3>
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Clock className="size-7 mb-2 opacity-40" />
        <p className="text-sm">No recent activity recorded.</p>
      </div>
    </div>
  );
}

function NotificationFeedWidget() {
  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Bell className="size-4 text-muted-foreground" /> Notifications
      </h3>
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <Bell className="size-7 mb-2 opacity-40" />
        <p className="text-sm">No notifications.</p>
      </div>
    </div>
  );
}

function ProviderCardsWidget({ providerFilter }: { providerFilter: string }) {
  const { data: providers } = useProviders();
  const { data: statusData } = useProviderStatus();
  const syncMut = useSyncResources();

  const statusMap = useMemo(() => {
    const m: Record<string, "connected" | "degraded" | "down" | "unknown"> = {};
    statusData?.providers?.forEach((p) => { m[p.provider_id] = p.status; });
    return m;
  }, [statusData]);

  const filtered = useMemo(
    () => (providers ?? []).filter((p) => !providerFilter || p.id === providerFilter),
    [providers, providerFilter],
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CloudCog className="size-8 mb-2 opacity-40" />
        <p className="text-sm">No providers configured.</p>
        <p className="text-xs mt-1 opacity-60">Add a cloud provider to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map((p) => (
        <div key={p.id} className="relative">
          <ProviderBadge
            provider={p}
            onSync={(id) => {
              syncMut.mutate(id, {
                onSuccess: (r) => showToast(`Synced ${r.synced} resources from ${id}`, "success"),
                onError: (e) => showToast((e as Error).message, "error"),
              });
            }}
            syncing={syncMut.isPending}
            status={statusMap[p.id]}
          />
          <div className="absolute top-2 right-10">
            <ProviderDeleteButton providerId={p.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const queryClient = useQueryClient();
  const { data: providers } = useProviders();
  const { data: resources, isLoading: resourcesLoading } = useResources();
  const resourceAction = useResourceAction();
  const { data: budgetStatuses } = useBudgetStatus();
  const enforceMut = useEnforceBudget();

  const { data: prefsData } = useQuery({
    queryKey: ["dashboard-prefs"],
    queryFn: getDashboardPreferences,
  });
  const savePrefsMut = useMutation({
    mutationFn: saveDashboardPreferences,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["dashboard-prefs"] }),
  });

  const widgets: DashboardWidget[] = useMemo(
    () => (prefsData?.widgets ?? DEFAULT_WIDGETS).sort((a, b) => a.order - b.order),
    [prefsData],
  );

  const [layout, setLayout] = useState<Layout>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("nimbus-layout") as Layout) ?? "2-col";
    }
    return "2-col";
  });
  const [providerFilter, setProviderFilter] = useState("");
  const [showAddProvider, setShowAddProvider] = useState(false);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);
  const [selectedResources, setSelectedResources] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<{ action: ResourceAction; ids: string[] } | null>(null);

  const filteredResources = useMemo(
    () => (resources ?? []).filter((r) => !providerFilter || r.provider_id === providerFilter),
    [resources, providerFilter],
  );

  const stats = useMemo(() => {
    const all = resources ?? [];
    return {
      total: all.length,
      running: all.filter((r) => r.status === "running").length,
      stopped: all.filter((r) => r.status === "stopped").length,
      providers: (providers ?? []).length,
    };
  }, [resources, providers]);

  const changeLayout = useCallback((l: Layout) => {
    setLayout(l);
    localStorage.setItem("nimbus-layout", l);
  }, []);

  const toggleWidget = useCallback(
    (id: string) => {
      const updated = widgets.map((w) => w.id === id ? { ...w, visible: !w.visible } : w);
      savePrefsMut.mutate({ widgets: updated });
    },
    [widgets, savePrefsMut],
  );

  const handleResourceAction = useCallback(
    (id: string, action: ResourceAction) => {
      if (action === "terminate" || action === "stop") {
        setConfirmAction({ action, ids: [id] });
      } else {
        resourceAction.mutate(
          { id, action },
          {
            onSuccess: (r) => showToast(`${r.action}: ${r.detail}`, "success"),
            onError: (e) => showToast((e as Error).message, "error"),
          },
        );
      }
    },
    [resourceAction],
  );

  const toggleSelect = useCallback((id: string) => {
    setSelectedResources((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkAction = useCallback(
    (action: ResourceAction) => {
      if (selectedResources.size === 0) return;
      setConfirmAction({ action, ids: Array.from(selectedResources) });
    },
    [selectedResources],
  );

  const executeConfirmed = useCallback(() => {
    if (!confirmAction) return;
    confirmAction.ids.forEach((id) => {
      resourceAction.mutate(
        { id, action: confirmAction.action },
        {
          onSuccess: (r) => showToast(`${r.action}: ${r.detail}`, "success"),
          onError: (e) => showToast((e as Error).message, "error"),
        },
      );
    });
    setConfirmAction(null);
    setSelectedResources(new Set());
  }, [confirmAction, resourceAction]);

  const isWidgetVisible = useCallback(
    (id: string) => widgets.find((w) => w.id === id)?.visible !== false,
    [widgets],
  );

  const gridClass = `grid gap-4 ${
    layout === "3-col" ? "lg:grid-cols-3" : layout === "2-col" ? "lg:grid-cols-2" : "grid-cols-1"
  }`;

  const STAT_ITEMS = [
    { label: "Total Resources", value: stats.total, icon: <Layers className="size-4" /> },
    { label: "Running", value: stats.running, icon: <Play className="size-4" /> },
    { label: "Stopped", value: stats.stopped, icon: <Square className="size-4" /> },
    { label: "Providers", value: stats.providers, icon: <CloudCog className="size-4" /> },
  ];

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <div className="flex items-center gap-2">
            <Select value={providerFilter || "all"} onValueChange={(v) => setProviderFilter(v === "all" ? "" : v)}>
              <SelectTrigger className="w-40 h-8 text-xs">
                <SelectValue placeholder="All Providers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Providers</SelectItem>
                {(providers ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-md border overflow-hidden">
              {(["2-col", "3-col", "compact"] as Layout[]).map((l) => (
                <Button
                  key={l}
                  variant={layout === l ? "default" : "ghost"}
                  size="sm"
                  className="h-8 text-xs rounded-none px-2.5"
                  onClick={() => changeLayout(l)}
                >
                  {l}
                </Button>
              ))}
            </div>

            <Button
              variant={showWidgetPanel ? "secondary" : "outline"}
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowWidgetPanel(!showWidgetPanel)}
            >
              Widgets
            </Button>

            <Button size="sm" className="h-8 text-xs" onClick={() => setShowAddProvider(true)}>
              + Provider
            </Button>
          </div>
        </div>

        {showWidgetPanel && (
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-3">Toggle Widgets</h3>
              <div className="flex flex-wrap gap-2">
                {widgets.map((w) => (
                  <Button
                    key={w.id}
                    variant={w.visible ? "default" : "outline"}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => toggleWidget(w.id)}
                  >
                    {w.id}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {isWidgetVisible("stats") && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {STAT_ITEMS.map((s) => (
              <Card key={s.label} className="transition-all hover:shadow-md hover:border-primary/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{s.label}</p>
                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">{s.icon}</div>
                  </div>
                  <p className="text-2xl font-bold">{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className={gridClass}>
          {isWidgetVisible("budget") && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="size-4 text-muted-foreground" /> Budget Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BudgetOverview
                  statuses={budgetStatuses ?? []}
                  onEnforce={() =>
                    enforceMut.mutate(undefined, {
                      onSuccess: (r) => showToast(`Enforcement complete: ${r.actions_taken} actions`, "success"),
                      onError: (e) => showToast((e as Error).message, "error"),
                    })
                  }
                  enforcing={enforceMut.isPending}
                />
              </CardContent>
            </Card>
          )}

          {isWidgetVisible("costs") && (
            <Card>
              <CardContent className="p-4">
                <ErrorBoundary fallback={<p className="text-sm text-muted-foreground">Cost chart unavailable.</p>}>
                  <SpendingChart />
                </ErrorBoundary>
              </CardContent>
            </Card>
          )}

          {isWidgetVisible("activity") && (
            <Card>
              <CardContent className="p-4"><ActivityWidget /></CardContent>
            </Card>
          )}

          {isWidgetVisible("notifications") && (
            <Card>
              <CardContent className="p-4"><NotificationFeedWidget /></CardContent>
            </Card>
          )}

          {isWidgetVisible("costs") && (
            <Card>
              <CardContent className="p-4">
                <ErrorBoundary fallback={<p className="text-sm text-muted-foreground">Cost trend unavailable.</p>}>
                  <CostWidget />
                </ErrorBoundary>
              </CardContent>
            </Card>
          )}
        </div>

        {isWidgetVisible("provider-cards") && (
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <CloudCog className="size-4 text-muted-foreground" /> Providers
                </CardTitle>
                <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowAddProvider(true)}>
                  + Add
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <ProviderCardsWidget providerFilter={providerFilter} />
            </CardContent>
          </Card>
        )}

        {isWidgetVisible("resources") && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <MonitorIcon className="size-4 text-muted-foreground" />
                Resources <Badge variant="secondary" className="ml-1">{filteredResources.length}</Badge>
              </h2>
              {selectedResources.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{selectedResources.size} selected</span>
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => handleBulkAction("stop")}>Stop</Button>
                  <Button variant="destructive" size="sm" className="h-7 text-xs" onClick={() => handleBulkAction("terminate")}>Terminate</Button>
                </div>
              )}
            </div>

            {resourcesLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
              </div>
            ) : filteredResources.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <SearchIcon className="size-8 mb-2 opacity-40" />
                <p className="text-sm">No resources found. Sync a provider to discover resources.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredResources.map((r) => (
                  <ResourceCard
                    key={r.id}
                    resource={r}
                    onAction={handleResourceAction}
                    actionPending={resourceAction.isPending}
                    selected={selectedResources.has(r.id)}
                    onSelect={() => toggleSelect(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {showAddProvider && <ProviderForm onClose={() => setShowAddProvider(false)} />}

        {confirmAction && (
          <ConfirmModal
            title={`Confirm ${confirmAction.action}`}
            message={
              <span>
                Are you sure you want to <strong>{confirmAction.action}</strong>{" "}
                {confirmAction.ids.length === 1 ? "this resource" : `${confirmAction.ids.length} resources`}? This action cannot be undone.
              </span>
            }
            confirmLabel={confirmAction.action === "terminate" ? "Terminate" : "Stop"}
            confirmVariant="danger"
            onConfirm={executeConfirmed}
            onCancel={() => setConfirmAction(null)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
