"use client"

/**
 * Barrel for the sidebar primitives — split from the single vendored
 * shadcn sidebar.tsx (726 lines) in #22 to satisfy the 700-line cap.
 * The public surface is pinned by ui/__tests__/sidebar-exports.test.tsx:
 * exactly the 24 names the original file exported, nothing more.
 */

export { SidebarProvider, useSidebar } from "./context"
export { Sidebar, SidebarInset, SidebarRail, SidebarTrigger } from "./sidebar"
export {
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarSeparator,
} from "./structure"
export {
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./menu"
