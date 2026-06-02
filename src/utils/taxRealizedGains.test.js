import { describe, expect, it } from "vitest";
import { computeRealizedGainsByYear, buildRealizedGainsCsv } from "./taxRealizedGains";

const T = (over) => ({ type: "buy", symbol: "AAPL", date: "2023-01-02", quantity: 10, price: 100, fee: 0, ...over });

describe("computeRealizedGainsByYear", () => {
  it("buckets realized dispositions by exit year (FIFO)", () => {
    const txs = [
      T({ type: "buy", date: "2023-01-02", quantity: 10, price: 100 }),
      T({ type: "buy", date: "2023-06-02", quantity: 10, price: 200 }),
      T({ type: "sell", date: "2024-03-10", quantity: 10, price: 250 }),
    ];
    const r = computeRealizedGainsByYear(txs, { method: "fifo" });
    expect(r.hasData).toBe(true);
    expect(r.years).toHaveLength(1);
    const y = r.years[0];
    expect(y.year).toBe(2024);
    expect(y.dispositions).toHaveLength(1);
    expect(y.dispositions[0]).toMatchObject({ symbol: "AAPL", proceeds: 2500, costBasis: 1000, gain: 1500 });
    expect(y.grossGain).toBe(1500);
    expect(y.netGain).toBe(1500);
  });

  it("matches the most recent lot under LIFO", () => {
    const txs = [
      T({ type: "buy", date: "2023-01-02", quantity: 10, price: 100 }),
      T({ type: "buy", date: "2023-06-02", quantity: 10, price: 200 }),
      T({ type: "sell", date: "2024-03-10", quantity: 10, price: 250 }),
    ];
    const r = computeRealizedGainsByYear(txs, { method: "lifo" });
    expect(r.years[0].grossGain).toBe(500);
  });

  it("nets sell fees out of the year total (gross stays per-lot)", () => {
    const txs = [
      T({ type: "buy", date: "2023-01-02", quantity: 10, price: 100 }),
      T({ type: "sell", date: "2024-03-10", quantity: 10, price: 250, fee: 20 }),
    ];
    const r = computeRealizedGainsByYear(txs, { method: "fifo" });
    const y = r.years[0];
    expect(y.grossGain).toBe(1500);
    expect(y.sellFees).toBe(20);
    expect(y.netGain).toBe(1480);
  });

  it("separates years and sorts most-recent first, counting gains vs losses", () => {
    const txs = [
      T({ type: "buy", date: "2022-01-02", quantity: 10, price: 100 }),
      T({ type: "sell", date: "2023-05-01", quantity: 5, price: 150 }), // +250 gain
      T({ type: "sell", date: "2024-05-01", quantity: 5, price: 80 }), //  -100 loss
    ];
    const r = computeRealizedGainsByYear(txs, { method: "fifo" });
    expect(r.years.map((y) => y.year)).toEqual([2024, 2023]);
    expect(r.years[0].lossCount).toBe(1);
    expect(r.years[1].gainCount).toBe(1);
  });

  it("returns hasData:false with no dispositions", () => {
    expect(computeRealizedGainsByYear([T({ type: "buy" })], { method: "fifo" }).hasData).toBe(false);
    expect(computeRealizedGainsByYear([], {}).hasData).toBe(false);
  });

  it("builds a flat per-disposition CSV (T5008/1099-B style)", () => {
    const report = computeRealizedGainsByYear(
      [
        T({ type: "buy", date: "2023-01-02", quantity: 10, price: 100 }),
        T({ type: "sell", date: "2024-03-10", quantity: 10, price: 250 }),
      ],
      { method: "fifo" },
    );
    const csv = buildRealizedGainsCsv(report);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("year,symbol,acquired,disposed,quantity,proceeds,costBasis,gain,holdingDays");
    expect(lines[1]).toContain('"AAPL"');
    expect(lines[1]).toContain('"2500.00"');
    expect(lines[1]).toContain('"1500.00"');
  });
});
