"use client";

import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import {
  LayoutDashboard, Cloud, Server, HeartPulse, Gauge, MapPin,
  Plus, Monitor, Network, Shield, HardDrive, Tag, Tags, DollarSign,
  BarChart3, TrendingUp, Timer, GitBranch, Webhook, ScrollText,
  AlertTriangle, Activity, Users, Settings, Search, ChevronRight,
  BookOpen, ExternalLink, Globe, Hammer, ShieldCheck, CalendarClock,
  Bell, ClipboardCheck,
} from "lucide-react";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MenuItem { label: string; path: string; icon: React.ReactNode; }
interface MenuGroup { label: string; icon: React.ReactNode; items: MenuItem[]; }

const MENU_GROUPS: MenuGroup[] = [
  { label: "Dashboard", icon: <LayoutDashboard />, items: [
    { label: "Overview", path: "/", icon: <LayoutDashboard /> },
  ]},
  { label: "Environments", icon: <Globe />, items: [
    { label: "Registry", path: "/environments", icon: <Globe /> },
  ]},
  { label: "Network", icon: <Network />, items: [
    { label: "Network Plan", path: "/network", icon: <Network /> },
    { label: "Edge", path: "/edge", icon: <Globe /> },
  ]},
  { label: "Providers", icon: <Cloud />, items: [
    { label: "All Providers", path: "/providers", icon: <Server /> },
    { label: "Add Provider", path: "/providers/wizard", icon: <Plus /> },
    { label: "Health Status", path: "/providers/health", icon: <HeartPulse /> },
    { label: "Quotas", path: "/quotas", icon: <Gauge /> },
    { label: "Regions", path: "/regions", icon: <MapPin /> },
  ]},
  { label: "Resources", icon: <Monitor />, items: [
    { label: "All Resources", path: "/resources", icon: <Monitor /> },
    { label: "Compute", path: "/resources?category=compute", icon: <Server /> },
    { label: "Networking", path: "/resources?category=networking", icon: <Network /> },
    { label: "Storage", path: "/resources?category=storage", icon: <HardDrive /> },
    { label: "Security", path: "/resources?category=security", icon: <Shield /> },
    { label: "Tags", path: "/tags", icon: <Tag /> },
    { label: "Bulk Tags", path: "/bulk-tags", icon: <Tags /> },
  ]},
  { label: "Budget & Costs", icon: <DollarSign />, items: [
    { label: "Cost Comparison", path: "/costs", icon: <BarChart3 /> },
    { label: "Budget Guardian", path: "/costs/guardian", icon: <ShieldCheck /> },
    { label: "Usage Analytics", path: "/analytics", icon: <TrendingUp /> },
    { label: "Rate Limits", path: "/rate-limits", icon: <Timer /> },
  ]},
  { label: "Workflows", icon: <GitBranch />, items: [
    { label: "Workflow Manager", path: "/workflows", icon: <GitBranch /> },
    { label: "Orchestration", path: "/orchestration", icon: <CalendarClock /> },
    { label: "Webhook Events", path: "/webhooks", icon: <Webhook /> },
    { label: "CI Status", path: "/ci", icon: <Hammer /> },
  ]},
  { label: "Activity & Logs", icon: <ScrollText />, items: [
    { label: "Activity Timeline", path: "/activity", icon: <Activity /> },
    { label: "Audit Log", path: "/audit", icon: <ScrollText /> },
    { label: "Error Log", path: "/errors", icon: <AlertTriangle /> },
    { label: "Alerts", path: "/alerts", icon: <Bell /> },
  ]},
  { label: "Security Review", icon: <Shield />, items: [
    { label: "Security Review", path: "/security-review", icon: <Shield /> },
  ]},
  { label: "Approvals", icon: <ClipboardCheck />, items: [
    { label: "Approvals", path: "/approvals", icon: <ClipboardCheck /> },
  ]},
  { label: "Users & Settings", icon: <Users />, items: [
    { label: "User Management", path: "/users", icon: <Users /> },
    { label: "Settings", path: "/settings", icon: <Settings /> },
  ]},
  { label: "System", icon: <Monitor />, items: [
    { label: "System Info", path: "/system", icon: <Monitor /> },
    { label: "Health Dashboard", path: "/health", icon: <HeartPulse /> },
  ]},
];

const DOCS_URL = process.env.NEXT_PUBLIC_DOCS_URL || "http://localhost:4321";

function isActive(itemPath: string, currentPath: string): boolean {
  if (itemPath === "/") return currentPath === "/";
  if (itemPath.includes("?")) return currentPath === itemPath;
  return currentPath.startsWith(itemPath);
}

export function AppSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { state } = useSidebar();
  const currentPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

  return (
    <ShadcnSidebar collapsible="icon" variant="sidebar">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild tooltip="Nimbus" className="hover:bg-muted/80">
              <Link href="/" className="no-underline hover:no-underline">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Cloud className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">Nimbus</span>
                  <span className="truncate text-xs text-muted-foreground">Cloud Platform</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {state === "expanded" && (
          <div className="px-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground size-3.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const val = (e.target as HTMLInputElement).value.trim();
                    if (val) {
                      router.push(`/search?q=${encodeURIComponent(val)}`);
                      (e.target as HTMLInputElement).value = "";
                    }
                  }
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md bg-sidebar-accent border-0 text-sidebar-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-sidebar-ring transition-colors"
              />
            </div>
          </div>
        )}
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent>
        {MENU_GROUPS.map((group) => {
          if (group.items.length === 1) {
            const item = group.items[0]!;
            const active = isActive(item.path, currentPath);
            return (
              <SidebarGroup key={group.label}>
                <SidebarGroupContent>
                  <SidebarMenu>
                    <SidebarMenuItem>
                      <SidebarMenuButton asChild isActive={active} tooltip={group.label}>
                        <Link href={item.path} className="no-underline hover:no-underline">
                          {group.icon}
                          <span>{group.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            );
          }

          const hasActive = group.items.some((i) => isActive(i.path, currentPath));

          return (
            <Collapsible key={group.label} defaultOpen={hasActive} className="group/collapsible">
              <SidebarGroup>
                <SidebarGroupLabel asChild>
                  <CollapsibleTrigger className="w-full">
                    {group.icon}
                    <span className="flex-1">{group.label}</span>
                    <ChevronRight className="ml-auto size-4 transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                  </CollapsibleTrigger>
                </SidebarGroupLabel>
                <CollapsibleContent>
                  <SidebarGroupContent>
                    <SidebarMenu>
                      {group.items.map((item) => (
                        <SidebarMenuItem key={item.path}>
                          <SidebarMenuButton asChild isActive={isActive(item.path, currentPath)} size="sm" tooltip={item.label}>
                            <Link href={item.path} className="no-underline hover:no-underline">
                              {item.icon}
                              <span>{item.label}</span>
                            </Link>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      ))}
                    </SidebarMenu>
                  </SidebarGroupContent>
                </CollapsibleContent>
              </SidebarGroup>
            </Collapsible>
          );
        })}
      </SidebarContent>

      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="sm" tooltip="Documentation">
              <a href={DOCS_URL} target="_blank" rel="noopener noreferrer">
                <BookOpen className="size-4" />
                <span>Docs</span>
                <ExternalLink className="ml-auto size-3 text-muted-foreground" />
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {/* API-reference link removed: the engine serves docs at its root
              /docs, which the UI proxy does not expose; the old /api/docs
              target 404s. Restore once a proxied docs route exists. */}
        </SidebarMenu>
      </SidebarFooter>
    </ShadcnSidebar>
  );
}
