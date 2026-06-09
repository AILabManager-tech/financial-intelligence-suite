import { describe, it, expect } from "vitest";
import { toStooqSymbol } from "./stooqSymbol.js";

describe("toStooqSymbol", () => {
  it("maps a plain US ticker to the .us namespace", () => {
    expect(toStooqSymbol("AAPL")).toBe("aapl.us");
    expect(toStooqSymbol("msft")).toBe("msft.us");
  });

  it("maps a US class share to a hyphenated .us symbol", () => {
    expect(toStooqSymbol("BRK.B")).toBe("brk-b.us");
  });

  it("returns null for Canadian listings instead of fabricating a US symbol", () => {
    expect(toStooqSymbol("RY.TO")).toBeNull();
    expect(toStooqSymbol("ABC.V")).toBeNull();
    expect(toStooqSymbol("XYZ.CN")).toBeNull();
    expect(toStooqSymbol("DEF.NE")).toBeNull();
  });

  it("returns null for other non-US exchanges", () => {
    expect(toStooqSymbol("VOD.L")).toBeNull();
    expect(toStooqSymbol("7203.T")).toBeNull();
  });

  it("returns null for empty/invalid input", () => {
    expect(toStooqSymbol("")).toBeNull();
    expect(toStooqSymbol(null)).toBeNull();
    expect(toStooqSymbol(undefined)).toBeNull();
  });
});
