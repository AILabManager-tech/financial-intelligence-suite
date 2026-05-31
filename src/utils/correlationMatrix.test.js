import { describe, it, expect } from "vitest";
import { computeCorrelationMatrix } from "./correlationMatrix";

// Build a monthly-returns series (the shape computeMonthlyReturns emits) from a
// list of percent values, one per consecutive month of 2024.
function series(values) {
  return values.map((returnPct, i) => ({
    month: `2024-${String(i + 1).padStart(2, "0")}`,
    returnPct,
  }));
}

// Build a series from explicit [month, returnPct] pairs.
function at(pairs) {
  return pairs.map(([month, returnPct]) => ({ month, returnPct }));
}

describe("computeCorrelationMatrix", () => {
  it("returns hasData:false with fewer than two usable symbols", () => {
    expect(computeCorrelationMatrix({}).hasData).toBe(false);
    expect(computeCorrelationMatrix(null).hasData).toBe(false);
    expect(computeCorrelationMatrix({ AAPL: series([1, 2, 3, 4, 5, 6]) }).hasData).toBe(false);
  });

  it("scores a perfectly correlated pair at 1 with a unit diagonal", () => {
    const r = computeCorrelationMatrix({
      AAPL: series([1, 2, 3, 4, 5, 6]),
      MSFT: series([2, 4, 6, 8, 10, 12]), // perfectly linear → r = 1
    });
    expect(r.hasData).toBe(true);
    expect(r.symbols).toEqual(["AAPL", "MSFT"]);
    expect(r.matrix[0][0]).toBe(1);
    expect(r.matrix[1][1]).toBe(1);
    expect(r.matrix[0][1]).toBeCloseTo(1, 5);
    expect(r.matrix[1][0]).toBeCloseTo(1, 5);
    expect(r.averageCorrelation).toBeCloseTo(1, 5);
    expect(r.pairsComputed).toBe(1);
  });

  it("scores a perfectly inverse pair at -1", () => {
    const r = computeCorrelationMatrix({
      A: series([1, 2, 3, 4, 5, 6]),
      B: series([6, 5, 4, 3, 2, 1]),
    });
    expect(r.matrix[0][1]).toBeCloseTo(-1, 5);
    expect(r.leastCorrelated.value).toBeCloseTo(-1, 5);
  });

  it("uses only overlapping months for a pair", () => {
    // A and B share only Mar+Apr, where they are identical → r = 1 on overlap.
    const a = at([["2024-01", 10], ["2024-02", -5], ["2024-03", 8], ["2024-04", 2]]);
    const b = at([["2024-03", 8], ["2024-04", 2], ["2024-05", 1], ["2024-06", 3]]);
    const r = computeCorrelationMatrix({ A: a, B: b }, { minOverlap: 2 });
    expect(r.hasData).toBe(true);
    expect(r.matrix[0][1]).toBeCloseTo(1, 5);
  });

  it("yields a null cell when overlap is below the minimum (no fabricated zero)", () => {
    const a = series([1, 2, 3, 4, 5, 6]); // 2024-01..06
    const b = at([
      ["2024-05", 5], ["2024-06", 6], ["2024-07", 7],
      ["2024-08", 8], ["2024-09", 9], ["2024-10", 10],
    ]); // overlaps A only on May+Jun = 2 months < default minOverlap 6
    const r = computeCorrelationMatrix({ A: a, B: b });
    expect(r.symbols).toEqual(["A", "B"]);
    expect(r.matrix[0][1]).toBeNull();
    expect(r.averageCorrelation).toBeNull();
    expect(r.pairsComputed).toBe(0);
  });

  it("returns a null correlation for a constant (zero-variance) series", () => {
    const r = computeCorrelationMatrix({
      A: series([1, 2, 3, 4, 5, 6]),
      FLAT: series([0, 0, 0, 0, 0, 0]),
    });
    expect(r.matrix[0][1]).toBeNull();
    expect(r.pairsComputed).toBe(0);
  });

  it("ignores non-finite returns and drops symbols with too few usable months", () => {
    const r = computeCorrelationMatrix({
      A: series([1, 2, 3, 4, 5, 6]),
      B: series([2, 4, 6, 8, 10, 12]),
      THIN: at([["2024-01", 1], ["2024-02", null], ["2024-03", Number.NaN]]),
    });
    expect(r.symbols).toEqual(["A", "B"]); // THIN dropped (only 1 finite return)
  });

  it("finds the most and least correlated pairs across three symbols", () => {
    const r = computeCorrelationMatrix({
      UP: series([1, 2, 3, 4, 5, 6]),
      UP2: series([2, 4, 6, 8, 10, 12]), // r = 1 with UP
      DOWN: series([6, 5, 4, 3, 2, 1]), // r = -1 with UP
    });
    expect(r.pairsComputed).toBe(3);
    expect(r.mostCorrelated.value).toBeCloseTo(1, 5);
    expect(r.leastCorrelated.value).toBeCloseTo(-1, 5);
    expect(r.symbols).toEqual(["UP", "UP2", "DOWN"]);
  });
});
