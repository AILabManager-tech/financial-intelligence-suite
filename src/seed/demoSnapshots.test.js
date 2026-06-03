import { describe, expect, it } from "vitest";
import { buildDemoSnapshots, DEMO_AS_OF } from "./demoSnapshots";
import { computeSubPeriodReturns } from "../utils/timeWeightedReturn";

const profile = {
  id: "demo-x",
  prixCourant: { "RY.TO": 178 },
};

const tx = [
  { type: "buy", symbol: "RY.TO", date: "2024-01-10", quantity: 100, price: 132.5 },
  { type: "buy", symbol: "RY.TO", date: "2024-06-10", quantity: 50, price: 150 },
];

describe("buildDemoSnapshots", () => {
  it("returns an empty series when there are no buys", () => {
    expect(buildDemoSnapshots({ id: "demo-empty" }, [])).toEqual([]);
    expect(
      buildDemoSnapshots({ id: "demo-div" }, [{ type: "dividend", symbol: "X", date: "2024-01-01", amount: 10 }]),
    ).toEqual([]);
  });

  it("produces a sorted, positive, reconstructed-tagged series spanning to as-of", () => {
    const series = buildDemoSnapshots(profile, tx);
    expect(series.length).toBeGreaterThan(10);
    expect(series.every((s) => s.reconstructed === true)).toBe(true);
    expect(series.every((s) => s.totalMarketValue > 0)).toBe(true);
    // ascending by date
    const days = series.map((s) => s.snapshotDate);
    expect([...days].sort()).toEqual(days);
    // first point near the first buy, last point exactly as-of
    expect(series[0].snapshotDate).toBe("2024-01-10");
    expect(series[series.length - 1].snapshotDate).toBe(DEMO_AS_OF);
  });

  it("anchors the final value on held quantity × current reference price", () => {
    const series = buildDemoSnapshots(profile, tx);
    const last = series[series.length - 1];
    // 150 shares held × 178 reference price (endpoint carries no noise)
    expect(last.totalMarketValue).toBeCloseTo(150 * 178, 2);
  });

  it("is deterministic across runs", () => {
    expect(buildDemoSnapshots(profile, tx)).toEqual(buildDemoSnapshots(profile, tx));
  });

  it("drops a symbol once it is fully sold (held quantity hits 0)", () => {
    const sold = [
      { type: "buy", symbol: "AC.TO", date: "2024-01-10", quantity: 100, price: 18 },
      { type: "sell", symbol: "AC.TO", date: "2024-03-10", quantity: 100, price: 20 },
      { type: "buy", symbol: "RY.TO", date: "2024-04-10", quantity: 10, price: 150 },
    ];
    const series = buildDemoSnapshots({ id: "demo-sold", prixCourant: { "RY.TO": 178 } }, sold);
    // final value reflects only the still-held RY.TO position
    expect(series[series.length - 1].totalMarketValue).toBeCloseTo(10 * 178, 2);
  });

  it("yields a series the real TWR primitive can consume", () => {
    const series = buildDemoSnapshots(profile, tx);
    const subPeriods = computeSubPeriodReturns(series, tx);
    expect(subPeriods.length).toBeGreaterThan(0);
    expect(subPeriods.every((p) => Number.isFinite(p.growth))).toBe(true);
  });
});
