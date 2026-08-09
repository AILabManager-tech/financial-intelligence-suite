import { describe, expect, it } from "vitest";
import { computeBenchmarkStats, pairBenchmarkReturns } from "./benchmarkStats";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

// Portefeuille = exactement 2× le benchmark période par période → beta 2, corr 1.
const SNAPS = [
  snap("2026-05-01", 1000),
  snap("2026-05-02", 1200), // +20%
  snap("2026-05-03", 960), // -20%
  snap("2026-05-04", 1152), // +20%
];
const BENCH = [
  { date: "2026-05-01", close: 100 },
  { date: "2026-05-02", close: 110 }, // +10%
  { date: "2026-05-03", close: 99 }, // -10%
  { date: "2026-05-04", close: 108.9 }, // +10%
];

describe("pairBenchmarkReturns", () => {
  it("apparie les rendements de sous-période portefeuille/benchmark", () => {
    const pairs = pairBenchmarkReturns(SNAPS, [], BENCH);
    expect(pairs).toHaveLength(3);
    expect(pairs[0].p).toBeCloseTo(0.2, 6);
    expect(pairs[0].b).toBeCloseTo(0.1, 6);
  });
});

describe("computeBenchmarkStats", () => {
  it("hasData:false sous 2 paires", () => {
    expect(computeBenchmarkStats([snap("2026-05-01", 1000)], [], BENCH)).toEqual({ hasData: false });
  });

  it("régression OLS : beta, corrélation, R² sur une relation parfaite 2×", () => {
    const stats = computeBenchmarkStats(SNAPS, [], BENCH);
    expect(stats.pairs).toBe(3);
    expect(stats.beta).toBeCloseTo(2, 6);
    expect(stats.correlation).toBeCloseTo(1, 6);
    expect(stats.rSquared).toBeCloseTo(1, 6);
    // p = 2b exactement → alpha de Jensen nul
    expect(stats.alphaAnnualizedPct).toBeCloseTo(0, 6);
  });

  it("up/down capture et ratios actifs", () => {
    const stats = computeBenchmarkStats(SNAPS, [], BENCH);
    expect(stats.upCapturePct).toBeCloseTo(200, 4); // portefeuille capte 2× la hausse
    expect(stats.downCapturePct).toBeCloseTo(200, 4); // et 2× la baisse
    expect(stats.informationRatio).not.toBeNull();
    expect(stats.trackingErrorPct).toBeGreaterThan(0);
    // Treynor = (excès moyen × périodes/an) / beta. Espacement 1 jour calendaire
    // ⇒ 365 périodes/an (et non 252 : le dénominateur est en jours calendaires).
    // Ancienne valeur 8,4 × 365/252 = 12,1667.
    expect(stats.treynor).toBeCloseTo(12.1667, 3);
  });

  it("beta/corrélation null si la variance du benchmark est nulle", () => {
    const flatBench = [
      { date: "2026-05-01", close: 100 },
      { date: "2026-05-02", close: 100 },
      { date: "2026-05-03", close: 100 },
      { date: "2026-05-04", close: 100 },
    ];
    const stats = computeBenchmarkStats(SNAPS, [], flatBench);
    // benchmark plat → rendements 0, variance 0 → beta et corrélation non définis
    expect(stats.beta).toBeNull();
    expect(stats.correlation).toBeNull();
  });
});
