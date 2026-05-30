import { describe, it, expect } from "vitest";
import { computeDistribution, HISTOGRAM_BUCKETS } from "./returnsDistribution";

// Construit une liste de rendements mensuels {month, returnPct}.
function monthly(...pcts) {
  return pcts.map((returnPct, i) => ({
    month: `2024-${String(i + 1).padStart(2, "0")}`,
    returnPct,
  }));
}

describe("computeDistribution", () => {
  it("retourne null si insuffisant (< 2 rendements valides)", () => {
    expect(computeDistribution(null)).toBeNull();
    expect(computeDistribution([])).toBeNull();
    expect(computeDistribution(monthly(1.2))).toBeNull();
    // les entrées à returnPct null sont écartées
    expect(computeDistribution([{ month: "2024-01", returnPct: null }, { month: "2024-02", returnPct: null }])).toBeNull();
  });

  it("calcule le compte, la moyenne et le % de mois positifs", () => {
    const d = computeDistribution(monthly(2, -1, 3, 0, -4));
    expect(d.count).toBe(5);
    expect(d.averagePct).toBeCloseTo((2 - 1 + 3 + 0 - 4) / 5, 6);
    // positifs = mois > 0 ⇒ 2 et 3 ⇒ 2/5 = 40 %
    expect(d.positiveMonthsPct).toBeCloseTo(40, 6);
  });

  it("identifie le meilleur et le pire mois", () => {
    const d = computeDistribution(monthly(2, -1, 7, -5));
    expect(d.bestMonth).toEqual({ month: "2024-03", returnPct: 7 });
    expect(d.worstMonth).toEqual({ month: "2024-04", returnPct: -5 });
  });

  it("calcule l'écart-type d'échantillon des rendements mensuels", () => {
    // [2,4] : moyenne 3, variance échantillon ((1)+(1))/(2-1)=2, σ=√2
    const d = computeDistribution(monthly(2, 4));
    expect(d.stdDevPct).toBeCloseTo(Math.SQRT2, 6);
  });

  it("renvoie skewness/kurtosis null si l'écart-type est nul ou n trop faible", () => {
    const flat = computeDistribution(monthly(3, 3, 3));
    expect(flat.stdDevPct).toBe(0);
    expect(flat.skewness).toBeNull();
    expect(flat.kurtosis).toBeNull();
  });

  it("calcule une skewness positive pour une série étirée à droite", () => {
    const d = computeDistribution(monthly(0, 0, 0, 0, 10));
    expect(d.skewness).toBeGreaterThan(0);
    expect(typeof d.kurtosis).toBe("number");
  });

  it("produit un histogramme couvrant tous les rendements, somme = count", () => {
    const d = computeDistribution(monthly(-12, -3, 0.5, 4, 11));
    expect(d.histogram.length).toBe(HISTOGRAM_BUCKETS.length);
    const total = d.histogram.reduce((n, b) => n + b.count, 0);
    expect(total).toBe(d.count);
    // chaque bucket porte un libellé et un compte entier >= 0
    for (const b of d.histogram) {
      expect(typeof b.label).toBe("string");
      expect(Number.isInteger(b.count)).toBe(true);
      expect(b.count).toBeGreaterThanOrEqual(0);
    }
  });
});
