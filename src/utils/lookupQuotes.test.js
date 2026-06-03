import { describe, expect, it } from "vitest";
import { collectLookupSymbols, indexQuotesBySymbol } from "./lookupQuotes";

describe("collectLookupSymbols", () => {
  it("dedupes, uppercases and caps the symbol list", () => {
    const results = [
      { symbol: "AAPL" },
      { symbol: "aapl" },
      { symbol: "MSFT" },
      { symbol: "NVDA" },
    ];
    expect(collectLookupSymbols(results, 2)).toEqual(["AAPL", "MSFT"]);
  });

  it("skips empty symbols and tolerates missing input", () => {
    expect(collectLookupSymbols([{ symbol: "" }, { symbol: "KO" }])).toEqual(["KO"]);
    expect(collectLookupSymbols(undefined)).toEqual([]);
  });
});

describe("indexQuotesBySymbol", () => {
  it("indexes valid quotes by uppercased symbol", () => {
    const index = indexQuotesBySymbol([
      { symbol: "AAPL", price: 200, change: 1.5, changePct: 0.75, source: "finnhub.io" },
    ]);
    expect(index.AAPL).toEqual({ price: 200, change: 1.5, changePct: 0.75, source: "finnhub.io" });
  });

  it("drops quotes without a usable price (never a fabricated 0)", () => {
    const index = indexQuotesBySymbol([
      { symbol: "UNH.TO", price: 0 },
      { symbol: "BAD", price: "n/a" },
      { symbol: "OK", price: 10 },
    ]);
    expect(index["UNH.TO"]).toBeUndefined();
    expect(index.BAD).toBeUndefined();
    expect(index.OK.price).toBe(10);
  });

  it("nullifies non-finite change fields without dropping the quote", () => {
    const index = indexQuotesBySymbol([{ symbol: "OK", price: 10, change: null, changePct: undefined }]);
    expect(index.OK).toEqual({ price: 10, change: null, changePct: null, source: null });
  });
});
