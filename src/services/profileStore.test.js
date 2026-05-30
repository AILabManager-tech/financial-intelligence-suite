import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  loadProfiles,
  saveProfiles,
  makeProfileId,
  addProfile,
  removeProfile,
  profileSurfacesFromLayout,
} from "./profileStore";
import { getDefaultLayout, setFeatureVisibility, getVisibleFeatureIds } from "./layoutStore";
import { getFeaturesBySurface } from "../core/featureRegistry";

const SAMPLE = { asset: ["fundamentals"], dashboard: ["top-performers"] };

describe("profileStore — load/save", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("retourne une liste vide quand rien n'est stocké", () => {
    expect(loadProfiles()).toEqual([]);
  });

  it("round-trip une liste de profils", () => {
    const profiles = [{ id: "custom-x", name: "X", surfaces: SAMPLE }];
    saveProfiles(profiles);
    expect(loadProfiles()).toEqual(profiles);
  });

  it("efface l'entrée quand la liste est vide", () => {
    saveProfiles([{ id: "custom-x", name: "X", surfaces: SAMPLE }]);
    expect(localStorage.getItem("fis:profiles:v1")).not.toBeNull();
    saveProfiles([]);
    expect(localStorage.getItem("fis:profiles:v1")).toBeNull();
  });

  it("écarte les entrées corrompues au chargement", () => {
    localStorage.setItem("fis:profiles:v1", JSON.stringify([{ id: "ok", name: "ok", surfaces: SAMPLE }, { bad: true }]));
    expect(loadProfiles()).toHaveLength(1);
  });

  it("récupère gracieusement sur JSON corrompu", () => {
    localStorage.setItem("fis:profiles:v1", "{pas json");
    expect(loadProfiles()).toEqual([]);
  });
});

describe("profileStore — mutateurs purs", () => {
  it("makeProfileId slugifie et évite les collisions", () => {
    expect(makeProfileId("Mon Profil")).toBe("custom-mon-profil");
    const existing = [{ id: "custom-mon-profil" }];
    expect(makeProfileId("Mon Profil", existing)).toBe("custom-mon-profil-2");
  });

  it("makeProfileId retombe sur 'profil' si le nom est vide après slug", () => {
    expect(makeProfileId("!!!")).toBe("custom-profil");
  });

  it("addProfile ajoute un profil nommé, ignore un nom vide", () => {
    const after = addProfile([], "Test", SAMPLE);
    expect(after).toHaveLength(1);
    expect(after[0]).toMatchObject({ name: "Test", surfaces: SAMPLE });
    expect(addProfile([], "   ", SAMPLE)).toHaveLength(0);
  });

  it("removeProfile retire par id", () => {
    const list = [{ id: "a", name: "A", surfaces: SAMPLE }, { id: "b", name: "B", surfaces: SAMPLE }];
    expect(removeProfile(list, "a").map((p) => p.id)).toEqual(["b"]);
  });
});

describe("profileSurfacesFromLayout", () => {
  it("capture les ids visibles par surface dans l'ordre", () => {
    const assetIds = getFeaturesBySurface("asset").map((f) => f.id);
    let layout = getDefaultLayout();
    layout = setFeatureVisibility(layout, "asset", assetIds[0], false);
    const surfaces = profileSurfacesFromLayout(layout);
    expect(surfaces.asset).toEqual(getVisibleFeatureIds(layout, "asset"));
    expect(surfaces.asset).not.toContain(assetIds[0]);
  });
});
