import { describe, it, expect } from "vitest";
import { simulateInvestment } from "./simulationCalculator";

// Simple series: price doubles from 100 to 200 over exactly one year.
const ONE_YEAR_DOUBLE = [
  { date: "2017-01-01", close: 100 },
  { date: "2017-07-01", close: 150 },
  { date: "2018-01-01", close: 200 },
];

describe("simulateInvestment", () => {
  it("calcule parts, valeur finale, rendement et CAGR sur une série factuelle", () => {
    const r = simulateInvestment(ONE_YEAR_DOUBLE, { amount: 1000, startDate: "2017-01-01" });
    expect(r.entryPrice).toBe(100);
    expect(r.shares).toBe(10); // 1000 / 100
    expect(r.finalValue).toBe(2000); // 10 * 200
    expect(r.totalReturn).toBe(1000);
    expect(r.totalReturnPct).toBeCloseTo(100, 5);
    expect(r.years).toBeCloseTo(1, 1);
    expect(r.cagrPct).toBeCloseTo(100, 0); // doublé en ~1 an
  });

  it("produit une courbe de croissance alignée sur les points (début=capital, fin=valeur finale)", () => {
    const r = simulateInvestment(ONE_YEAR_DOUBLE, { amount: 1000, startDate: "2017-01-01" });
    expect(r.curve).toHaveLength(3);
    expect(r.curve[0]).toEqual({ date: "2017-01-01", value: 1000 });
    expect(r.curve.at(-1)).toEqual({ date: "2018-01-01", value: 2000 });
    expect(r.curve[1].value).toBe(1500); // 10 * 150
  });

  it("entre au premier point disponible >= startDate (week-end / jour férié)", () => {
    const r = simulateInvestment(ONE_YEAR_DOUBLE, { amount: 1000, startDate: "2017-03-15" });
    expect(r.entryDate).toBe("2017-07-01");
    expect(r.entryPrice).toBe(150);
  });

  it("sans startDate, entre au plus ancien point", () => {
    const r = simulateInvestment(ONE_YEAR_DOUBLE, { amount: 500 });
    expect(r.entryDate).toBe("2017-01-01");
  });

  it("trie une série non ordonnée avant de calculer", () => {
    const shuffled = [ONE_YEAR_DOUBLE[2], ONE_YEAR_DOUBLE[0], ONE_YEAR_DOUBLE[1]];
    const r = simulateInvestment(shuffled, { amount: 1000, startDate: "2017-01-01" });
    expect(r.entryDate).toBe("2017-01-01");
    expect(r.finalDate).toBe("2018-01-01");
  });

  it("retourne null pour un montant invalide", () => {
    expect(simulateInvestment(ONE_YEAR_DOUBLE, { amount: 0 })).toBeNull();
    expect(simulateInvestment(ONE_YEAR_DOUBLE, { amount: -100 })).toBeNull();
    expect(simulateInvestment(ONE_YEAR_DOUBLE, { amount: NaN })).toBeNull();
  });

  it("retourne null pour une série insuffisante", () => {
    expect(simulateInvestment([], { amount: 1000 })).toBeNull();
    expect(simulateInvestment([{ date: "2017-01-01", close: 100 }], { amount: 1000 })).toBeNull();
  });

  it("retourne null si la date de départ est après toute la série", () => {
    expect(simulateInvestment(ONE_YEAR_DOUBLE, { amount: 1000, startDate: "2030-01-01" })).toBeNull();
  });

  it("ignore les points invalides (close non finie ou <= 0)", () => {
    const noisy = [
      { date: "2017-01-01", close: 100 },
      { date: "2017-06-01", close: 0 },
      { date: "2017-09-01", close: null },
      { date: "2018-01-01", close: 200 },
    ];
    const r = simulateInvestment(noisy, { amount: 1000, startDate: "2017-01-01" });
    expect(r.shares).toBe(10);
    expect(r.finalValue).toBe(2000);
    expect(r.curve).toHaveLength(2);
  });

  it("gère une perte (valeur finale < capital)", () => {
    const down = [
      { date: "2020-01-01", close: 200 },
      { date: "2021-01-01", close: 100 },
    ];
    const r = simulateInvestment(down, { amount: 1000, startDate: "2020-01-01" });
    expect(r.finalValue).toBe(500);
    expect(r.totalReturn).toBe(-500);
    expect(r.totalReturnPct).toBeCloseTo(-50, 5);
    expect(r.cagrPct).toBeCloseTo(-50, 0);
  });
});
