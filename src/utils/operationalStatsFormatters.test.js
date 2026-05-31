import { describe, it, expect } from "vitest";
import { formatCount, formatDays, formatMultiple } from "./operationalStatsFormatters";

describe("formatCount", () => {
  it("arrondit et formate un entier", () => {
    expect(formatCount(12)).toBe("12");
    expect(formatCount(12.6)).toBe("13");
  });
  it("null sur entrée invalide", () => {
    expect(formatCount(null)).toBeNull();
    expect(formatCount(undefined)).toBeNull();
    expect(formatCount(Number.NaN)).toBeNull();
  });
});

describe("formatDays", () => {
  it("jours sous un an", () => {
    expect(formatDays(0)).toBe("0 j");
    expect(formatDays(182.4)).toBe("182 j");
    expect(formatDays(364)).toBe("364 j");
  });
  it("années à partir d'un an", () => {
    expect(formatDays(365)).toBe("1,0 an");
    expect(formatDays(511)).toBe("1,4 an");
    expect(formatDays(730)).toBe("2,0 ans");
  });
  it("null sur entrée invalide ou négative", () => {
    expect(formatDays(null)).toBeNull();
    expect(formatDays(-5)).toBeNull();
    expect(formatDays(Number.NaN)).toBeNull();
  });
});

describe("formatMultiple", () => {
  it("formate un multiple à 2 décimales avec ×", () => {
    expect(formatMultiple(3)).toBe("3,00×");
    expect(formatMultiple(1.834)).toBe("1,83×");
  });
  it("null sur entrée invalide", () => {
    expect(formatMultiple(null)).toBeNull();
    expect(formatMultiple(Number.NaN)).toBeNull();
  });
});
