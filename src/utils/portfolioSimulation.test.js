import { describe, it, expect } from "vitest";
import { aggregateCurves, simulateDemoPortfolio, excessReturnPct } from "./portfolioSimulation";

describe("aggregateCurves", () => {
  it("somme deux courbes alignées sur les mêmes dates", () => {
    const a = [{ date: "2020-01-01", value: 100 }, { date: "2020-02-01", value: 110 }];
    const b = [{ date: "2020-01-01", value: 200 }, { date: "2020-02-01", value: 190 }];
    expect(aggregateCurves([a, b])).toEqual([
      { date: "2020-01-01", value: 300 },
      { date: "2020-02-01", value: 300 },
    ]);
  });

  it("aligne des séries de dates différentes par report de la dernière valeur connue", () => {
    const a = [{ date: "2020-01-01", value: 100 }, { date: "2020-03-01", value: 120 }];
    const b = [{ date: "2020-02-01", value: 50 }];
    const out = aggregateCurves([a, b]);
    // dates: 01-01 (a=100, b=0), 02-01 (a=100 report, b=50), 03-01 (a=120, b=50 report)
    expect(out).toEqual([
      { date: "2020-01-01", value: 100 },
      { date: "2020-02-01", value: 150 },
      { date: "2020-03-01", value: 170 },
    ]);
  });

  it("retourne [] pour aucune courbe valide", () => {
    expect(aggregateCurves([])).toEqual([]);
    expect(aggregateCurves([[], null, undefined])).toEqual([]);
  });
});

describe("simulateDemoPortfolio", () => {
  const AAPL = {
    symbol: "AAPL",
    amount: 1000,
    points: [
      { date: "2020-01-01", close: 100 },
      { date: "2021-01-01", close: 200 },
    ],
  };
  const MSFT = {
    symbol: "MSFT",
    amount: 1000,
    points: [
      { date: "2020-01-01", close: 50 },
      { date: "2021-01-01", close: 75 },
    ],
  };

  it("agrège plusieurs positions (valeur finale = somme des positions)", () => {
    const r = simulateDemoPortfolio([AAPL, MSFT], { startDate: "2020-01-01" });
    expect(r.totalInvested).toBe(2000);
    // AAPL 1000 -> 2000 ; MSFT 1000 -> 1500 ; total 3500
    expect(r.finalValue).toBe(3500);
    expect(r.totalReturn).toBe(1500);
    expect(r.totalReturnPct).toBeCloseTo(75, 5);
    expect(r.positions).toHaveLength(2);
    expect(r.positions.find((p) => p.symbol === "AAPL").finalValue).toBe(2000);
  });

  it("écarte une position à l'historique insuffisant", () => {
    const broken = { symbol: "XXX", amount: 500, points: [] };
    const r = simulateDemoPortfolio([AAPL, broken], { startDate: "2020-01-01" });
    expect(r.positions).toHaveLength(1);
    expect(r.totalInvested).toBe(1000);
  });

  it("retourne null si aucune position simulable", () => {
    expect(simulateDemoPortfolio([{ symbol: "X", amount: 100, points: [] }], {})).toBeNull();
    expect(simulateDemoPortfolio([], {})).toBeNull();
  });

  it("produit une courbe agrégée", () => {
    const r = simulateDemoPortfolio([AAPL, MSFT], { startDate: "2020-01-01" });
    expect(r.curve[0]).toEqual({ date: "2020-01-01", value: 2000 });
    expect(r.curve.at(-1)).toEqual({ date: "2021-01-01", value: 3500 });
  });
});

describe("excessReturnPct", () => {
  it("calcule l'écart en points de pourcentage", () => {
    expect(excessReturnPct(75, 40)).toBe(35);
    expect(excessReturnPct(10, 25)).toBe(-15);
  });
  it("retourne null si une valeur manque", () => {
    expect(excessReturnPct(NaN, 10)).toBeNull();
    expect(excessReturnPct(10, null)).toBeNull();
  });
});
