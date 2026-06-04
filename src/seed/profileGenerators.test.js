import { describe, expect, it } from "vitest";
import {
  buildGeneratedProfiles,
  generateLargePortfolioProfile,
  generateLongHistoryProfile,
} from "./profileGenerators";
import { DEMO_PREFIX } from "./profils.seed";

describe("generateLargePortfolioProfile", () => {
  it("produces 50+ distinct buy positions with per-symbol price + sector meta", () => {
    const p = generateLargePortfolioProfile();
    expect(p.id.startsWith(DEMO_PREFIX)).toBe(true);
    expect(p.transactions.length).toBeGreaterThanOrEqual(50);
    const symbols = p.transactions.map((t) => t.symbol);
    expect(new Set(symbols).size).toBe(symbols.length); // all distinct
    for (const t of p.transactions) {
      expect(t.type).toBe("buy");
      expect(t.quantity).toBeGreaterThan(0);
      expect(t.price).toBeGreaterThan(0);
      expect(p.prixCourant[t.symbol]).toBeGreaterThan(0);
      expect(p.meta[t.symbol].sector).toBeTruthy();
    }
  });

  it("spreads holdings across many sector families (not one bucket)", () => {
    const p = generateLargePortfolioProfile();
    const families = new Set(
      Object.values(p.meta).map((m) => m.sector.split("—")[0].trim()),
    );
    expect(families.size).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateLargePortfolioProfile()).toEqual(generateLargePortfolioProfile());
    expect(generateLargePortfolioProfile({ seed: "a" })).not.toEqual(
      generateLargePortfolioProfile({ seed: "b" }),
    );
  });
});

describe("generateLongHistoryProfile", () => {
  it("produces a long, chronologically-sorted buy history from 2018", () => {
    const p = generateLongHistoryProfile();
    expect(p.id.startsWith(DEMO_PREFIX)).toBe(true);
    expect(p.transactions.length).toBeGreaterThan(50);
    expect(p.transactions[0].date).toBe(p.dateDebut);
    const dates = p.transactions.map((t) => t.date);
    expect([...dates].sort()).toEqual(dates); // already chronological
    expect(p.transactions[0].date.startsWith("2018")).toBe(true);
    for (const sym of Object.keys(p.prixCourant)) {
      expect(p.prixCourant[sym]).toBeGreaterThan(0);
    }
  });

  it("is deterministic for a fixed seed", () => {
    expect(generateLongHistoryProfile()).toEqual(generateLongHistoryProfile());
  });
});

describe("buildGeneratedProfiles", () => {
  it("returns the large + long-history profiles, both demo-prefixed", () => {
    const profiles = buildGeneratedProfiles();
    expect(profiles).toHaveLength(2);
    expect(profiles.every((p) => p.id.startsWith(DEMO_PREFIX))).toBe(true);
  });
});
