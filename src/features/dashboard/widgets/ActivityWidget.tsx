import { Clock } from "lucide-react";

// Dead stub moved as-is from the pre-migration src/app/page.tsx (#28);
// #29 rebuilds it on the real /api/v1/activity feed.
export function ActivityWidget() {
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
