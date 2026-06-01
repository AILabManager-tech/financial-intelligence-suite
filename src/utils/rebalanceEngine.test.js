import { describe, expect, it } from "vitest";
import { computeRebalance } from "./rebalanceEngine";

function asset(symbol, quantity, price, targetWeight) {
  return { symbol, price, position: { quantity, targetWeight } };
}

describe("computeRebalance", () => {
  it("hasData:false sans cible définie", () => {
    expect(computeRebalance([asset("AAPL", 10, 100, 0)]).hasData).toBe(false);
    expect(computeRebalance([]).hasData).toBe(false);
  });

  it("suggère acheter/vendre pour rejoindre la cible", () => {
    // AAPL 7000 (70%) cible 50%, MSFT 3000 (30%) cible 50%. Total 10000.
    const result = computeRebalance(
      [asset("AAPL", 70, 100, 50), asset("MSFT", 30, 100, 50)],
      { thresholdPct: 1 },
    );
    expect(result.hasData).toBe(true);
    const aapl = result.rows.find((r) => r.symbol === "AAPL");
    const msft = result.rows.find((r) => r.symbol === "MSFT");
    expect(aapl.action).toBe("sell");
    expect(aapl.amount).toBeCloseTo(2000, 6); // 7000 → cible 5000
    expect(msft.action).toBe("buy");
    expect(msft.amount).toBeCloseTo(2000, 6); // 3000 → cible 5000
    expect(result.totalToBuy).toBeCloseTo(2000, 6);
    expect(result.totalToSell).toBeCloseTo(2000, 6);
  });

  it("ne suggère rien sous le seuil de dérive (proxy coûts)", () => {
    // AAPL 5050 (50.5%) cible 50% → dérive 0.5% < seuil 1% → hold
    const result = computeRebalance(
      [asset("AAPL", 5050, 1, 50), asset("MSFT", 4950, 1, 50)],
      { thresholdPct: 1 },
    );
    expect(result.rows.every((r) => r.action === "hold")).toBe(true);
    expect(result.actionableCount).toBe(0);
  });

  it("rapporte la somme des cibles (cash implicite si < 100 %)", () => {
    const result = computeRebalance([asset("AAPL", 50, 100, 40), asset("MSFT", 50, 100, 40)]);
    expect(result.targetSumPct).toBe(80); // 20% cash implicite
  });
});
