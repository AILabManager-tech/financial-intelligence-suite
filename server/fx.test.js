import { describe, it, expect, vi } from "vitest";
import { fetchFxRates, convertAmount } from "./fx.js";

const jsonResponse = (body, ok = true, status = 200) => ({
  ok,
  status,
  json: () => Promise.resolve(body),
});

describe("convertAmount (pur)", () => {
  const rates = { USD: 1, CAD: 1.36, EUR: 0.92 };

  it("retourne le montant tel quel si même devise", () => {
    expect(convertAmount(100, "USD", "USD", rates)).toBe(100);
  });

  it("convertit via la map ancrée sur la base", () => {
    expect(convertAmount(100, "USD", "CAD", rates)).toBeCloseTo(136, 6);
    // EUR -> CAD = 1.36/0.92
    expect(convertAmount(100, "EUR", "CAD", rates)).toBeCloseTo(100 * (1.36 / 0.92), 6);
  });

  it("retourne null si un taux manque (jamais inventé)", () => {
    expect(convertAmount(100, "USD", "JPY", rates)).toBeNull();
    expect(convertAmount(100, "GBP", "USD", rates)).toBeNull();
  });

  it("retourne null sur montant invalide", () => {
    expect(convertAmount("abc", "USD", "CAD", rates)).toBeNull();
    expect(convertAmount(100, "USD", "CAD", null)).toBeNull();
  });
});

describe("fetchFxRates", () => {
  it("normalise Frankfurter et inclut la base = 1", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ amount: 1, base: "USD", date: "2026-05-30", rates: { CAD: 1.36, EUR: 0.92 } }),
    );
    const result = await fetchFxRates("USD", { fetcher });
    expect(result.source).toBe("frankfurter.app");
    expect(result.base).toBe("USD");
    expect(result.asOf).toBe("2026-05-30");
    expect(result.rates).toMatchObject({ USD: 1, CAD: 1.36, EUR: 0.92 });
  });

  it("nettoie la devise base (uppercase + validation)", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ base: "EUR", date: "2026-05-30", rates: { USD: 1.08 } }),
    );
    const result = await fetchFxRates(" eur ", { fetcher });
    expect(result.base).toBe("EUR");
    expect(result.rates).toMatchObject({ EUR: 1, USD: 1.08 });
  });

  it("bascule sur exchangerate.host si Frankfurter échoue et clé présente", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(jsonResponse({}, false, 503))
      .mockResolvedValueOnce(jsonResponse({
        success: true, source: "USD", timestamp: 1748563200,
        quotes: { USDCAD: 1.36, USDEUR: 0.92 },
      }));
    const result = await fetchFxRates("USD", { fetcher, exchangerateApiKey: "k" });
    expect(result.source).toBe("exchangerate.host");
    expect(result.rates).toMatchObject({ USD: 1, CAD: 1.36, EUR: 0.92 });
  });

  it("propage l'erreur si tous les providers échouent", async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({}, false, 500));
    await expect(fetchFxRates("USD", { fetcher })).rejects.toThrow();
  });
});
