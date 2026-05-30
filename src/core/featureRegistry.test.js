import { describe, it, expect } from "vitest";
import {
  FEATURE_REGISTRY,
  VALID_SURFACES,
  getFeatureById,
  getFeaturesBySurface,
  groupFeaturesByCategory,
  getDefaultLayout,
} from "./featureRegistry";

describe("featureRegistry — invariants", () => {
  it("expose un tableau non vide", () => {
    expect(Array.isArray(FEATURE_REGISTRY)).toBe(true);
    expect(FEATURE_REGISTRY.length).toBeGreaterThan(0);
  });

  it("a des ids uniques", () => {
    const ids = FEATURE_REGISTRY.map((f) => f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("a des componentKey uniques", () => {
    const keys = FEATURE_REGISTRY.map((f) => f.componentKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("chaque entrée respecte le schéma attendu", () => {
    for (const f of FEATURE_REGISTRY) {
      expect(typeof f.id).toBe("string");
      expect(f.id.length).toBeGreaterThan(0);
      expect(typeof f.label).toBe("string");
      expect(f.label.length).toBeGreaterThan(0);
      expect(typeof f.category).toBe("string");
      expect(f.category.length).toBeGreaterThan(0);
      expect(VALID_SURFACES).toContain(f.surface);
      expect(typeof f.componentKey).toBe("string");
      expect(f.componentKey.length).toBeGreaterThan(0);
      expect(Array.isArray(f.dataDeps)).toBe(true);
      expect(typeof f.defaultVisible).toBe("boolean");
      expect(typeof f.order).toBe("number");
      expect(Number.isFinite(f.order)).toBe(true);
    }
  });

  it("est immuable (gelé en profondeur)", () => {
    expect(Object.isFrozen(FEATURE_REGISTRY)).toBe(true);
    for (const f of FEATURE_REGISTRY) {
      expect(Object.isFrozen(f)).toBe(true);
      expect(Object.isFrozen(f.dataDeps)).toBe(true);
    }
  });
});

describe("featureRegistry — couverture des features existantes", () => {
  it("enregistre les 8 panels de la fiche actif", () => {
    const assetKeys = getFeaturesBySurface("asset").map((f) => f.componentKey);
    for (const key of [
      "FundamentalsPanel",
      "BuffettAnalysisPanel",
      "AnalystRatingsPanel",
      "EarningsCalendarPanel",
      "DividendHistoryPanel",
      "CompanyNewsPanel",
      "SecFilingsPanel",
      "PeersComparisonPanel",
    ]) {
      expect(assetKeys).toContain(key);
    }
  });

  it("enregistre le bloc composable du dashboard (panneaux, hors chrome)", () => {
    const dashKeys = getFeaturesBySurface("dashboard").map((f) => f.componentKey);
    for (const key of [
      "TopPerformers",
      "SafetyBadge",
      "MarketDataHealthPanel",
      "OperatorAlerts",
      "AlertManager",
      "RiskCommandCenter",
      "PortfolioManager",
    ]) {
      expect(dashKeys).toContain(key);
    }
  });

  it("exclut le chrome structurel et la route watchlist de la surface dashboard", () => {
    const dashKeys = getFeaturesBySurface("dashboard").map((f) => f.componentKey);
    // MarketLookup / SearchFilter / AssetTable = chrome fixe ; WatchlistPanel = route /watchlist.
    for (const key of ["MarketLookup", "SearchFilter", "AssetTable", "WatchlistPanel"]) {
      expect(dashKeys).not.toContain(key);
    }
  });
});

describe("getFeatureById", () => {
  it("retrouve une feature connue", () => {
    const f = getFeatureById("fundamentals");
    expect(f).toBeDefined();
    expect(f.componentKey).toBe("FundamentalsPanel");
  });

  it("retourne undefined pour un id inconnu", () => {
    expect(getFeatureById("inexistant")).toBeUndefined();
  });

  it("retourne undefined pour une entrée vide/nulle", () => {
    expect(getFeatureById("")).toBeUndefined();
    expect(getFeatureById(null)).toBeUndefined();
    expect(getFeatureById(undefined)).toBeUndefined();
  });
});

describe("getFeaturesBySurface", () => {
  it("ne retourne que la surface demandée", () => {
    for (const f of getFeaturesBySurface("asset")) {
      expect(f.surface).toBe("asset");
    }
    for (const f of getFeaturesBySurface("dashboard")) {
      expect(f.surface).toBe("dashboard");
    }
  });

  it("retourne les features triées par order croissant", () => {
    const orders = getFeaturesBySurface("asset").map((f) => f.order);
    const sorted = [...orders].sort((a, b) => a - b);
    expect(orders).toEqual(sorted);
  });

  it("retourne un tableau vide pour une surface inconnue", () => {
    expect(getFeaturesBySurface("nope")).toEqual([]);
  });
});

describe("groupFeaturesByCategory", () => {
  it("regroupe les features d'une surface par catégorie", () => {
    const groups = groupFeaturesByCategory("asset");
    const total = Object.values(groups).reduce((n, arr) => n + arr.length, 0);
    expect(total).toBe(getFeaturesBySurface("asset").length);
    for (const arr of Object.values(groups)) {
      const cat = arr[0].category;
      for (const f of arr) expect(f.category).toBe(cat);
    }
  });
});

describe("getDefaultLayout", () => {
  it("retourne les ids visibles par défaut, dans l'ordre canonique", () => {
    const layout = getDefaultLayout("asset");
    expect(Array.isArray(layout)).toBe(true);
    const expected = getFeaturesBySurface("asset")
      .filter((f) => f.defaultVisible)
      .map((f) => f.id);
    expect(layout).toEqual(expected);
  });

  it("n'inclut jamais une feature défaut-masquée", () => {
    const hidden = FEATURE_REGISTRY.filter((f) => !f.defaultVisible).map((f) => f.id);
    const layout = [...getDefaultLayout("asset"), ...getDefaultLayout("dashboard")];
    for (const id of hidden) expect(layout).not.toContain(id);
  });
});
