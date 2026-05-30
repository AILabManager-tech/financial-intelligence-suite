import { describe, it, expect } from "vitest";
import { optimizeSurface, optimizeLayout } from "./layoutEngine";
import { getDefaultLayout, setFeatureVisibility, setFeatureColumns } from "../services/layoutStore";
import { getFeatureById } from "./featureRegistry";

function categoriesOf(entries) {
  return entries.map((e) => getFeatureById(e.id).category);
}

describe("layoutEngine — optimizeSurface", () => {
  it("place les catégories de pilotage (overview) avant le documentaire", () => {
    const dashboard = getDefaultLayout().dashboard;
    const optimized = optimizeSurface(dashboard);
    const cats = categoriesOf(optimized);
    const firstOverview = cats.indexOf("overview");
    const firstMonitoring = cats.indexOf("monitoring");
    expect(firstOverview).toBeGreaterThanOrEqual(0);
    expect(firstOverview).toBeLessThan(firstMonitoring);
  });

  it("regroupe risk-command-center (overview) avec les autres KPI en haut du dashboard", () => {
    const optimized = optimizeSurface(getDefaultLayout().dashboard);
    const ids = optimized.map((e) => e.id);
    // les 3 panneaux overview se suivent en tête
    expect(ids.slice(0, 3).sort()).toEqual(["risk-command-center", "safety-badge", "top-performers"].sort());
  });

  it("place les dépôts SEC (documents) en dernier sur la fiche actif", () => {
    const optimized = optimizeSurface(getDefaultLayout().asset);
    expect(optimized.at(-1).id).toBe("sec-filings");
  });

  it("préserve la visibilité et le colonnage de chaque entrée", () => {
    let layout = getDefaultLayout();
    layout = setFeatureVisibility(layout, "asset", "sec-filings", false);
    layout = setFeatureColumns(layout, "asset", "fundamentals", 2);
    const optimized = optimizeSurface(layout.asset);
    expect(optimized.find((e) => e.id === "sec-filings").visible).toBe(false);
    expect(optimized.find((e) => e.id === "fundamentals").columns).toBe(2);
    // même ensemble d'ids, juste réordonné
    expect(optimized.map((e) => e.id).sort()).toEqual(layout.asset.map((e) => e.id).sort());
  });

  it("est idempotent", () => {
    const once = optimizeSurface(getDefaultLayout().dashboard);
    const twice = optimizeSurface(once);
    expect(twice).toEqual(once);
  });

  it("tolère un tableau vide / non-tableau", () => {
    expect(optimizeSurface([])).toEqual([]);
    expect(optimizeSurface(undefined)).toEqual([]);
  });
});

describe("layoutEngine — optimizeLayout", () => {
  it("optimise les deux surfaces", () => {
    const optimized = optimizeLayout(getDefaultLayout());
    expect(optimized.asset.at(-1).id).toBe("sec-filings");
    expect(categoriesOf(optimized.dashboard).indexOf("overview")).toBe(0);
  });

  it("ne perd aucune feature", () => {
    const base = getDefaultLayout();
    const optimized = optimizeLayout(base);
    for (const surface of ["asset", "dashboard"]) {
      expect(optimized[surface].map((e) => e.id).sort()).toEqual(base[surface].map((e) => e.id).sort());
    }
  });
});
