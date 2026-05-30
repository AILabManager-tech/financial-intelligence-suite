import { describe, it, expect } from "vitest";
import {
  computeReturns,
  computePeriodReturns,
  computeMonthlyReturns,
  PERIOD_DEFS,
} from "./returnsCalculator";

// Helper: build an ascending daily-ish series from {date, close} tuples.
function series(...pairs) {
  return pairs.map(([date, close]) => ({ date, close }));
}

describe("computeReturns", () => {
  it("retourne null si la série est trop courte ou invalide", () => {
    expect(computeReturns(null)).toBeNull();
    expect(computeReturns([])).toBeNull();
    expect(computeReturns([{ date: "2024-01-01", close: 100 }])).toBeNull();
    // points sans close valide ⇒ filtrés ⇒ insuffisant
    expect(computeReturns(series(["2024-01-01", 0], ["2024-02-01", -5]))).toBeNull();
  });

  it("calcule rendement cumulé et CAGR depuis la série factuelle", () => {
    // +100 % sur ~2 ans ⇒ CAGR ≈ 41.42 %.
    const result = computeReturns(series(["2022-01-03", 100], ["2024-01-03", 200]));
    expect(result.firstDate).toBe("2022-01-03");
    expect(result.lastDate).toBe("2024-01-03");
    expect(result.lastClose).toBe(200);
    expect(result.cumulativeReturnPct).toBeCloseTo(100, 5);
    expect(result.cagrPct).toBeCloseTo(41.42, 1);
    expect(result.years).toBeCloseTo(2, 1);
  });

  it("trie une série non triée et ignore les points invalides", () => {
    const result = computeReturns([
      { date: "2024-01-03", close: 200 },
      { date: "2022-01-03", close: 100 },
      { date: "2023-01-03", close: null }, // ignoré
    ]);
    expect(result.firstDate).toBe("2022-01-03");
    expect(result.lastDate).toBe("2024-01-03");
    expect(result.cumulativeReturnPct).toBeCloseTo(100, 5);
  });
});

describe("computePeriodReturns", () => {
  // Série mensuelle sur ~14 mois : close = 100 + index.
  const points = series(
    ["2023-01-31", 100],
    ["2023-02-28", 101],
    ["2023-03-31", 102],
    ["2023-04-30", 103],
    ["2023-05-31", 104],
    ["2023-06-30", 105],
    ["2023-07-31", 106],
    ["2023-08-31", 107],
    ["2023-09-30", 108],
    ["2023-10-31", 109],
    ["2023-11-30", 110],
    ["2023-12-31", 111],
    ["2024-01-31", 112],
    ["2024-02-29", 113],
  );

  it("expose une entrée par période définie, dans l'ordre", () => {
    const rows = computePeriodReturns(points, { asOf: "2024-02-29" });
    expect(rows.map((r) => r.key)).toEqual(PERIOD_DEFS.map((d) => d.key));
  });

  it("masque (pct=null) les périodes hors de la portée des données", () => {
    const rows = computePeriodReturns(points, { asOf: "2024-02-29" });
    const byKey = Object.fromEntries(rows.map((r) => [r.key, r.pct]));
    // 3 ans en arrière n'existe pas dans une série de 14 mois ⇒ masqué.
    expect(byKey["3Y"]).toBeNull();
    // inception toujours disponible.
    expect(byKey.inception).toBeCloseTo((113 / 100 - 1) * 100, 5);
  });

  it("calcule le rendement 1 an vs la clôture ~12 mois avant", () => {
    const rows = computePeriodReturns(points, { asOf: "2024-02-29" });
    const oneYear = rows.find((r) => r.key === "1Y");
    // référence = dernière clôture <= 2023-02-29 ⇒ 2023-02-28 = 101.
    expect(oneYear.pct).toBeCloseTo((113 / 101 - 1) * 100, 5);
  });

  it("YTD part de la dernière clôture de l'an précédent", () => {
    const rows = computePeriodReturns(points, { asOf: "2024-02-29" });
    const ytd = rows.find((r) => r.key === "YTD");
    // base YTD = dernière clôture < 2024-01-01 ⇒ 2023-12-31 = 111.
    expect(ytd.pct).toBeCloseTo((113 / 111 - 1) * 100, 5);
  });
});

describe("computeMonthlyReturns", () => {
  it("agrège par mois et calcule la variation mois sur mois", () => {
    const points = series(
      ["2024-01-10", 100],
      ["2024-01-31", 110], // dernière clôture de janvier
      ["2024-02-15", 121], // dernière clôture de février
    );
    const monthly = computeMonthlyReturns(points);
    expect(monthly.map((m) => m.month)).toEqual(["2024-01", "2024-02"]);
    // premier mois : pas de mois précédent ⇒ null.
    expect(monthly[0].returnPct).toBeNull();
    expect(monthly[1].returnPct).toBeCloseTo((121 / 110 - 1) * 100, 5);
  });

  it("retourne un tableau vide si insuffisant", () => {
    expect(computeMonthlyReturns([])).toEqual([]);
    expect(computeMonthlyReturns(null)).toEqual([]);
  });
});
