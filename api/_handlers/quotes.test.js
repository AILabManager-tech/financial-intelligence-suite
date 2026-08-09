import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./quotes.js";

function mockResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: "",
    setHeader(key, value) {
      this.headers[key] = value;
    },
    end(body) {
      this.body = body;
    },
    get json() {
      return JSON.parse(this.body);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.FINNHUB_API_KEY;
});

describe("quotes handler — graceful degradation", () => {
  it("returns 200 with a structured error when a symbol has no coverage (no false 502)", async () => {
    // No Finnhub key -> primary throws -> Stooq fallback returns an empty payload
    // -> normalizeStooqQuote throws -> the symbol is rejected (e.g. a Canadian listing).
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => ({ symbols: [] }) })),
    );

    const response = mockResponse();
    await handler({ query: { symbols: "UNH.TO" } }, response);

    // The endpoint itself is healthy: it must NOT report a 502 just because one
    // uncovered symbol failed. The failure is carried per-symbol in `errors`.
    expect(response.statusCode).toBe(200);
    expect(response.json.quotes).toEqual([]);
    expect(response.json.errors).toHaveLength(1);
    expect(response.json.errors[0]).toContain("UNH.TO");
  });

  it("still returns the available quotes when a batch is partially covered", async () => {
    process.env.FINNHUB_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes("finnhub.io") && u.includes("symbol=UNH&")) {
          return { ok: true, json: async () => ({ c: 377, pc: 378, d: -1, dp: -0.26, t: 1 }) };
        }
        // Anything else (the Canadian symbol on both providers) fails.
        return { ok: false, status: 404, json: async () => ({}) };
      }),
    );

    const response = mockResponse();
    await handler({ query: { symbols: "UNH,UNH.TO" } }, response);

    expect(response.statusCode).toBe(200);
    expect(response.json.quotes).toHaveLength(1);
    expect(response.json.quotes[0].symbol).toBe("UNH");
    expect(response.json.errors).toHaveLength(1);
  });

  it("rejects an empty symbols list with 400", async () => {
    const response = mockResponse();
    await handler({ query: { symbols: "" } }, response);
    expect(response.statusCode).toBe(400);
  });

  it("masks an undeterminable change instead of reporting a fabricated 0", async () => {
    // Finnhub answers with a price but no `d` / `dp` and no usable previous
    // close: the variation is UNKNOWN. Reporting 0 would state "flat today",
    // which is a fabricated fact (strict-factuality rule: absent => masked).
    process.env.FINNHUB_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ c: 100, t: 1 }) })));

    const response = mockResponse();
    await handler({ query: { symbols: "NOCHG" } }, response);

    const quote = response.json.quotes[0];
    expect(quote.price).toBe(100);
    expect(quote.change).toBeNull();
    expect(quote.changePct).toBeNull();
  });

  it("lists every source actually used instead of claiming a single global one", async () => {
    // One symbol served by Finnhub, one by the Stooq fallback. Announcing
    // `source: "finnhub.io"` for the whole payload — as it did when a single
    // quote came from Finnhub — misattributes the other one.
    process.env.FINNHUB_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const u = String(url);
        if (u.includes("finnhub.io") && u.includes("symbol=AAA&")) {
          return { ok: true, json: async () => ({ c: 10, pc: 9, d: 1, dp: 11.1, t: 1 }) };
        }
        if (u.includes("stooq.com")) {
          return {
            ok: true,
            json: async () => ({
              symbols: [{ name: "BBB", open: 4, close: 5, volume: 1, date: "2026-08-07", time: "20:00:00" }],
            }),
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      }),
    );

    const response = mockResponse();
    await handler({ query: { symbols: "AAA,BBB" } }, response);

    expect(response.json.quotes).toHaveLength(2);
    expect(response.json.sources.sort()).toEqual(["finnhub.io", "stooq.com"]);
    // Every quote still carries its own provenance (per-field rule).
    expect(response.json.quotes.map((q) => q.source).sort()).toEqual(["finnhub.io", "stooq.com"]);
  });
});
