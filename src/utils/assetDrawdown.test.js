import { describe, expect, it } from "vitest";
import { computeDrawdown } from "./assetDrawdown";

const pt = (date, close) => ({ date, close });

describe("computeDrawdown", () => {
  it("returns null for an insufficient or invalid series", () => {
    expect(computeDrawdown([])).toBeNull();
    expect(computeDrawdown([pt("2020-01-01", 100)])).toBeNull();
    expect(computeDrawdown(null)).toBeNull();
    expect(computeDrawdown([pt("2020-01-01", 0), pt("x", -5)])).toBeNull();
  });

  it("reports zero drawdown for a monotonically rising series", () => {
    const r = computeDrawdown([pt("2020-01-01", 100), pt("2020-02-01", 110), pt("2020-03-01", 130)]);
    expect(r.maxDrawdownPct).toBe(0);
    expect(r.currentDrawdownPct).toBe(0);
    expect(r.atHigh).toBe(true);
  });

  it("computes the worst peak-to-trough drawdown with its dates", () => {
    // 100 → 120(peak) → 90(trough) → 110
    const r = computeDrawdown([
      pt("2020-01-01", 100),
      pt("2020-02-01", 120),
      pt("2020-03-01", 90),
      pt("2020-04-01", 110),
    ]);
    expect(r.maxDrawdownPct).toBeCloseTo(-25, 5); // (90-120)/120
    expect(r.peakDate).toBe("2020-02-01");
    expect(r.troughDate).toBe("2020-03-01");
    // ends below the running peak (120): current drawdown = (110-120)/120
    expect(r.currentDrawdownPct).toBeCloseTo(-8.3333, 3);
    expect(r.atHigh).toBe(false);
    expect(r.recovered).toBe(false);
  });

  it("flags a fully recovered drawdown and a fresh high as current 0", () => {
    // 100(peak) → 80(trough) → 100 → 120(new high)
    const r = computeDrawdown([
      pt("2020-01-01", 100),
      pt("2020-02-01", 80),
      pt("2020-03-01", 100),
      pt("2020-04-01", 120),
    ]);
    expect(r.maxDrawdownPct).toBeCloseTo(-20, 5);
    expect(r.recovered).toBe(true);
    expect(r.currentDrawdownPct).toBe(0);
    expect(r.atHigh).toBe(true);
  });

  it("measures the peak-to-trough duration in calendar days", () => {
    const r = computeDrawdown([
      pt("2020-01-01", 100),
      pt("2020-01-31", 70), // 30 days later, trough
      pt("2020-02-10", 90),
    ]);
    expect(r.maxDrawdownPct).toBeCloseTo(-30, 5);
    expect(r.drawdownDays).toBe(30);
  });
});
