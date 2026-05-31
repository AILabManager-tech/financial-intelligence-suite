import { describe, expect, it } from "vitest";
import { computePortfolioConcentration } from "./portfolioConcentration";

const holding = (symbol, sector, quantity, price) => ({
  symbol,
  sector,
  price,
  position: { quantity, averageCost: price },
});

describe("computePortfolioConcentration", () => {
  it("returns hasData:false for an empty or value-less portfolio", () => {
    expect(computePortfolioConcentration([]).hasData).toBe(false);
    expect(computePortfolioConcentration([holding("AAPL", "Tech", 0, 100)]).hasData).toBe(false);
    expect(computePortfolioConcentration([holding("AAPL", "Tech", 10, 0)]).hasData).toBe(false);
    expect(computePortfolioConcentration(null).hasData).toBe(false);
  });

  it("flags a single holding as fully concentrated (HHI 10000, effective 1)", () => {
    const result = computePortfolioConcentration([holding("AAPL", "Tech", 10, 100)]);
    expect(result.hasData).toBe(true);
    expect(result.positionsCount).toBe(1);
    expect(result.hhi).toBe(10000);
    expect(result.effectiveHoldings).toBeCloseTo(1, 5);
    expect(result.topHolding).toEqual({ symbol: "AAPL", weightPct: 100 });
    expect(result.band).toBe("concentrated");
  });

  it("computes equal-weight diversification (10 holdings -> HHI 1000, effective 10)", () => {
    const assets = Array.from({ length: 10 }, (_, i) =>
      holding(`S${i}`, `Sector ${i}`, 1, 100),
    );
    const result = computePortfolioConcentration(assets);
    expect(result.positionsCount).toBe(10);
    expect(result.hhi).toBeCloseTo(1000, 5);
    expect(result.effectiveHoldings).toBeCloseTo(10, 5);
    expect(result.topHolding.weightPct).toBeCloseTo(10, 5);
    expect(result.band).toBe("diversified");
  });

  it("weights by market value and sorts holdings descending", () => {
    // 30 + 10 = 40 total → 75% / 25%
    const result = computePortfolioConcentration([
      holding("SMALL", "Tech", 1, 10),
      holding("BIG", "Tech", 1, 30),
    ]);
    expect(result.holdings[0].symbol).toBe("BIG");
    expect(result.holdings[0].weightPct).toBeCloseTo(75, 5);
    expect(result.topHolding.weightPct).toBeCloseTo(75, 5);
    // HHI = 75^2 + 25^2 = 5625 + 625 = 6250 → concentrated
    expect(result.hhi).toBeCloseTo(6250, 5);
    expect(result.band).toBe("concentrated");
  });

  it("aggregates sectors by family and reports the top sector", () => {
    const result = computePortfolioConcentration([
      holding("AAPL", "Technologie — Hardware", 1, 50),
      holding("MSFT", "Technologie — Software", 1, 50),
      holding("XOM", "Énergie — Pétrole", 1, 100),
    ]);
    // Tech family = 100 / 200 = 50%, Énergie = 50%
    expect(result.sectorsCount).toBe(2);
    expect(result.topSector.sector).toBe("Énergie");
    expect(result.topSector.weightPct).toBeCloseTo(50, 5);
  });

  it("computes the top-5 concentration", () => {
    const assets = Array.from({ length: 8 }, (_, i) => holding(`S${i}`, "Mix", 1, 100));
    const result = computePortfolioConcentration(assets);
    // 8 equal holdings of 12.5% each → top 5 = 62.5%
    expect(result.top5Pct).toBeCloseTo(62.5, 5);
  });

  it("classifies a moderate portfolio between the standard HHI bands", () => {
    // weights 40/30/30 → HHI = 1600 + 900 + 900 = 3400 (concentrated)
    // weights 30/30/20/20 → HHI = 900+900+400+400 = 2600 ... pick a moderate one:
    // 25/25/25/15/10 → 625*3 + 225 + 100 = 1875 + 325 = 2200 → moderate
    const result = computePortfolioConcentration([
      holding("A", "S", 25, 100),
      holding("B", "S", 25, 100),
      holding("C", "S", 25, 100),
      holding("D", "S", 15, 100),
      holding("E", "S", 10, 100),
    ]);
    expect(result.hhi).toBeCloseTo(2200, 5);
    expect(result.band).toBe("moderate");
  });
});
