import { describe, it, expect } from "vitest";
import { applyTransactions, summarize, summarizeSymbol } from "./lotEngine";

const buy = (symbol, date, quantity, price, fee = 0) => ({ type: "buy", symbol, date, quantity, price, fee });
const sell = (symbol, date, quantity, price, fee = 0) => ({ type: "sell", symbol, date, quantity, price, fee });

describe("applyTransactions — appariement de lots", () => {
  it("FIFO : la vente consomme les lots les plus anciens", () => {
    const r = applyTransactions(
      [buy("AAPL", "2020-01-01", 10, 100), buy("AAPL", "2020-06-01", 10, 200), sell("AAPL", "2021-01-01", 10, 250)],
      { method: "fifo" },
    );
    // vend 10 @250 contre le lot @100 -> réalisé 10*(250-100)=1500
    expect(r.AAPL.realizedPnl).toBeCloseTo(1500, 6);
    // reste le lot @200 (10 parts)
    expect(r.AAPL.lots).toHaveLength(1);
    expect(r.AAPL.lots[0].costPerShare).toBe(200);
  });

  it("LIFO : la vente consomme les lots les plus récents", () => {
    const r = applyTransactions(
      [buy("AAPL", "2020-01-01", 10, 100), buy("AAPL", "2020-06-01", 10, 200), sell("AAPL", "2021-01-01", 10, 250)],
      { method: "lifo" },
    );
    // vend contre le lot @200 -> réalisé 10*(250-200)=500
    expect(r.AAPL.realizedPnl).toBeCloseTo(500, 6);
    expect(r.AAPL.lots[0].costPerShare).toBe(100);
  });

  it("vente partielle entamant plusieurs lots (FIFO)", () => {
    const r = applyTransactions(
      [buy("X", "2020-01-01", 5, 100), buy("X", "2020-02-01", 5, 120), sell("X", "2020-03-01", 8, 150)],
      { method: "fifo" },
    );
    // 5@100 -> 5*(150-100)=250 ; 3@120 -> 3*(150-120)=90 ; total 340
    expect(r.X.realizedPnl).toBeCloseTo(340, 6);
    // reste 2 parts @120
    const s = summarizeSymbol(r.X);
    expect(s.openQuantity).toBeCloseTo(2, 6);
    expect(s.averageCost).toBeCloseTo(120, 6);
  });

  it("frais d'achat capitalisés dans le coût, frais de vente déduits du réalisé", () => {
    const r = applyTransactions(
      [buy("Y", "2020-01-01", 10, 100, 50), sell("Y", "2020-02-01", 10, 110, 20)],
      { method: "fifo" },
    );
    // coût/part = 100 + 50/10 = 105 ; réalisé brut 10*(110-105)=50 ; - frais vente 20 = 30
    expect(r.Y.realizedPnl).toBeCloseTo(30, 6);
    expect(r.Y.fees).toBeCloseTo(70, 6);
  });

  it("survente : consomme le disponible et signale l'excédent (jamais masqué)", () => {
    const r = applyTransactions([buy("Z", "2020-01-01", 5, 100), sell("Z", "2020-02-01", 8, 150)]);
    expect(r.Z.oversold).toBeCloseTo(3, 6);
    expect(r.Z.lots).toHaveLength(0);
    expect(r.Z.realizedPnl).toBeCloseTo(5 * (150 - 100), 6);
  });

  it("dividendes et frais autonomes suivis séparément", () => {
    const r = applyTransactions([
      buy("D", "2020-01-01", 10, 100),
      { type: "dividend", symbol: "D", date: "2020-06-01", amount: 25 },
      { type: "fee", symbol: "D", date: "2020-07-01", amount: 5 },
    ]);
    expect(r.D.dividends).toBeCloseTo(25, 6);
    expect(r.D.fees).toBeCloseTo(5, 6);
    expect(r.D.realizedPnl).toBeCloseTo(-5, 6); // frais autonome réduit le réalisé
  });

  it("achat et vente le MÊME jour : résultat indépendant de l'ordre du tableau", () => {
    // Un aller-retour intrajournalier (ou un import CSV non trié) ne doit pas
    // produire une survente fantôme selon l'ordre des lignes en entrée.
    const b = buy("AAPL", "2024-03-01", 100, 150);
    const s = sell("AAPL", "2024-03-01", 100, 160);
    for (const input of [[b, s], [s, b]]) {
      const r = summarize(applyTransactions(input)).AAPL;
      expect(r.realizedPnl).toBeCloseTo(1000, 6);
      expect(r.openQuantity).toBeCloseTo(0, 6);
      expect(r.oversold).toBeCloseTo(0, 6);
    }
  });

  it("trie par date même en entrée désordonnée et isole les symboles", () => {
    const r = applyTransactions([
      sell("A", "2020-12-01", 5, 200),
      buy("A", "2020-01-01", 5, 100),
      buy("B", "2020-03-01", 1, 50),
    ]);
    expect(r.A.realizedPnl).toBeCloseTo(500, 6);
    expect(r.A.lots).toHaveLength(0);
    expect(summarizeSymbol(r.B).openQuantity).toBeCloseTo(1, 6);
  });

  it("tolère une entrée vide / invalide", () => {
    expect(applyTransactions([])).toEqual({});
    expect(applyTransactions(null)).toEqual({});
    expect(summarize({})).toEqual({});
  });
});

describe("summarize", () => {
  it("agrège par symbole : quantité ouverte, coût moyen, réalisé", () => {
    const r = applyTransactions([buy("AAPL", "2020-01-01", 10, 100), sell("AAPL", "2020-06-01", 4, 150)]);
    const s = summarize(r).AAPL;
    expect(s.openQuantity).toBeCloseTo(6, 6);
    expect(s.averageCost).toBeCloseTo(100, 6);
    expect(s.realizedPnl).toBeCloseTo(4 * 50, 6);
    expect(s.costBasis).toBeCloseTo(600, 6);
  });
});
