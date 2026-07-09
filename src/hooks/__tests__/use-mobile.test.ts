/**
 * Pins useIsMobile (#24/G4): jsdom has no matchMedia, so a local stub
 * (per the ticket's pre-decided constraint — no global setup shim)
 * models the change-listener contract and lets innerWidth drive both
 * breakpoint sides, the update path, and unmount cleanup.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useIsMobile } from "@/hooks/use-mobile";

type ChangeListener = () => void;

function stubViewport(width: number) {
  const listeners = new Set<ChangeListener>();
  const setInnerWidth = (w: number) =>
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: w,
    });
  setInnerWidth(width);
  const mql = {
    get matches() {
      return window.innerWidth < 768;
    },
    media: "(max-width: 767px)",
    onchange: null,
    addEventListener: (_type: "change", cb: ChangeListener) => {
      listeners.add(cb);
    },
    removeEventListener: (_type: "change", cb: ChangeListener) => {
      listeners.delete(cb);
    },
    dispatchEvent: () => false,
  };
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(mql));
  return {
    listeners,
    resizeTo(w: number) {
      setInnerWidth(w);
      act(() => {
        listeners.forEach((cb) => cb());
      });
    },
  };
}

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or hook trees leak across tests.
  cleanup();
  vi.unstubAllGlobals();
});

describe("useIsMobile", () => {
  it("is false at desktop width", () => {
    stubViewport(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });

  it("is true below the 768px breakpoint", () => {
    stubViewport(375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it("updates when the media query fires a change event", () => {
    const viewport = stubViewport(1024);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    viewport.resizeTo(375);
    expect(result.current).toBe(true);

    viewport.resizeTo(1280);
    expect(result.current).toBe(false);
  });

  it("unsubscribes its change listener on unmount", () => {
    const viewport = stubViewport(1024);
    const { unmount } = renderHook(() => useIsMobile());
    expect(viewport.listeners.size).toBe(1);

    unmount();
    expect(viewport.listeners.size).toBe(0);
  });
});
