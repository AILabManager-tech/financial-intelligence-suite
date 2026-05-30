import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  LAYOUT_KEY,
  LAYOUT_VERSION,
  VALID_COLUMNS,
  DEFAULT_COLUMNS,
  isValidColumns,
  getDefaultSurfaceLayout,
  getDefaultLayout,
  loadLayout,
  saveLayout,
  resetLayout,
  setFeatureVisibility,
  setFeatureColumns,
  moveFeature,
  getVisibleFeatureIds,
} from "./layoutStore";
import { getFeaturesBySurface } from "../core/featureRegistry";

const ASSET_IDS = getFeaturesBySurface("asset").map((f) => f.id);
const DASH_IDS = getFeaturesBySurface("dashboard").map((f) => f.id);

describe("layoutStore — constantes", () => {
  it("expose la clé versionnée et le colonnage valide", () => {
    expect(LAYOUT_KEY).toBe("fis:layout:v1");
    expect(LAYOUT_VERSION).toBe(1);
    expect(VALID_COLUMNS).toEqual([1, 2]);
    expect(DEFAULT_COLUMNS).toBe(1);
  });

  it("isValidColumns n'accepte que 1 ou 2", () => {
    expect(isValidColumns(1)).toBe(true);
    expect(isValidColumns(2)).toBe(true);
    expect(isValidColumns(0)).toBe(false);
    expect(isValidColumns(3)).toBe(false);
    expect(isValidColumns("1")).toBe(false);
    expect(isValidColumns(null)).toBe(false);
  });
});

describe("layoutStore — défaut dérivé du registre (zéro régression)", () => {
  it("getDefaultSurfaceLayout liste TOUTES les features de la surface, ordre canonique", () => {
    const asset = getDefaultSurfaceLayout("asset");
    expect(asset.map((e) => e.id)).toEqual(ASSET_IDS);
    for (const entry of asset) {
      expect(entry.visible).toBe(true);
      expect(entry.columns).toBe(DEFAULT_COLUMNS);
    }
  });

  it("getDefaultLayout renvoie les deux surfaces", () => {
    const layout = getDefaultLayout();
    expect(layout.asset.map((e) => e.id)).toEqual(ASSET_IDS);
    expect(layout.dashboard.map((e) => e.id)).toEqual(DASH_IDS);
  });

  it("getDefaultSurfaceLayout renvoie un tableau vide pour une surface inconnue", () => {
    expect(getDefaultSurfaceLayout("nope")).toEqual([]);
  });
});

describe("layoutStore — load/save/reset", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("retourne le défaut quand rien n'est stocké", () => {
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("round-trip une préférence modifiée via localStorage", () => {
    const layout = setFeatureVisibility(getDefaultLayout(), "asset", ASSET_IDS[0], false);
    saveLayout(layout);
    expect(loadLayout()).toEqual(layout);
  });

  it("supprime l'entrée quand le layout égale le défaut", () => {
    const layout = setFeatureVisibility(getDefaultLayout(), "asset", ASSET_IDS[0], false);
    saveLayout(layout);
    expect(localStorage.getItem(LAYOUT_KEY)).not.toBeNull();
    saveLayout(getDefaultLayout());
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
  });

  it("resetLayout efface l'entrée et reload renvoie le défaut", () => {
    saveLayout(setFeatureColumns(getDefaultLayout(), "dashboard", DASH_IDS[0], 2));
    resetLayout();
    expect(localStorage.getItem(LAYOUT_KEY)).toBeNull();
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("récupère gracieusement sur données corrompues", () => {
    localStorage.setItem(LAYOUT_KEY, "{ pas du json");
    expect(loadLayout()).toEqual(getDefaultLayout());
  });

  it("ignore une version inconnue et retombe sur le défaut", () => {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify({ version: 999, surfaces: { asset: [], dashboard: [] } }));
    expect(loadLayout()).toEqual(getDefaultLayout());
  });
});

describe("layoutStore — réconciliation contre le registre", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("écarte un id stocké qui n'existe plus dans le registre", () => {
    const stored = {
      version: LAYOUT_VERSION,
      surfaces: {
        asset: [{ id: "feature-fantome", visible: true, columns: 1 }, ...getDefaultSurfaceLayout("asset")],
        dashboard: getDefaultSurfaceLayout("dashboard"),
      },
    };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(stored));
    const loaded = loadLayout();
    expect(loaded.asset.map((e) => e.id)).toEqual(ASSET_IDS);
  });

  it("ajoute en fin une feature du registre absente du layout stocké, à ses valeurs par défaut", () => {
    // layout stocké = défaut amputé de la dernière feature asset
    const partial = getDefaultSurfaceLayout("asset").slice(0, -1);
    const stored = {
      version: LAYOUT_VERSION,
      surfaces: { asset: partial, dashboard: getDefaultSurfaceLayout("dashboard") },
    };
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(stored));
    const loaded = loadLayout();
    const missingId = ASSET_IDS[ASSET_IDS.length - 1];
    expect(loaded.asset.map((e) => e.id)).toContain(missingId);
    const appended = loaded.asset.find((e) => e.id === missingId);
    expect(appended).toEqual({ id: missingId, visible: true, columns: DEFAULT_COLUMNS });
  });

  it("préserve l'ordre, la visibilité et le colonnage choisis par l'utilisateur", () => {
    let layout = getDefaultLayout();
    layout = setFeatureVisibility(layout, "asset", ASSET_IDS[1], false);
    layout = setFeatureColumns(layout, "asset", ASSET_IDS[0], 2);
    layout = moveFeature(layout, "asset", 0, 2);
    saveLayout(layout);
    expect(loadLayout()).toEqual(layout);
  });

  it("assainit un colonnage invalide stocké vers le défaut", () => {
    const surfaced = getDefaultSurfaceLayout("asset").map((e) => ({ ...e, columns: 7 }));
    localStorage.setItem(
      LAYOUT_KEY,
      JSON.stringify({ version: LAYOUT_VERSION, surfaces: { asset: surfaced, dashboard: getDefaultSurfaceLayout("dashboard") } }),
    );
    for (const entry of loadLayout().asset) {
      expect(entry.columns).toBe(DEFAULT_COLUMNS);
    }
  });
});

describe("layoutStore — mutateurs purs (immuables)", () => {
  it("setFeatureVisibility bascule sans muter l'original", () => {
    const base = getDefaultLayout();
    const next = setFeatureVisibility(base, "asset", ASSET_IDS[0], false);
    expect(next.asset.find((e) => e.id === ASSET_IDS[0]).visible).toBe(false);
    expect(base.asset.find((e) => e.id === ASSET_IDS[0]).visible).toBe(true);
    expect(next).not.toBe(base);
  });

  it("setFeatureColumns ignore une valeur invalide", () => {
    const base = getDefaultLayout();
    const next = setFeatureColumns(base, "asset", ASSET_IDS[0], 5);
    expect(next.asset.find((e) => e.id === ASSET_IDS[0]).columns).toBe(DEFAULT_COLUMNS);
  });

  it("setFeatureColumns applique 2 colonnes", () => {
    const next = setFeatureColumns(getDefaultLayout(), "asset", ASSET_IDS[0], 2);
    expect(next.asset.find((e) => e.id === ASSET_IDS[0]).columns).toBe(2);
  });

  it("moveFeature réordonne sans muter l'original", () => {
    const base = getDefaultLayout();
    const next = moveFeature(base, "asset", 0, 2);
    expect(next.asset[2].id).toBe(ASSET_IDS[0]);
    expect(base.asset[0].id).toBe(ASSET_IDS[0]);
  });

  it("moveFeature borne les index hors plage sans crasher", () => {
    const base = getDefaultLayout();
    expect(moveFeature(base, "asset", 0, 999).asset.length).toBe(ASSET_IDS.length);
    expect(moveFeature(base, "asset", -1, 0)).toEqual(base);
  });

  it("un mutateur sur un id/surface inconnu renvoie le layout inchangé", () => {
    const base = getDefaultLayout();
    expect(setFeatureVisibility(base, "asset", "inconnu", false)).toEqual(base);
    expect(setFeatureColumns(base, "nope", ASSET_IDS[0], 2)).toEqual(base);
  });
});

describe("layoutStore — getVisibleFeatureIds (consommé par le rendu P0.3)", () => {
  it("ne renvoie que les ids visibles, dans l'ordre du layout", () => {
    let layout = getDefaultLayout();
    layout = setFeatureVisibility(layout, "asset", ASSET_IDS[0], false);
    const visible = getVisibleFeatureIds(layout, "asset");
    expect(visible).not.toContain(ASSET_IDS[0]);
    expect(visible).toEqual(ASSET_IDS.slice(1));
  });

  it("renvoie un tableau vide pour une surface inconnue", () => {
    expect(getVisibleFeatureIds(getDefaultLayout(), "nope")).toEqual([]);
  });
});

describe("layoutStore — robustesse localStorage", () => {
  it("saveLayout ne jette pas si localStorage est indisponible", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new Error("private browsing");
      },
    });
    expect(() => saveLayout(getDefaultLayout())).not.toThrow();
    expect(() => loadLayout()).not.toThrow();
    if (original) Object.defineProperty(globalThis, "localStorage", original);
  });
});
