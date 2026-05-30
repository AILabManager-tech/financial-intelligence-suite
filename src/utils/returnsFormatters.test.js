import { describe, it, expect } from "vitest";
import { formatPct, returnTone, formatMonthLabel, formatRatio } from "./returnsFormatters";

describe("formatPct", () => {
  it("formate avec signe et deux décimales", () => {
    expect(formatPct(12.345)).toBe("+12.35 %");
    expect(formatPct(-3.2)).toBe("-3.20 %");
    expect(formatPct(0)).toBe("+0.00 %");
  });

  it("retourne null pour une valeur absente ou invalide", () => {
    expect(formatPct(null)).toBeNull();
    expect(formatPct(undefined)).toBeNull();
    expect(formatPct(Number.NaN)).toBeNull();
    expect(formatPct(Infinity)).toBeNull();
    expect(formatPct("12")).toBeNull();
  });
});

describe("returnTone", () => {
  it("vert positif, rose négatif, neutre sinon", () => {
    expect(returnTone(1)).toBe("text-emerald-400");
    expect(returnTone(0)).toBe("text-emerald-400");
    expect(returnTone(-1)).toBe("text-rose-400");
    expect(returnTone(null)).toBe("text-slate-500");
    expect(returnTone(Number.NaN)).toBe("text-slate-500");
  });
});

describe("formatRatio", () => {
  it("formate à 2 décimales par défaut", () => {
    expect(formatRatio(1.5)).toBe("1.50");
    expect(formatRatio(-0.234, 3)).toBe("-0.234");
  });

  it("retourne null pour une valeur absente ou invalide", () => {
    expect(formatRatio(null)).toBeNull();
    expect(formatRatio(Number.NaN)).toBeNull();
    expect(formatRatio("1")).toBeNull();
  });
});

describe("formatMonthLabel", () => {
  it("formate YYYY-MM en mois court FR (UTC, sans glissement de fuseau)", () => {
    expect(formatMonthLabel("2024-01")).toBe("janv. 2024");
    expect(formatMonthLabel("2023-12")).toBe("déc. 2023");
  });

  it("retourne null pour une entrée invalide", () => {
    expect(formatMonthLabel(null)).toBeNull();
    expect(formatMonthLabel("2024")).toBeNull();
    expect(formatMonthLabel("bogus")).toBeNull();
  });
});
