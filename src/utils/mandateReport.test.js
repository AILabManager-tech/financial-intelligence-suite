import { describe, expect, it } from "vitest";
import { buildMandateReport } from "./mandateReport";

const MANDATE = { name: "Client A", client: "A inc.", accountType: "rrsp", baseCurrency: "CAD" };
const ASSETS = [
  { symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } },
  { symbol: "MSFT", name: "Microsoft", price: 50, position: { quantity: 4, averageCost: 60 } },
  { symbol: "GHOST", name: "Not held", price: 10, position: { quantity: 0, averageCost: 0 } },
];

describe("buildMandateReport", () => {
  it("summarizes held positions only, with mandate metadata", () => {
    const r = buildMandateReport({ mandate: MANDATE, assets: ASSETS, asOf: "2026-06-01" });
    expect(r.summary.mandateName).toBe("Client A");
    expect(r.summary.accountTypeLabel).toBe("REER / FERR");
    expect(r.summary.positionsCount).toBe(2); // GHOST (qty 0) excluded
    expect(r.summary.totalMarketValue).toBe(2200); // 2000 + 200
    expect(r.summary.totalCost).toBe(1240); // 1000 + 240
    expect(r.summary.unrealizedPnl).toBe(960);
  });

  it("sorts positions by market value desc", () => {
    const r = buildMandateReport({ mandate: MANDATE, assets: ASSETS });
    expect(r.positions.map((p) => p.symbol)).toEqual(["AAPL", "MSFT"]);
  });

  it("includes TWR and realized-gains sections, gracefully empty without data", () => {
    const r = buildMandateReport({ mandate: MANDATE, assets: ASSETS });
    expect(r.twr.hasData).toBe(false); // no snapshots
    expect(r.realized.hasData).toBe(false); // no transactions
  });

  it("computes realized gains when a disposition exists", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2023-01-02", quantity: 10, price: 100 },
      { type: "sell", symbol: "AAPL", date: "2024-03-10", quantity: 10, price: 250 },
    ];
    const r = buildMandateReport({ mandate: MANDATE, assets: ASSETS, transactions });
    expect(r.realized.hasData).toBe(true);
    expect(r.realized.years[0].grossGain).toBe(1500);
  });
});
