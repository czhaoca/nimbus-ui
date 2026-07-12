import { useSyncExternalStore } from "react";

import type { WsIncidentEvent } from "@/lib/api/ws-events";

/**
 * Session-scoped incident buffer (#30, DEC-A: module-level store).
 *
 * Holds only incidents received over the live WS connection — newest
 * first, capped, gone on reload by design. The engine's persisted
 * notification feed (GET /api/v1/notifications/feed, contract 1.6.0) is
 * not consumed by the UI yet (#43); when that wiring lands it belongs to
 * the consuming widget, not this deliberately session-local store.
 */
export interface IncidentFeedEntry {
  seq: number;
  receivedAt: Date;
  event: WsIncidentEvent;
}

const CAP = 50;

let entries: readonly IncidentFeedEntry[] = [];
let seq = 0;
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function pushIncident(event: WsIncidentEvent): void {
  entries = [{ seq: ++seq, receivedAt: new Date(), event }, ...entries].slice(
    0,
    CAP,
  );
  emit();
}

// Module state must reset between tests (the DEC-A trade-off).
export function resetIncidentFeed(): void {
  entries = [];
  seq = 0;
  emit();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): readonly IncidentFeedEntry[] {
  return entries;
}

export function useIncidentFeed(): readonly IncidentFeedEntry[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
