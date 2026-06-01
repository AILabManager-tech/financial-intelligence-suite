import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchMacroIndicators } from "./macro";

const SAMPLE = {
  source: "fred.stlouisfed.org",
  fetchedAt: "2026-05-09T12:00:00.000Z",
  indicators: [{ id: "FEDFUNDS", label: "Taux directeur Fed", unit: "%", value: 5.33, date: "2026-05-01" }],
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) }));
});
afterEach(() => vi.restoreAllMocks());

describe("fetchMacroIndicators (client)", () => {
  it("GET /api/macro et retourne les indicateurs", async () => {
    const r = await fetchMacroIndicators();
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain("/api/macro");
    expect(r.indicators[0].value).toBe(5.33);
  });

  it("throw sur réponse non-OK", async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchMacroIndicators()).rejects.toThrow(/502/);
  });

  it("transmet le signal", async () => {
    const c = new AbortController();
    await fetchMacroIndicators({ signal: c.signal });
    expect(globalThis.fetch.mock.calls[0][1]?.signal).toBe(c.signal);
  });
});
