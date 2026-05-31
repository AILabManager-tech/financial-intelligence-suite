import { describe, it, expect } from "vitest";
import { computeOperationalStats } from "./operationalStats";

const buy = (symbol, date, quantity, price, fee = 0) => ({ type: "buy", symbol, date, quantity, price, fee });
const sell = (symbol, date, quantity, price, fee = 0) => ({ type: "sell", symbol, date, quantity, price, fee });
const dividend = (symbol, date, amount) => ({ type: "dividend", symbol, date, amount });

describe("computeOperationalStats — état vide / dégénéré", () => {
  it("entrée vide : hasData false, mesures nulles, pas de zéro inventé", () => {
    const s = computeOperationalStats([]);
    expect(s.hasData).toBe(false);
    expect(s.closedCount).toBe(0);
    expect(s.hitRatioPct).toBeNull();
    expect(s.winLossRatio).toBeNull();
    expect(s.avgHoldingDays).toBeNull();
    expect(s.turnoverPct).toBeNull();
    expect(s.yieldOnCostPct).toBeNull();
  });

  it("tolère null / non-array", () => {
    expect(computeOperationalStats(null).hasData).toBe(false);
    expect(computeOperationalStats(undefined).closedCount).toBe(0);
  });

  it("positions ouvertes sans vente : hasData true mais aucune mesure de clôture", () => {
    const s = computeOperationalStats([buy("AAPL", "2020-01-01", 10, 100)]);
    expect(s.hasData).toBe(true);
    expect(s.closedCount).toBe(0);
    expect(s.hitRatioPct).toBeNull();
    expect(s.avgHoldingDays).toBeNull();
    // tout le coût est encore détenu → rotation 0 %
    expect(s.turnoverPct).toBeCloseTo(0, 6);
    expect(s.openCostBasis).toBeCloseTo(1000, 6);
  });
});

describe("computeOperationalStats — taux de réussite et gain/perte", () => {
  const txns = [
    buy("WIN", "2020-01-01", 10, 100),
    sell("WIN", "2020-04-01", 10, 130), // +300 gagnant
    buy("LOSE", "2020-01-01", 10, 100),
    sell("LOSE", "2020-04-01", 10, 90), // -100 perdant
  ];

  it("hit ratio = part des round-trips gagnants", () => {
    const s = computeOperationalStats(txns);
    expect(s.closedCount).toBe(2);
    expect(s.winners).toBe(1);
    expect(s.losers).toBe(1);
    expect(s.hitRatioPct).toBeCloseTo(50, 6);
  });

  it("win/loss = gain moyen / |perte moyenne|", () => {
    const s = computeOperationalStats(txns);
    expect(s.avgWin).toBeCloseTo(300, 6);
    expect(s.avgLoss).toBeCloseTo(-100, 6);
    expect(s.winLossRatio).toBeCloseTo(3, 6);
  });

  it("win/loss nul s'il n'y a aucune perte (division impossible)", () => {
    const s = computeOperationalStats([buy("A", "2020-01-01", 1, 10), sell("A", "2020-02-01", 1, 20)]);
    expect(s.winLossRatio).toBeNull();
    expect(s.hitRatioPct).toBeCloseTo(100, 6);
  });
});

describe("computeOperationalStats — détention et rotation", () => {
  it("détention moyenne pondérée par la quantité, en jours", () => {
    // 10 parts détenues 100 j, 30 parts détenues 200 j → (10*100+30*200)/40 = 175 j
    const s = computeOperationalStats([
      buy("X", "2020-01-01", 10, 100),
      sell("X", "2020-04-10", 10, 110), // 2020-01-01 → 2020-04-10 = 100 j
      buy("Y", "2020-01-01", 30, 100),
      sell("Y", "2020-07-19", 30, 110), // 2020-01-01 → 2020-07-19 = 200 j
    ]);
    expect(s.avgHoldingDays).toBeCloseTo(175, 0);
  });

  it("rotation = coût vendu / (coût vendu + coût ouvert)", () => {
    // achète 20@100 (2000), vend 10@... → coût vendu 1000, coût ouvert 1000 → 50 %
    const s = computeOperationalStats([buy("X", "2020-01-01", 20, 100), sell("X", "2020-06-01", 10, 120)]);
    expect(s.turnoverPct).toBeCloseTo(50, 6);
  });

  it("période couverte en jours bornée par la 1re et la dernière transaction", () => {
    const s = computeOperationalStats([buy("X", "2020-01-01", 1, 1), sell("X", "2020-12-31", 1, 2)]);
    expect(s.periodDays).toBeCloseTo(365, 0);
  });
});

describe("computeOperationalStats — rendement sur coût", () => {
  it("dividendes cumulés / coût des positions ouvertes", () => {
    const s = computeOperationalStats([
      buy("D", "2020-01-01", 10, 100), // coût ouvert 1000
      dividend("D", "2020-06-01", 40),
    ]);
    expect(s.dividends).toBeCloseTo(40, 6);
    expect(s.yieldOnCostPct).toBeCloseTo(4, 6);
  });

  it("rendement sur coût nul si aucune position ouverte (tout vendu)", () => {
    const s = computeOperationalStats([
      buy("D", "2020-01-01", 10, 100),
      dividend("D", "2020-03-01", 40),
      sell("D", "2020-06-01", 10, 110),
    ]);
    expect(s.openCostBasis).toBeCloseTo(0, 6);
    expect(s.yieldOnCostPct).toBeNull();
  });
});

describe("computeOperationalStats — méthode FIFO/LIFO", () => {
  it("la méthode LIFO change le P&L réalisé donc le bilan gagnant/perdant", () => {
    const txns = [
      buy("Z", "2020-01-01", 10, 100),
      buy("Z", "2020-02-01", 10, 200),
      sell("Z", "2020-03-01", 10, 150),
    ];
    const fifo = computeOperationalStats(txns, { method: "fifo" }); // vend lot @100 → +500 gagnant
    const lifo = computeOperationalStats(txns, { method: "lifo" }); // vend lot @200 → -500 perdant
    expect(fifo.realizedPnl).toBeCloseTo(500, 6);
    expect(fifo.winners).toBe(1);
    expect(lifo.realizedPnl).toBeCloseTo(-500, 6);
    expect(lifo.losers).toBe(1);
  });
});
