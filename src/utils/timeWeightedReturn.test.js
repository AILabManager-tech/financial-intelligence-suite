import { describe, expect, it } from "vitest";
import { computeFlowsByDay, computeTimeWeightedReturn } from "./timeWeightedReturn";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("computeFlowsByDay", () => {
  it("buy = capital entrant (coût + frais), sell = produit sortant (net de frais)", () => {
    const flows = computeFlowsByDay([
      { type: "buy", date: "2026-05-02", quantity: 10, price: 100, fee: 5 },
      { type: "sell", date: "2026-05-03", quantity: 4, price: 120, fee: 2 },
    ]);
    expect(flows.get("2026-05-02")).toBe(1005); // 10*100 + 5
    expect(flows.get("2026-05-03")).toBe(-478); // -(4*120 - 2)
  });

  it("ignore dividend/fee (ne touchent pas la valeur des positions) et les lignes invalides", () => {
    const flows = computeFlowsByDay([
      { type: "dividend", date: "2026-05-02", amount: 50 },
      { type: "fee", date: "2026-05-02", amount: 9 },
      { type: "buy", date: "2026-05-02", quantity: "x", price: 100 },
    ]);
    expect(flows.size).toBe(0);
  });

  it("agrège plusieurs flux le même jour", () => {
    const flows = computeFlowsByDay([
      { type: "buy", date: "2026-05-02", quantity: 1, price: 100 },
      { type: "buy", date: "2026-05-02", quantity: 2, price: 50 },
    ]);
    expect(flows.get("2026-05-02")).toBe(200);
  });
});

describe("computeTimeWeightedReturn", () => {
  it("hasData:false si moins de 2 snapshots utilisables", () => {
    expect(computeTimeWeightedReturn([snap("2026-05-01", 1000)])).toEqual({ hasData: false });
    expect(computeTimeWeightedReturn([])).toEqual({ hasData: false });
  });

  it("série sans flux : TWR = variation de valeur composée", () => {
    const result = computeTimeWeightedReturn([
      snap("2026-05-01", 1000),
      snap("2026-05-02", 1100), // +10%
      snap("2026-05-03", 1045), // -5%
    ]);
    expect(result.hasData).toBe(true);
    // (1.10 * 0.95) - 1 = 0.045
    expect(result.twrPct).toBeCloseTo(4.5, 6);
    expect(result.periods).toBe(2);
    expect(result.from).toBe("2026-05-01");
    expect(result.to).toBe("2026-05-03");
  });

  it("neutralise un apport : un buy qui gonfle la valeur n'est pas de la performance", () => {
    // Jour 1: 1000. Jour 2: valeur 2000 mais 1000 vient d'un achat → marché plat.
    const result = computeTimeWeightedReturn(
      [snap("2026-05-01", 1000), snap("2026-05-02", 2000)],
      [{ type: "buy", date: "2026-05-02", quantity: 10, price: 100 }], // flux +1000
    );
    // hpr = (2000 - 1000) / 1000 = 1.0 → +0% de performance réelle
    expect(result.twrPct).toBeCloseTo(0, 6);
  });

  it("neutralise un retrait : un sell qui réduit la valeur n'est pas une perte", () => {
    const result = computeTimeWeightedReturn(
      [snap("2026-05-01", 1000), snap("2026-05-02", 500)],
      [{ type: "sell", date: "2026-05-02", quantity: 5, price: 100 }], // flux -500
    );
    // hpr = (500 - (-500)) / 1000 = 1.0 → +0%
    expect(result.twrPct).toBeCloseTo(0, 6);
  });

  it("saute les sous-périodes à base nulle (portefeuille parti de zéro)", () => {
    const result = computeTimeWeightedReturn([
      snap("2026-05-01", 0),
      snap("2026-05-02", 1000),
      snap("2026-05-03", 1100),
    ]);
    // seule la sous-période 05-02 → 05-03 est définissable
    expect(result.periods).toBe(1);
    expect(result.twrPct).toBeCloseTo(10, 6);
    expect(result.from).toBe("2026-05-02");
  });

  it("annualise seulement si la série couvre au moins un an", () => {
    const short = computeTimeWeightedReturn([snap("2026-05-01", 1000), snap("2026-05-10", 1100)]);
    expect(short.annualizedPct).toBeNull();

    const long = computeTimeWeightedReturn([snap("2025-05-01", 1000), snap("2026-05-01", 1200)]);
    expect(long.days).toBe(365);
    expect(long.annualizedPct).toBeCloseTo(20, 4); // 1.2^(365/365) - 1
  });
});
