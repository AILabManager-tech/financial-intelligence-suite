import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import handler from "./history.js";

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: null,
    setHeader(name, value) {
      this.headers[name] = value;
    },
    end(payload) {
      this.body = JSON.parse(payload);
    },
  };
}

function okTimeSeries() {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      values: [
        { datetime: "2026-06-02", open: "10", high: "11", low: "9", close: "10.5", volume: "100" },
        { datetime: "2026-06-01", open: "9", high: "10", low: "8", close: "9.5", volume: "120" },
      ],
    }),
  };
}

beforeEach(() => {
  process.env.TWELVE_DATA_API_KEY = "test-key";
  vi.stubGlobal("fetch", vi.fn(async () => okTimeSeries()));
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.TWELVE_DATA_API_KEY;
});

describe("history handler memo cache", () => {
  it("serves a second identical request from cache without re-fetching", async () => {
    const r1 = mockResponse();
    await handler({ query: { symbol: "CACHEME", days: "30" } }, r1);
    expect(r1.statusCode).toBe(200);
    expect(r1.body.cache.status).toBe("miss");
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const r2 = mockResponse();
    await handler({ query: { symbol: "CACHEME", days: "30" } }, r2);
    expect(r2.statusCode).toBe(200);
    expect(r2.body.cache.status).toBe("hit");
    expect(r2.body.points).toEqual(r1.body.points);
    // No second upstream call — the cap-saving win.
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("fetches again for a different symbol", async () => {
    await handler({ query: { symbol: "FRESHSYM", days: "30" } }, mockResponse());
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("does not cache when the API key is missing (503)", async () => {
    delete process.env.TWELVE_DATA_API_KEY;
    const r = mockResponse();
    await handler({ query: { symbol: "NOKEY", days: "30" } }, r);
    expect(r.statusCode).toBe(503);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
