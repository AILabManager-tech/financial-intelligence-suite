import { describe, expect, it } from "vitest";
import {
  parseTransactionCsv,
  parseTransactionDate,
  normalizeTransactionType,
  detectTransactionMapping,
} from "./transactionCsvImporter";

describe("parseTransactionDate", () => {
  it("accepts ISO", () => {
    expect(parseTransactionDate("2026-03-06")).toBe("2026-03-06");
    expect(parseTransactionDate("2026/03/06")).toBe("2026-03-06");
  });

  it("resolves day/month when the day is unambiguous", () => {
    expect(parseTransactionDate("25/03/2026")).toBe("2026-03-25");
  });

  // Le piège qui décale une disposition d'année fiscale.
  it("refuses a date where day and month are indistinguishable", () => {
    expect(parseTransactionDate("03/06/2026")).toEqual({ ambiguous: true });
  });

  it("rejects garbage rather than guessing", () => {
    expect(parseTransactionDate("hier")).toBeNull();
    expect(parseTransactionDate("")).toBeNull();
  });
});

describe("normalizeTransactionType", () => {
  it("maps the real French and English vocabulary of broker statements", () => {
    expect(normalizeTransactionType("Achat")).toBe("buy");
    expect(normalizeTransactionType("BOUGHT")).toBe("buy");
    expect(normalizeTransactionType("Vente")).toBe("sell");
    expect(normalizeTransactionType("Disposition")).toBe("sell");
    expect(normalizeTransactionType("Dividende")).toBe("dividend");
    expect(normalizeTransactionType("Frais")).toBe("fee");
  });

  // Ranger un type inconnu dans "buy" par défaut inverserait un gain en perte.
  it("returns null for an unknown type instead of defaulting", () => {
    expect(normalizeTransactionType("Transfert entrant")).toBeNull();
    expect(normalizeTransactionType("")).toBeNull();
  });
});

describe("detectTransactionMapping", () => {
  it("detects French broker headers", () => {
    const m = detectTransactionMapping(["Date de transaction", "Opération", "Symbole", "Quantité", "Prix unitaire", "Frais"]);
    expect(m.date).toBe(0);
    expect(m.type).toBe(1);
    expect(m.symbol).toBe(2);
    expect(m.quantity).toBe(3);
    expect(m.price).toBe(4);
    expect(m.fee).toBe(5);
  });

  it("detects English broker headers", () => {
    const m = detectTransactionMapping(["Trade Date", "Activity", "Ticker", "Shares", "Unit Price"]);
    expect(m.date).toBe(0);
    expect(m.type).toBe(1);
    expect(m.symbol).toBe(2);
    expect(m.quantity).toBe(3);
    expect(m.price).toBe(4);
  });
});

describe("parseTransactionCsv", () => {
  const CSV = [
    "Date de transaction,Opération,Symbole,Quantité,Prix unitaire,Frais",
    "2026-04-06,Achat,VOO,2,517.84,9.95",
    "2026-03-06,Achat,VTI,3,296.32,9.95",
  ].join("\n");

  it("imports a French broker statement", () => {
    const r = parseTransactionCsv(CSV);
    expect(r.errors).toEqual([]);
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0]).toMatchObject({ type: "buy", symbol: "VTI", date: "2026-03-06", quantity: 3, price: 296.32, fee: 9.95 });
  });

  // Un relevé arrive presque toujours du plus récent au plus ancien ; le moteur
  // de lots apparie dans l'ordre, donc FIFO serait inversé sans ce tri.
  it("sorts chronologically regardless of the statement's order", () => {
    const r = parseTransactionCsv(CSV);
    expect(r.transactions.map((t) => t.date)).toEqual(["2026-03-06", "2026-04-06"]);
  });

  it("handles quoted fields, currency symbols and European decimals", () => {
    const csv = [
      "Date,Type,Symbole,Quantité,Prix,Frais",
      '2026-03-06,Achat,"BRK.B",2,"1 234,56 $","9,95"',
    ].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.transactions[0]).toMatchObject({ symbol: "BRK.B", price: 1234.56, fee: 9.95 });
  });

  it("normalizes a negative sell quantity to a positive one", () => {
    const csv = ["Date,Type,Symbole,Quantité,Prix", "2026-03-06,Vente,AAPL,-10,200"].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.transactions[0]).toMatchObject({ type: "sell", quantity: 10, price: 200 });
  });

  it("imports a dividend from its amount, with no quantity", () => {
    const csv = ["Date,Type,Symbole,Montant", "2026-03-06,Dividende,KO,48.20"].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.errors).toEqual([]);
    expect(r.transactions[0]).toMatchObject({ type: "dividend", symbol: "KO", amount: 48.2 });
  });

  it("rejects a bad row with its line number and keeps the good ones", () => {
    const csv = [
      "Date,Type,Symbole,Quantité,Prix",
      "2026-03-06,Achat,VOO,2,517.84",
      "2026-03-07,Transfert entrant,VOO,5,",
      "2026-03-08,Achat,VTI,3,296.32",
    ].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.transactions).toHaveLength(2);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].line).toBe(3);
    expect(r.errors[0].reason).toMatch(/Transfert entrant/);
  });

  it("names the missing required columns", () => {
    const r = parseTransactionCsv("Foo,Bar\n1,2");
    expect(r.transactions).toEqual([]);
    expect(r.errors[0].reason).toMatch(/date, type, symbol/);
  });

  it("reports an empty file rather than importing nothing silently", () => {
    const r = parseTransactionCsv("");
    expect(r.errors[0].reason).toMatch(/vide/i);
  });

  it("rejects a buy with no price instead of importing it at zero", () => {
    const csv = ["Date,Type,Symbole,Quantité,Prix", "2026-03-06,Achat,VOO,2,"].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.transactions).toEqual([]);
    expect(r.errors[0].reason).toMatch(/Prix invalide/);
  });

  it("surfaces an ambiguous date as an error naming the fix", () => {
    const csv = ["Date,Type,Symbole,Quantité,Prix", "03/06/2026,Achat,VOO,2,517.84"].join("\n");
    const r = parseTransactionCsv(csv);
    expect(r.transactions).toEqual([]);
    expect(r.errors[0].reason).toMatch(/ambiguë/i);
    expect(r.errors[0].reason).toMatch(/ISO/);
  });
});
