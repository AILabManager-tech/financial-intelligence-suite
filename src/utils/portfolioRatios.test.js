import { describe, expect, it } from "vitest";
import { computePortfolioRatios } from "./portfolioRatios";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("computePortfolioRatios", () => {
  it("hasData:false sous 2 rendements", () => {
    expect(computePortfolioRatios([snap("2026-05-01", 1000)])).toEqual({ hasData: false });
    expect(computePortfolioRatios([snap("2026-05-01", 1000), snap("2026-05-02", 1100)]).hasData).toBe(false);
  });

  it("Sharpe et Sortino annualisés sur une série connue (rf=0)", () => {
    const result = computePortfolioRatios([
      snap("2026-05-01", 100),
      snap("2026-05-02", 110),
      snap("2026-05-03", 99),
      snap("2026-05-04", 108.9),
    ]);
    expect(result.hasData).toBe(true);
    expect(result.observations).toBe(3);
    // rendements {0.1,-0.1,0.1} : mean 0.0333, σ 0.11547. Espacement 1 jour
    // calendaire ⇒ 365 périodes/an → Sharpe = mean/σ × √365.
    expect(result.sharpe).toBeCloseTo((0.0333333 / 0.1154701) * Math.sqrt(365), 1);
    // downside dev = √(mean(min(0,r)²)) = √(0.01/3) = 0.057735 → Sortino plus élevé
    expect(result.sortino).toBeCloseTo((0.0333333 / 0.0577350) * Math.sqrt(365), 1);
    // série < 1 an → Calmar et rendement annualisé masqués
    expect(result.calmar).toBeNull();
    expect(result.annualizedReturnPct).toBeNull();
  });

  it("Sortino null quand il n'y a aucune baisse (série monotone montante)", () => {
    const result = computePortfolioRatios([
      snap("2026-05-01", 100),
      snap("2026-05-02", 105),
      snap("2026-05-03", 110),
    ]);
    expect(result.sortino).toBeNull();
    expect(result.sharpe).not.toBeNull();
  });

  it("Calmar et rendement annualisé dès que la série couvre un an", () => {
    const result = computePortfolioRatios([
      snap("2025-01-01", 1000),
      snap("2025-07-01", 900), // -10% → repli max -10%
      snap("2026-02-01", 1200),
    ]);
    expect(result.annualizedReturnPct).not.toBeNull();
    expect(result.calmar).not.toBeNull();
    // cumul 1.2 sur 396 j → annualisé ≈ 18.3% ; Calmar ≈ 18.3 / 10 ≈ 1.83
    expect(result.calmar).toBeCloseTo(1.83, 1);
  });

  it("le taux sans risque (hypothèse) réduit le Sharpe et est rapporté", () => {
    const series = [snap("2026-05-01", 100), snap("2026-05-02", 110), snap("2026-05-03", 120), snap("2026-05-04", 108)];
    const noRf = computePortfolioRatios(series, []);
    const withRf = computePortfolioRatios(series, [], { annualRiskFreePct: 5 });
    expect(withRf.riskFreePct).toBe(5);
    expect(withRf.sharpe).toBeLessThan(noRf.sharpe);
  });
});
