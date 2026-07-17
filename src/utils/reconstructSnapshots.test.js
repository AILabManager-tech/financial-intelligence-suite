import { describe, it, expect } from "vitest";
import { reconstructSnapshots } from "./reconstructSnapshots";
import { computeTimeWeightedReturn } from "./timeWeightedReturn";

// A tiny factual daily-close series (trading days only).
const AAPL = [
  { date: "2026-01-05", close: 100 },
  { date: "2026-01-06", close: 110 },
  { date: "2026-01-07", close: 121 },
];
const MSFT = [
  { date: "2026-01-05", close: 200 },
  { date: "2026-01-06", close: 210 },
  { date: "2026-01-07", close: 220 },
];

describe("reconstructSnapshots", () => {
  it("values held quantity × real close on each trading day", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-07",
    });
    expect(series).toEqual([
      { snapshotDate: "2026-01-05", totalMarketValue: 1000, reconstructed: true },
      { snapshotDate: "2026-01-06", totalMarketValue: 1100, reconstructed: true },
      { snapshotDate: "2026-01-07", totalMarketValue: 1210, reconstructed: true },
    ]);
  });

  it("reflects a mid-series buy as a rising held quantity", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
      { type: "buy", symbol: "AAPL", date: "2026-01-06", quantity: 10, price: 110 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-07",
    });
    // day 05: 10×100=1000 ; day 06: 20×110=2200 ; day 07: 20×121=2420
    expect(series.map((s) => s.totalMarketValue)).toEqual([1000, 2200, 2420]);
  });

  it("reflects a sell as a falling held quantity", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
      { type: "sell", symbol: "AAPL", date: "2026-01-06", quantity: 5, price: 110 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-07",
    });
    expect(series.map((s) => s.totalMarketValue)).toEqual([1000, 550, 605]);
  });

  it("sums the value across multiple held symbols", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 1, price: 100 },
      { type: "buy", symbol: "MSFT", date: "2026-01-05", quantity: 1, price: 200 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL, MSFT },
      asOf: "2026-01-06",
    });
    // day 05: 100+200=300 ; day 06: 110+210=320
    expect(series.map((s) => s.totalMarketValue)).toEqual([300, 320]);
  });

  it("omits a day when a held symbol has no close at or before it (never interpolates)", () => {
    // AAPL bought 2026-01-05 but its history only starts 2026-01-06.
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL: [
        { date: "2026-01-06", close: 110 },
        { date: "2026-01-07", close: 121 },
      ] },
      asOf: "2026-01-07",
    });
    // 2026-01-05 omitted (no close ≤ that day), only 06 and 07 valued.
    expect(series.map((s) => s.snapshotDate)).toEqual(["2026-01-06", "2026-01-07"]);
    expect(series.map((s) => s.totalMarketValue)).toEqual([1100, 1210]);
  });

  it("ends the series on the as-of date valued at its last known close", () => {
    // asOf is a non-trading day (weekend): value uses the last close on or before.
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-10",
    });
    const last = series[series.length - 1];
    expect(last.snapshotDate).toBe("2026-01-10");
    expect(last.totalMarketValue).toBe(1210); // last close 121 × 10
  });

  it("accepts history as a { points } envelope, like fetchPriceHistory returns", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL: { points: AAPL } },
      asOf: "2026-01-05",
    });
    expect(series).toEqual([
      { snapshotDate: "2026-01-05", totalMarketValue: 1000, reconstructed: true },
    ]);
  });

  it("returns an empty series when there is no buy", () => {
    expect(reconstructSnapshots({ transactions: [], historyBySymbol: { AAPL }, asOf: "2026-01-07" })).toEqual([]);
    expect(reconstructSnapshots({ transactions: [{ type: "dividend", symbol: "AAPL", date: "2026-01-05", amount: 5 }], historyBySymbol: { AAPL }, asOf: "2026-01-07" })).toEqual([]);
  });

  it("returns an empty series when as-of predates the first buy", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-06", quantity: 10, price: 100 },
    ];
    expect(reconstructSnapshots({ transactions, historyBySymbol: { AAPL }, asOf: "2026-01-05" })).toEqual([]);
  });

  it("degrades to empty when a held symbol has no history at all", () => {
    const transactions = [
      { type: "buy", symbol: "TSLA", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    expect(reconstructSnapshots({ transactions, historyBySymbol: {}, asOf: "2026-01-07" })).toEqual([]);
  });

  it("produces a series a TWR can consume", () => {
    const transactions = [
      { type: "buy", symbol: "AAPL", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-07",
    });
    const twr = computeTimeWeightedReturn(series, transactions);
    expect(twr.hasData).toBe(true);
    // 100 → 121 with no external flow after day 05 → +21 %.
    expect(twr.twrPct).toBeCloseTo(21, 6);
  });

  it("is case-insensitive on the transaction symbol", () => {
    const transactions = [
      { type: "buy", symbol: "aapl", date: "2026-01-05", quantity: 10, price: 100 },
    ];
    const series = reconstructSnapshots({
      transactions,
      historyBySymbol: { AAPL },
      asOf: "2026-01-05",
    });
    expect(series).toEqual([
      { snapshotDate: "2026-01-05", totalMarketValue: 1000, reconstructed: true },
    ]);
  });
});
