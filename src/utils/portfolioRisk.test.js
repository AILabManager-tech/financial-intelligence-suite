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
    // Annualisation = √(périodes réelles par an). Espacement 1 jour CALENDAIRE
    // ⇒ 365 périodes/an. (Utiliser √252 ici mélangerait jours de bourse au
    // numérateur et jours calendaires au dénominateur — cf. le test ci-dessous.)
    expect(result.annualizedVolPct).toBeCloseTo(11.547 * Math.sqrt(365), 0);
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

  it("annualise d'après l'espacement RÉEL d'une série de jours de bourse", () => {
    // Le cas que les autres tests ne couvrent pas : une vraie série saute les
    // week-ends, donc l'espacement moyen vaut ~1,4 jour calendaire et non 1.
    // L'annualisation doit refléter le nombre de sous-périodes réellement
    // observées par an — ni √252 en dur, ni √365 en dur.
    const snapshots = [];
    const day = new Date(Date.UTC(2024, 0, 1)); // lundi
    let value = 1000;
    while (snapshots.length < 261) {
      const dow = day.getUTCDay();
      if (dow >= 1 && dow <= 5) {
        snapshots.push(snap(day.toISOString().slice(0, 10), value));
        value *= snapshots.length % 2 === 0 ? 1.01 : 0.99; // alternance ±1 %
      }
      day.setUTCDate(day.getUTCDate() + 1);
    }

    const result = computePortfolioRisk(snapshots);
    const n = result.observations;
    // Oracle : périodes/an = n / (durée de la série en années).
    const periodsPerYear = n / (result.days / 365);
    expect(periodsPerYear).toBeGreaterThan(250); // ~261, pas ~180
    expect(result.annualizedVolPct).toBeCloseTo(
      result.perPeriodVolPct * Math.sqrt(periodsPerYear),
      6,
    );
  });
});
