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
});
