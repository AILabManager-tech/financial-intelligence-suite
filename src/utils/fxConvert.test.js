import { describe, it, expect } from "vitest";
import { convertAmount, convertPortfolioTotals } from "./fxConvert";

const rates = { USD: 1, CAD: 1.36, EUR: 0.92 };

describe("convertAmount", () => {
  it("convertit via la map ancrée sur la base", () => {
    expect(convertAmount(100, "USD", "CAD", rates)).toBeCloseTo(136, 6);
  });
  it("identité si même devise", () => {
    expect(convertAmount(100, "CAD", "CAD", rates)).toBe(100);
  });
  it("null si taux manquant", () => {
    expect(convertAmount(100, "USD", "JPY", rates)).toBeNull();
  });
});

describe("convertPortfolioTotals", () => {
  it("convertit les agrégats USD vers la devise base", () => {
    const out = convertPortfolioTotals(
      { totalMarketValue: 1000, totalCost: 800, unrealizedPnl: 200 },
      "USD", "CAD", rates,
    );
    expect(out).toMatchObject({ from: "USD", to: "CAD", converted: true });
    expect(out.totalMarketValue).toBeCloseTo(1360, 6);
    expect(out.unrealizedPnl).toBeCloseTo(272, 6);
  });

  it("converted=false si la base est déjà USD", () => {
    const out = convertPortfolioTotals({ totalMarketValue: 1000 }, "USD", "USD", rates);
    expect(out.converted).toBe(false);
    expect(out.totalMarketValue).toBe(1000);
  });

  it("champ null si taux indisponible", () => {
    const out = convertPortfolioTotals({ totalMarketValue: 1000 }, "USD", "JPY", rates);
    expect(out.totalMarketValue).toBeNull();
  });
});
