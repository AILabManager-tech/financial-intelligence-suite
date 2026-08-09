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

  it("masque la VaR historique quand la queue est trop peu peuplée", () => {
    const result = computeValueAtRisk(snapsFromReturns([0.05, -0.03, 0.02]));
    expect(result.historicalAvailable).toBe(false);
    expect(result.levels[0].varHistoricalPct).toBeNull();
    expect(result.levels[0].cvarHistoricalPct).toBeNull();
  });

  // Un quantile ne s'estime pas sur une queue d'un seul point : il faut au moins
  // 2 observations sous le seuil, soit n ≥ 2/(1−confiance).
  it("expose le nombre d'observations requis par niveau de confiance", () => {
    const result = computeValueAtRisk(snapsFromReturns(Array(12).fill(0.01).map((v, i) => (i % 2 ? -v : v))));
    expect(result.levels.find((l) => l.confidence === 0.95).minObservations).toBe(40);
    expect(result.levels.find((l) => l.confidence === 0.99).minObservations).toBe(200);
  });

  it("10 observations ne suffisent NI pour la VaR 95 % NI pour la VaR 99 %", () => {
    // Régression : ces deux niveaux rendaient auparavant la même valeur — le pire
    // rendement de la série — présentée comme un quantile à 5 % et à 1 %.
    const returns = [-0.1, -0.08, -0.05, -0.02, 0.01, 0.02, 0.03, 0.05, 0.08, 0.1];
    const result = computeValueAtRisk(snapsFromReturns(returns));
    expect(result.historicalAvailable).toBe(false);
    for (const lvl of result.levels) {
      expect(lvl.varHistoricalPct).toBeNull();
      expect(lvl.cvarHistoricalPct).toBeNull();
      expect(lvl.varParametricPct).not.toBeNull(); // la paramétrique reste définie
    }
  });

  it("VaR 95 % estimable à 40 observations, distincte de la 99 % (masquée)", () => {
    // 40 rendements distincts, du pire (-4 %) au meilleur (+3,9 %) par pas de 0,2 %.
    const returns = Array.from({ length: 40 }, (_, i) => (i - 20) * 0.002);
    const result = computeValueAtRisk(snapsFromReturns(returns));
    const lvl95 = result.levels.find((l) => l.confidence === 0.95);
    const lvl99 = result.levels.find((l) => l.confidence === 0.99);
    expect(result.historicalAvailable).toBe(true);
    // n=40, p=0.05 → position 0.05×39 = 1.95 → interpolation entre le 2e et le 3e
    // pire rendement : -0.038 + 0.95×(-0.036 − −0.038) = -0.0361 → VaR 3.61 %
    expect(lvl95.varHistoricalPct).toBeCloseTo(3.61, 6);
    // CVaR = moyenne des floor(0.05×40)=2 pires : (-0.040 + -0.038)/2 = -0.039
    expect(lvl95.cvarHistoricalPct).toBeCloseTo(3.9, 6);
    // CVaR strictement pire que la VaR — sinon la queue n'a qu'un point
    expect(lvl95.cvarHistoricalPct).toBeGreaterThan(lvl95.varHistoricalPct);
    // 99 % exige 200 observations
    expect(lvl99.varHistoricalPct).toBeNull();
  });

  it("VaR 95 % et VaR 99 % sont distinctes quand les deux sont estimables", () => {
    const returns = Array.from({ length: 250 }, (_, i) => (i - 125) * 0.0004);
    const result = computeValueAtRisk(snapsFromReturns(returns));
    const lvl95 = result.levels.find((l) => l.confidence === 0.95);
    const lvl99 = result.levels.find((l) => l.confidence === 0.99);
    expect(lvl95.varHistoricalPct).not.toBeNull();
    expect(lvl99.varHistoricalPct).not.toBeNull();
    expect(lvl99.varHistoricalPct).toBeGreaterThan(lvl95.varHistoricalPct);
    expect(lvl99.cvarHistoricalPct).toBeGreaterThan(lvl99.varHistoricalPct);
  });
});
