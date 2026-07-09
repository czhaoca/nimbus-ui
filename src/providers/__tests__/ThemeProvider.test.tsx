/**
 * Pins ThemeProvider (#24/G4): the next-themes wrapper must keep its
 * dark default and class-attribute strategy. enableSystem makes
 * next-themes probe matchMedia("(prefers-color-scheme: dark)"), which
 * jsdom lacks — stubbed locally per the ticket's constraint.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { useTheme } from "next-themes";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ThemeProvider } from "@/providers/ThemeProvider";

function stubMatchMedia() {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      // next-themes 0.4.x subscribes via the legacy MediaQueryList API.
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })),
  );
}

function ThemeProbe() {
  const { theme } = useTheme();
  return <span data-testid="theme">{theme}</span>;
}

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.unstubAllGlobals();
  window.localStorage?.clear();
  document.documentElement.removeAttribute("class");
  document.documentElement.removeAttribute("style");
});

describe("ThemeProvider", () => {
  it("defaults to the dark theme", () => {
    stubMatchMedia();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId("theme").textContent).toBe("dark");
  });

  it("applies the theme via the class attribute strategy", () => {
    stubMatchMedia();
    render(
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>,
    );
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("renders its children", () => {
    stubMatchMedia();
    render(
      <ThemeProvider>
        <div data-testid="child">content</div>
      </ThemeProvider>,
    );
    expect(screen.getByTestId("child").textContent).toBe("content");
  });
});
