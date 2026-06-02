import { describe, it, expect, vi } from "vitest";
import { dispatch, ROUTES } from "./router.js";

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
      "macro", "sec-filings", "peers", "fx",
    ]) {
      expect(typeof ROUTES[key]).toBe("function");
    }
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
