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

  it("ignore le flux du jour de DÉPART (déjà contenu dans la valeur de départ)", () => {
    // Le snapshot de départ est pris après l'achat du jour : son montant EST le
    // flux initial (−V_début). Le compter deux fois fausserait l'IRR.
    const onlyStartDayFlow = computeMoneyWeightedReturn(
      [snap("2025-05-01", 1000), snap("2026-05-01", 1100)],
      [{ type: "buy", date: "2025-05-01", quantity: 1, price: 50 }],
    );
    expect(onlyStartDayFlow.flowsCount).toBe(0);
    expect(onlyStartDayFlow.annualizedIrrPct).toBeCloseTo(10, 4);
  });

  it("COMPTE le flux du jour de fin : la valeur finale contient déjà les titres achetés", () => {
    // La série reconstruite applique les deltas de quantité du jour J dans la
    // valeur du jour J. Un achat daté du dernier jour est donc valorisé dans
    // V_fin ; ignorer son décaissement transformerait un actif acheté en gain.
    // Ici : 1000 → 1100 sur un an (IRR 10 %) puis achat de 50 $ le dernier jour,
    // dont les titres sont dans V_fin = 1150. L'IRR doit rester 10 %.
    const endDayFlow = computeMoneyWeightedReturn(
      [snap("2025-05-01", 1000), snap("2026-05-01", 1150)],
      [{ type: "buy", date: "2026-05-01", quantity: 1, price: 50 }],
    );
    expect(endDayFlow.flowsCount).toBe(1);
    expect(endDayFlow.annualizedIrrPct).toBeCloseTo(10, 4);
  });

  it("un achat massif le dernier jour ne fabrique pas de rendement", () => {
    // Régression du défaut critique : sans le flux, l'IRR explosait (11 010 %).
    const massiveEndBuy = computeMoneyWeightedReturn(
      [snap("2025-05-01", 1000), snap("2026-05-01", 111_100)],
      [{ type: "buy", date: "2026-05-01", quantity: 1000, price: 110 }],
    );
    expect(massiveEndBuy.flowsCount).toBe(1);
    expect(massiveEndBuy.annualizedIrrPct).toBeLessThan(20);
    expect(massiveEndBuy.annualizedIrrPct).toBeCloseTo(10, 4);
  });
});
