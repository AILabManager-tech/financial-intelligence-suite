import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  normalizeTransaction,
  makeTransactionId,
  addTransaction,
  removeTransaction,
  loadTransactions,
  saveTransactions,
} from "./transactionStore";

describe("normalizeTransaction", () => {
  it("normalise un achat (symbole maj, nombres)", () => {
    expect(
      normalizeTransaction({ type: "buy", symbol: " aapl ", date: "2020-01-01", quantity: "10", price: "100", fee: "5" }),
    ).toMatchObject({ type: "buy", symbol: "AAPL", date: "2020-01-01", quantity: 10, price: 100, fee: 5 });
  });

  it("normalise un dividende (montant)", () => {
    expect(normalizeTransaction({ type: "dividend", symbol: "msft", date: "2021-02-01", amount: "25" })).toMatchObject({
      type: "dividend",
      symbol: "MSFT",
      amount: 25,
    });
  });

  it("rejette un type inconnu / symbole ou date manquants", () => {
    expect(normalizeTransaction({ type: "xfer", symbol: "AAPL", date: "2020-01-01" })).toBeNull();
    expect(normalizeTransaction({ type: "buy", symbol: "", date: "2020-01-01" })).toBeNull();
    expect(normalizeTransaction({ type: "buy", symbol: "AAPL", date: "" })).toBeNull();
    expect(normalizeTransaction(null)).toBeNull();
  });
});

describe("makeTransactionId", () => {
  it("génère un id stable et sans collision", () => {
    expect(makeTransactionId([])).toBe("t1");
    expect(makeTransactionId([{ id: "t1" }, { id: "t2" }])).toBe("t3");
    expect(makeTransactionId([{ id: "t5" }])).toBe("t6");
  });
});

describe("add / remove", () => {
  it("ajoute une transaction normalisée avec id", () => {
    const list = addTransaction([], { type: "buy", symbol: "aapl", date: "2020-01-01", quantity: 10, price: 100 });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ id: "t1", symbol: "AAPL", quantity: 10, price: 100 });
  });

  it("ignore une transaction invalide (retourne la même référence)", () => {
    const base = [];
    expect(addTransaction(base, { type: "buy", symbol: "", date: "2020-01-01" })).toBe(base);
  });

  it("supprime par id", () => {
    const list = addTransaction([], { type: "buy", symbol: "AAPL", date: "2020-01-01", quantity: 1, price: 1 });
    expect(removeTransaction(list, "t1")).toHaveLength(0);
  });
});

describe("persistance scopée par mandat", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("isole les transactions par mandat ; default = clé de base", () => {
    saveTransactions([{ id: "t1", type: "buy", symbol: "AAPL", date: "2020-01-01", quantity: 1, price: 1 }], "default");
    saveTransactions([{ id: "t1", type: "buy", symbol: "MSFT", date: "2020-01-01", quantity: 2, price: 2 }], "client-a");

    expect(loadTransactions("default").map((t) => t.symbol)).toEqual(["AAPL"]);
    expect(loadTransactions("client-a").map((t) => t.symbol)).toEqual(["MSFT"]);
    expect(localStorage.getItem("fis:transactions:v1")).not.toBeNull();
    expect(localStorage.getItem("fis:transactions:v1::client-a")).not.toBeNull();
  });

  it("retourne [] si aucune transaction stockée", () => {
    expect(loadTransactions("vide")).toEqual([]);
  });

  it("tolère un JSON corrompu", () => {
    localStorage.setItem("fis:transactions:v1", "{not json");
    expect(loadTransactions("default")).toEqual([]);
  });
});
