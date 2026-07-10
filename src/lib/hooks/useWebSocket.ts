import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { showToast } from "@/components/Toasts";

import { pushIncident } from "@/lib/hooks/incidentFeed";
import type { WsEvent } from "@/lib/api/ws-events";

/**
 * WebSocket hook that auto-invalidates React Query caches on resource changes.
 * Reconnects automatically with exponential backoff.
 */
export function useWebSocket() {
  const queryClient = useQueryClient();
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    function connect() {
      try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const ws = new WebSocket(`${protocol}//${host}/ws`);

      ws.onopen = () => {
        retryRef.current = 0;
      };

      ws.onmessage = (event: MessageEvent) => {
        try {
          const data: WsEvent = JSON.parse(event.data as string);
          switch (data.type) {
            case "resource_change":
              queryClient.invalidateQueries({ queryKey: ["resources"] });
              queryClient.invalidateQueries({ queryKey: ["providers"] });
              queryClient.invalidateQueries({ queryKey: ["budget-status"] });
              showToast(`Resource ${data.resource_id}: ${data.action}`, "info");
              break;
            case "incident": {
              queryClient.invalidateQueries({ queryKey: ["health"] });
              queryClient.invalidateQueries({ queryKey: ["providers"] });
              queryClient.invalidateQueries({ queryKey: ["provider-status"] });
              const name = data.display_name || data.resource_id;
              if (data.action === "health_failure") {
                showToast(`Health failure: ${name}`, "error");
              } else {
                showToast(`Recovered: ${name}`, "success");
              }
              // Additive (#30): incidents also land in the session feed so
              // they outlive the toast; resource_change stays feed-free.
              pushIncident(data);
              break;
            }
            case "pong":
              break;
            default:
              // Unknown future event types: log-and-ignore, never throw
              // (contract rule — the committed catalog may grow).
              console.debug("[ws] unhandled event type", data);
          }
        } catch {
          // ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        wsRef.current = null;
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        timerRef.current = setTimeout(connect, delay);
      };

      wsRef.current = ws;
      } catch {
        // WebSocket creation failed; retry after delay
        const delay = Math.min(1000 * 2 ** retryRef.current, 30000);
        retryRef.current++;
        timerRef.current = setTimeout(connect, delay);
      }
    }

    connect();
    return () => {
      clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [queryClient]);
}
