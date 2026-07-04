"use client";

import { toast } from "sonner";

export type ToastType = "info" | "success" | "warning" | "error";

/**
 * Call from anywhere to show a toast notification.
 * Now delegates to Sonner (shadcn/ui).
 */
export function showToast(message: string, type: ToastType = "info") {
  switch (type) {
    case "success":
      toast.success(message);
      break;
    case "error":
      toast.error(message);
      break;
    case "warning":
      toast.warning(message);
      break;
    default:
      toast.info(message);
  }
}

/**
 * @deprecated The Toaster is now rendered in AppShell via Sonner.
 * This component is kept only for backward compatibility with imports.
 */
export function ToastContainer() {
  return null;
}
