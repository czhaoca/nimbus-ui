import { Bell } from "lucide-react";

// Dead stub moved as-is from the pre-migration src/app/page.tsx (#28);
// #30 rebuilds it as a session-scoped live WS incident feed.
export function NotificationFeedWidget() {
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
