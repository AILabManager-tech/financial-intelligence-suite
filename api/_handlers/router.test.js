import { describe, it, expect, vi } from "vitest";
import { dispatch, ROUTES, resolveEndpoint } from "./router.js";

function fakeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
  };
}

describe("api router", () => {
  it("registers every client-facing endpoint", () => {
    // Guards against a handler being dropped from the catch-all on a rename.
    for (const key of [
      "quotes", "history", "search", "fundamentals", "company-news", "earnings",
      "dividends", "analyst-ratings", "insider-transactions", "insider-sentiment",
      "macro", "sec-filings", "peers", "fx", "health",
    ]) {
      expect(typeof ROUTES[key]).toBe("function");
    }
  });

  it("resolves /api/health/market-data to the 'health' endpoint", () => {
    expect(resolveEndpoint({ query: { path: ["health", "market-data"] } })).toBe("health");
    expect(resolveEndpoint({ url: "/api/health/market-data" })).toBe("health");
  });

  it("resolves the endpoint from the route param or the URL", () => {
    expect(resolveEndpoint({ query: { path: ["quotes"] } })).toBe("quotes");
    expect(resolveEndpoint({ query: { path: "fx" } })).toBe("fx");
    // Fallback when Vercel does not inject the param: parse request.url.
    expect(resolveEndpoint({ query: {}, url: "/api/quotes?symbols=AAPL" })).toBe("quotes");
    expect(resolveEndpoint({ url: "/api/company-news?symbol=AAPL" })).toBe("company-news");
    expect(resolveEndpoint({ url: "/api/" })).toBeUndefined();
  });

  it("dispatches a URL-only request (no route param) to the handler", async () => {
    const quotes = vi.fn(async (_req, res) => res.end("ok"));
    const req = { query: { symbols: "AAPL" }, url: "/api/quotes?symbols=AAPL" };
    const res = fakeRes();
    await dispatch(req, res, { quotes });
    expect(quotes).toHaveBeenCalledWith(req, res);
  });

  it("dispatches the array path param to the matching handler", async () => {
    const quotes = vi.fn(async (_req, res) => res.end("ok"));
    const req = { query: { path: ["quotes"], symbols: "AAPL" } };
    const res = fakeRes();
    await dispatch(req, res, { quotes });
    expect(quotes).toHaveBeenCalledWith(req, res);
  });

  it("also accepts a string path param", async () => {
    const fx = vi.fn(async (_req, res) => res.end("fx"));
    const req = { query: { path: "fx" } };
    const res = fakeRes();
    await dispatch(req, res, { fx });
    expect(fx).toHaveBeenCalled();
  });

  it("returns 404 JSON for an unknown endpoint", async () => {
    const req = { query: { path: ["nope"] } };
    const res = fakeRes();
    await dispatch(req, res, { quotes: vi.fn() });
    expect(res.statusCode).toBe(404);
    expect(res.headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(res.body).error).toContain("nope");
  });

  it("404s when no path segment is present", async () => {
    const req = { query: {} };
    const res = fakeRes();
    await dispatch(req, res, {});
    expect(res.statusCode).toBe(404);
  });
});
