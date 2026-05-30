import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { fetchFxRates } from "./fx";

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

describe("fetchFxRates (client)", () => {
  beforeEach(() => { globalThis.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("appelle /api/fx avec la base nettoyée", async () => {
    globalThis.fetch.mockReturnValue(ok({ base: "CAD", rates: { CAD: 1 } }));
    await fetchFxRates(" cad ");
    expect(globalThis.fetch.mock.calls[0][0]).toBe("/api/fx?base=CAD");
  });

  it("normalise le payload", async () => {
    globalThis.fetch.mockReturnValue(ok({ base: "USD", source: "frankfurter.app", asOf: "2026-05-30", rates: { USD: 1, CAD: 1.36 } }));
    const r = await fetchFxRates("USD");
    expect(r).toMatchObject({ base: "USD", source: "frankfurter.app", asOf: "2026-05-30" });
    expect(r.rates).toMatchObject({ CAD: 1.36 });
  });

  it("lève si la réponse n'est pas ok", async () => {
    globalThis.fetch.mockReturnValue(Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchFxRates("USD")).rejects.toThrow(/502/);
  });
});
