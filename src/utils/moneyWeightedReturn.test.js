import { describe, expect, it } from "vitest";
import { computeMoneyWeightedReturn } from "./moneyWeightedReturn";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("computeMoneyWeightedReturn", () => {
  it("hasData:false sous 2 snapshots ou valeur de départ nulle", () => {
    expect(computeMoneyWeightedReturn([snap("2026-05-01", 1000)])).toEqual({ hasData: false });
    expect(computeMoneyWeightedReturn([snap("2026-05-01", 0), snap("2026-05-02", 100)]).hasData).toBe(false);
  });

  it("sans flux sur un an : IRR = rendement point à point", () => {
    const result = computeMoneyWeightedReturn([snap("2025-05-01", 1000), snap("2026-05-01", 1100)]);
    expect(result.converged).toBe(true);
    expect(result.days).toBe(365);
    expect(result.annualizedIrrPct).toBeCloseTo(10, 4); // 1100/1000 - 1
    expect(result.periodMwrPct).toBeCloseTo(10, 4);
  });

  it("résout l'IRR avec un apport intermédiaire (effet timing)", () => {
    // -100 @0, -100 @1an, +210 @2ans → x²+x-2.1=0 → x≈1.03296 → IRR≈3.30%
    const result = computeMoneyWeightedReturn(
      [snap("2024-05-01", 100), snap("2026-05-01", 210)],
      [{ type: "buy", date: "2025-05-01", quantity: 1, price: 100 }],
    );
    expect(result.flowsCount).toBe(1);
    expect(result.annualizedIrrPct).toBeCloseTo(3.30, 1);
  });

  it("masque l'IRR annualisé sous un an mais donne le MWR de période", () => {
    const result = computeMoneyWeightedReturn([snap("2026-05-01", 1000), snap("2026-05-11", 1050)]);
    expect(result.annualizedIrrPct).toBeNull(); // série < 1 an
    expect(result.periodMwrPct).toBeCloseTo(5, 4); // 1050/1000 - 1 sur la période
    expect(result.days).toBe(10);
  });

  it("ignore les flux du jour de départ/fin (déjà dans la valeur de marché)", () => {
    const onlyEndDayFlow = computeMoneyWeightedReturn(
      [snap("2025-05-01", 1000), snap("2026-05-01", 1100)],
      [{ type: "buy", date: "2026-05-01", quantity: 1, price: 50 }],
    );
    expect(onlyEndDayFlow.flowsCount).toBe(0);
    expect(onlyEndDayFlow.annualizedIrrPct).toBeCloseTo(10, 4);
  });
});
