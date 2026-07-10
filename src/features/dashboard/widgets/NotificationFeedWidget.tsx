"use client";

import { Bell } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { useIncidentFeed } from "@/lib/hooks/incidentFeed";
import type { WsIncidentEvent } from "@/lib/api/ws-events";

const ACTION_VARIANTS: Record<WsIncidentEvent["action"], "default" | "destructive"> = {
  health_failure: "destructive",
  health_recovery: "default",
};

const ACTION_LABELS: Record<WsIncidentEvent["action"], string> = {
  health_failure: "health failure",
  health_recovery: "recovered",
};

export function NotificationFeedWidget() {
  const incidents = useIncidentFeed();

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Bell className="size-4 text-muted-foreground" /> Notifications
      </h3>
      <p className="text-muted-foreground text-xs mb-3">
        Live incidents since page load — the engine keeps no notification
        history.
      </p>

      {incidents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Bell className="size-7 mb-2 opacity-40" />
          <p className="text-sm">No incidents this session.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {incidents.map((entry) => (
            <li key={entry.seq} className="flex items-start gap-2 text-sm">
              <Badge variant={ACTION_VARIANTS[entry.event.action]}>
                {ACTION_LABELS[entry.event.action]}
              </Badge>
              <span className="flex-1 min-w-0 truncate">
                {entry.event.display_name || entry.event.resource_id}
              </span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {entry.receivedAt.toLocaleTimeString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
