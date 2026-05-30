import { describe, it, expect } from "vitest";
import {
  BUILTIN_PROFILES,
  buildLayoutFromProfile,
  getBuiltinProfile,
} from "./layoutProfiles";
import { getFeaturesBySurface } from "./featureRegistry";
import { getDefaultLayout, getVisibleFeatureIds } from "../services/layoutStore";

const ASSET_COUNT = getFeaturesBySurface("asset").length;
const DASH_COUNT = getFeaturesBySurface("dashboard").length;

describe("layoutProfiles — définitions", () => {
  it("expose des profils avec id et label uniques", () => {
    expect(BUILTIN_PROFILES.length).toBeGreaterThanOrEqual(4);
    const ids = BUILTIN_PROFILES.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of BUILTIN_PROFILES) {
      expect(typeof p.label).toBe("string");
      expect(p.label.length).toBeGreaterThan(0);
    }
  });

  it("ne référence que des ids de feature existants", () => {
    const known = new Set([
      ...getFeaturesBySurface("asset").map((f) => f.id),
      ...getFeaturesBySurface("dashboard").map((f) => f.id),
    ]);
    for (const p of BUILTIN_PROFILES) {
      if (!p.surfaces) continue;
      for (const surface of ["asset", "dashboard"]) {
        for (const id of p.surfaces[surface] ?? []) {
          expect(known.has(id)).toBe(true);
        }
      }
    }
  });
});

describe("buildLayoutFromProfile", () => {
  it("profil 'overview' == layout par défaut (tout visible, ordre canonique)", () => {
    expect(buildLayoutFromProfile(getBuiltinProfile("overview"))).toEqual(getDefaultLayout());
  });

  it("inclut TOUTES les features de chaque surface (listées visibles + reste masqué)", () => {
    const layout = buildLayoutFromProfile(getBuiltinProfile("value"));
    expect(layout.asset.length).toBe(ASSET_COUNT);
    expect(layout.dashboard.length).toBe(DASH_COUNT);
  });

  it("rend visibles exactement les ids listés, dans l'ordre du profil", () => {
    const value = getBuiltinProfile("value");
    const layout = buildLayoutFromProfile(value);
    expect(getVisibleFeatureIds(layout, "asset")).toEqual(value.surfaces.asset);
    expect(getVisibleFeatureIds(layout, "dashboard")).toEqual(value.surfaces.dashboard);
  });

  it("masque les features non listées par le profil", () => {
    const trader = getBuiltinProfile("trader");
    const layout = buildLayoutFromProfile(trader);
    const hiddenAsset = layout.asset.filter((e) => !e.visible).map((e) => e.id);
    for (const id of hiddenAsset) {
      expect(trader.surfaces.asset).not.toContain(id);
    }
  });

  it("colonnage par défaut = 1 pour toutes les entrées", () => {
    const layout = buildLayoutFromProfile(getBuiltinProfile("advisor"));
    for (const surface of ["asset", "dashboard"]) {
      for (const entry of layout[surface]) expect(entry.columns).toBe(1);
    }
  });
});
