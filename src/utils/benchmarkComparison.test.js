import { describe, expect, it } from "vitest";
import { computeBenchmarkComparison } from "./benchmarkComparison";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

const SNAPS = [snap("2026-05-01", 1000), snap("2026-05-02", 1100), snap("2026-05-03", 1045)];
// TWR du portefeuille sur 05-01→05-03 = (1.1 × 0.95) − 1 = +4.5 %

describe("computeBenchmarkComparison", () => {
  it("hasData:false si le portefeuille n'a pas de TWR", () => {
    expect(computeBenchmarkComparison([snap("2026-05-01", 1000)], [], [])).toEqual({ hasData: false });
  });

  it("calcule rendement benchmark et excès sur la même fenêtre", () => {
    const bench = [
      { date: "2026-05-01", close: 100 },
      { date: "2026-05-02", close: 102 },
      { date: "2026-05-03", close: 103 }, // +3 % sur la fenêtre
    ];
    const result = computeBenchmarkComparison(SNAPS, [], bench, { benchmarkLabel: "S&P 500" });
    expect(result.portfolioReturnPct).toBeCloseTo(4.5, 6);
    expect(result.benchmarkReturnPct).toBeCloseTo(3, 6);
    expect(result.excessPct).toBeCloseTo(1.5, 6);
    expect(result.covered).toBe(true);
    expect(result.benchmarkLabel).toBe("S&P 500");
  });

  it("utilise la clôture on-or-before quand les dates ne coïncident pas exactement", () => {
    const bench = [
      { date: "2026-04-28", close: 100 }, // dernier ≤ 05-01
      { date: "2026-05-02", close: 110 }, // dernier ≤ 05-03
    ];
    const result = computeBenchmarkComparison(SNAPS, [], bench);
    expect(result.benchmarkReturnPct).toBeCloseTo(10, 6); // (110-100)/100
  });

  it("masque le rendement benchmark si la série ne couvre pas la fenêtre", () => {
    const bench = [{ date: "2026-06-01", close: 100 }]; // postérieur à toute la fenêtre
    const result = computeBenchmarkComparison(SNAPS, [], bench);
    expect(result.hasData).toBe(true);
    expect(result.benchmarkReturnPct).toBeNull();
    expect(result.excessPct).toBeNull();
    expect(result.covered).toBe(false);
  });
});
