/**
 * Test-environment shims for the typed API client.
 *
 * openapi-fetch captures `globalThis.Request` and `globalThis.fetch` when
 * the client module is imported, so both shims must be installed here —
 * setup files load before any test-file import.
 *
 * 1. Request: the client uses contract-relative paths (baseUrl "") that the
 *    browser resolves against the proxy origin; Node's undici Request needs
 *    an absolute URL, so resolve them against a fixed test origin.
 * 2. fetch: a delegating wrapper so per-test `vi.stubGlobal("fetch", mock)`
 *    still takes effect despite the at-import capture.
 */

const OrigRequest = globalThis.Request;
class RelativeRequest extends OrigRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    if (typeof input === "string" && input.startsWith("/")) {
      input = `http://localhost${input}`;
    }
    super(input, init);
  }
}
globalThis.Request = RelativeRequest;

const origFetch = globalThis.fetch;
const delegatingFetch: typeof fetch = (...args) => {
  const current = globalThis.fetch;
  // avoid self-recursion when no test stub is installed
  return (current === delegatingFetch ? origFetch : current)(...args);
};
globalThis.fetch = delegatingFetch;
