import { describe, expect, it } from "vitest";
import { computeValueAtRisk } from "./valueAtRisk";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

// Construit une série de snapshots à partir de rendements voulus.
function snapsFromReturns(returns, start = 1000) {
  const snaps = [snap("2026-01-01", start)];
  let value = start;
  let day = 1;
  for (const r of returns) {
    value *= 1 + r;
    day += 1;
    snaps.push(snap(`2026-01-${String(day).padStart(2, "0")}`, value));
  }
  return snaps;
}

describe("computeValueAtRisk", () => {
  it("hasData:false sous 2 rendements", () => {
    expect(computeValueAtRisk([snap("2026-01-01", 1000)])).toEqual({ hasData: false });
  });

  it("VaR paramétrique = z·σ quand la moyenne est nulle", () => {
    // rendements +0.10 / -0.10 alternés → moyenne ~0, σ ~0.10
    const result = computeValueAtRisk(snapsFromReturns([0.1, -0.1, 0.1, -0.1]));
    const lvl95 = result.levels.find((l) => l.confidence === 0.95);
    expect(result.volPct).toBeGreaterThan(0);
    // VaR_95 ≈ 1.6449 × σ (moyenne ~0)
    expect(lvl95.varParametricPct).toBeCloseTo(1.6448536 * result.volPct, 4);
  });

  it("masque la VaR historique sous 10 observations", () => {
    const result = computeValueAtRisk(snapsFromReturns([0.05, -0.03, 0.02]));
    expect(result.historicalAvailable).toBe(false);
    expect(result.levels[0].varHistoricalPct).toBeNull();
    expect(result.levels[0].cvarHistoricalPct).toBeNull();
  });

  it("calcule VaR et CVaR historiques dès 10 observations", () => {
    const returns = [-0.1, -0.08, -0.05, -0.02, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1];
    const result = computeValueAtRisk(snapsFromReturns(returns));
    expect(result.historicalAvailable).toBe(true);
    const lvl95 = result.levels.find((l) => l.confidence === 0.95);
    // n=10, queue 5% → index floor(0.5)=0 → pire rendement -0.10 → VaR 10 %
    expect(lvl95.varHistoricalPct).toBeCloseTo(10, 6);
    expect(lvl95.cvarHistoricalPct).toBeCloseTo(10, 6); // moyenne de la queue (1 élément)
  });
});
