import { describe, expect, it } from "vitest";
import { computePortfolioRisk } from "./portfolioRisk";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("computePortfolioRisk", () => {
  it("hasData:false sous 2 rendements de sous-période", () => {
    expect(computePortfolioRisk([snap("2026-05-01", 1000)])).toEqual({ hasData: false });
    expect(computePortfolioRisk([snap("2026-05-01", 1000), snap("2026-05-02", 1100)]).hasData).toBe(false);
  });

  it("calcule volatilité (échantillon n-1) et drawdown sur une série connue", () => {
    // valeurs 100,110,99,108.9 sur 4 jours consécutifs → rendements +10%, -10%, +10%
    const result = computePortfolioRisk([
      snap("2026-05-01", 100),
      snap("2026-05-02", 110),
      snap("2026-05-03", 99),
      snap("2026-05-04", 108.9),
    ]);
    expect(result.hasData).toBe(true);
    expect(result.observations).toBe(3);
    // σ d'échantillon des rendements {0.1, -0.1, 0.1}
    expect(result.perPeriodVolPct).toBeCloseTo(11.547, 2);
    // annualisée ×√252 (espacement = 1 jour)
    expect(result.annualizedVolPct).toBeCloseTo(11.547 * Math.sqrt(252), 0);
    // courbe d'indice 1 → 1.1 → 0.99 → 1.089 : repli max -10% (pic→creux)
    expect(result.maxDrawdownPct).toBeCloseTo(-10, 6);
    expect(result.maxDrawdownFrom).toBe("2026-05-02");
    expect(result.maxDrawdownTo).toBe("2026-05-03");
    // pas revenu au sommet 1.1 (dernier 1.089) → repli courant -1%, sous l'eau
    expect(result.currentDrawdownPct).toBeCloseTo(-1, 6);
    expect(result.atHigh).toBe(false);
    expect(result.recovered).toBe(false);
    expect(result.recoveryDays).toBeNull();
  });

  it("mesure la durée de récupération quand l'indice rejoint le pic", () => {
    // 100,110,99,110 : creux le 03, retour au pic le 04 → récupéré en 1 jour
    const result = computePortfolioRisk([
      snap("2026-05-01", 100),
      snap("2026-05-02", 110),
      snap("2026-05-03", 99),
      snap("2026-05-04", 110),
    ]);
    expect(result.recovered).toBe(true);
    expect(result.recoveryDays).toBe(1);
    expect(result.atHigh).toBe(true);
    expect(result.currentDrawdownPct).toBeCloseTo(0, 6);
  });

  it("neutralise les flux : un achat n'est ni un rendement ni un creux", () => {
    // jour 2 : valeur 2000 dont 1000 vient d'un achat → rendement de marché 0%
    const result = computePortfolioRisk(
      [snap("2026-05-01", 1000), snap("2026-05-02", 2000), snap("2026-05-03", 2100)],
      [{ type: "buy", date: "2026-05-02", quantity: 10, price: 100 }],
    );
    // rendements neutralisés : {0%, +5%} → pas de faux +100%
    expect(result.observations).toBe(2);
    expect(result.maxDrawdownPct).toBeCloseTo(0, 6); // monotone, aucun repli
    expect(result.perPeriodVolPct).toBeCloseTo(3.5355, 3); // σ de {0, 0.05} (n-1)
  });
});
