/**
 * Pins the public export surface of "@/components/ui/sidebar".
 *
 * Guard for the #22 size split (726-line vendored shadcn file → sidebar/
 * parts behind an index barrel): the specifier and every exported name
 * must survive the refactor byte-for-byte for the three consumers
 * (Header, AppShell, Sidebar). Asserts exact equality both ways — a
 * dropped OR accidentally added export fails.
 */
import { describe, expect, it } from "vitest";

import * as SidebarModule from "@/components/ui/sidebar";

const EXPECTED_EXPORTS = [
  "Sidebar",
  "SidebarContent",
  "SidebarFooter",
  "SidebarGroup",
  "SidebarGroupAction",
  "SidebarGroupContent",
  "SidebarGroupLabel",
  "SidebarHeader",
  "SidebarInput",
  "SidebarInset",
  "SidebarMenu",
  "SidebarMenuAction",
  "SidebarMenuBadge",
  "SidebarMenuButton",
  "SidebarMenuItem",
  "SidebarMenuSkeleton",
  "SidebarMenuSub",
  "SidebarMenuSubButton",
  "SidebarMenuSubItem",
  "SidebarProvider",
  "SidebarRail",
  "SidebarSeparator",
  "SidebarTrigger",
  "useSidebar",
] as const;

describe("ui/sidebar export surface", () => {
  it("exports every pinned name as a defined value", () => {
    for (const name of EXPECTED_EXPORTS) {
      expect(
        SidebarModule[name as keyof typeof SidebarModule],
        `missing export: ${name}`,
      ).toBeDefined();
    }
  });

  it("exports exactly the pinned surface — nothing more, nothing less", () => {
    expect(Object.keys(SidebarModule).sort()).toEqual(
      [...EXPECTED_EXPORTS].sort(),
    );
  });
});
