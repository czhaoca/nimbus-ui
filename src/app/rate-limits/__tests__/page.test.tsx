import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import RateLimitsPage from "../page";

// Pins nimbus-ui#15 (DEC-4): the rate-limit config is exactly the 2-field
// schema component — the page must neither render nor send the phantom
// burst_size/enabled fields the engine silently dropped.

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch() {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    if (req.method === "GET") {
      return json({ requests_per_minute: 60, requests_per_hour: 1000 });
    }
    return json(await req.clone().json());
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("RateLimitsPage", () => {
  it("renders only the two engine-backed fields", async () => {
    stubFetch();
    render(<RateLimitsPage />);

    expect(await screen.findByLabelText(/requests per minute/i)).toBeTruthy();
    expect(screen.getByLabelText(/requests per hour/i)).toBeTruthy();
    expect(screen.queryByText(/burst/i)).toBeNull();
    expect(screen.queryByText(/enable rate limiting/i)).toBeNull();
  });

  it("saves exactly the contract shape (no phantom fields)", async () => {
    const fetchMock = stubFetch();
    render(<RateLimitsPage />);
    const user = userEvent.setup();

    const rpm = await screen.findByLabelText(/requests per minute/i);
    // Single change event: the input's `parseInt(...) || 1` floor makes
    // keystroke-wise clearing impossible to type through.
    fireEvent.change(rpm, { target: { value: "120" } });
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => {
      const post = fetchMock.mock.calls
        .map((c) => c[0] as Request)
        .find((r) => r.method === "POST");
      expect(post).toBeTruthy();
    });
    const post = fetchMock.mock.calls
      .map((c) => c[0] as Request)
      .find((r) => r.method === "POST")!;
    expect(new URL(post.url).pathname).toBe("/api/v1/settings/rate-limits");
    expect(await post.clone().json()).toEqual({
      requests_per_minute: 120,
      requests_per_hour: 1000,
    });
  });
});
