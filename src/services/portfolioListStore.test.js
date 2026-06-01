import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  DEFAULT_PORTFOLIO_ID,
  defaultPortfolioState,
  loadPortfolioList,
  savePortfolioList,
  makePortfolioId,
  createPortfolio,
  updatePortfolio,
  removePortfolio,
  setActivePortfolio,
  getActivePortfolio,
} from "./portfolioListStore";

describe("portfolioListStore — load/save", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("retourne un mandat par défaut quand rien n'est stocké", () => {
    const state = loadPortfolioList();
    expect(state.activeId).toBe(DEFAULT_PORTFOLIO_ID);
    expect(state.portfolios).toHaveLength(1);
    expect(state.portfolios[0].baseCurrency).toBe("USD");
  });

  it("round-trip un état", () => {
    const state = createPortfolio(defaultPortfolioState(), { name: "Client A", client: "A inc.", baseCurrency: "cad" });
    savePortfolioList(state);
    const loaded = loadPortfolioList();
    expect(loaded.portfolios).toHaveLength(2);
    expect(loaded.portfolios[1].baseCurrency).toBe("CAD"); // normalisé en majuscules
    expect(loaded.activeId).toBe(loaded.portfolios[1].id);
  });

  it("défaut le type de compte à 'taxable' et valide les valeurs connues", () => {
    expect(defaultPortfolioState().portfolios[0].accountType).toBe("taxable");
    const rrsp = createPortfolio(defaultPortfolioState(), { name: "REER", accountType: "rrsp" });
    expect(rrsp.portfolios[1].accountType).toBe("rrsp");
    const bogus = createPortfolio(defaultPortfolioState(), { name: "X", accountType: "bogus" });
    expect(bogus.portfolios[1].accountType).toBe("taxable"); // valeur inconnue → défaut
  });

  it("récupère sur JSON corrompu / activeId invalide", () => {
    localStorage.setItem("fis:portfolios:v1", "{cassé");
    expect(loadPortfolioList()).toEqual(defaultPortfolioState());
    localStorage.setItem("fis:portfolios:v1", JSON.stringify({ activeId: "fantome", portfolios: [{ id: "x", name: "X" }] }));
    expect(loadPortfolioList().activeId).toBe("x");
  });
});

describe("portfolioListStore — mutateurs purs", () => {
  it("makePortfolioId slugifie et évite les collisions", () => {
    expect(makePortfolioId("Client Beaumont")).toBe("client-beaumont");
    expect(makePortfolioId("Client Beaumont", [{ id: "client-beaumont" }])).toBe("client-beaumont-2");
  });

  it("createPortfolio ajoute et active le nouveau mandat ; ignore un nom vide", () => {
    const s = createPortfolio(defaultPortfolioState(), { name: "Mandat B" });
    expect(s.portfolios).toHaveLength(2);
    expect(getActivePortfolio(s).name).toBe("Mandat B");
    expect(createPortfolio(defaultPortfolioState(), { name: "  " }).portfolios).toHaveLength(1);
  });

  it("updatePortfolio modifie les champs sans changer l'id", () => {
    let s = createPortfolio(defaultPortfolioState(), { name: "X" });
    const id = s.activeId;
    s = updatePortfolio(s, id, { name: "X renommé", client: "Client X" });
    const m = s.portfolios.find((p) => p.id === id);
    expect(m.name).toBe("X renommé");
    expect(m.client).toBe("Client X");
    expect(m.id).toBe(id);
  });

  it("removePortfolio retire, ne supprime jamais le dernier, réassigne l'actif", () => {
    let s = createPortfolio(defaultPortfolioState(), { name: "X" }); // actif = X
    const xId = s.activeId;
    s = removePortfolio(s, xId);
    expect(s.portfolios).toHaveLength(1);
    expect(s.activeId).toBe(DEFAULT_PORTFOLIO_ID); // réassigné
    expect(removePortfolio(s, DEFAULT_PORTFOLIO_ID).portfolios).toHaveLength(1); // dernier protégé
  });

  it("setActivePortfolio ne bascule que vers un mandat connu", () => {
    const s = createPortfolio(defaultPortfolioState(), { name: "X" });
    expect(setActivePortfolio(s, DEFAULT_PORTFOLIO_ID).activeId).toBe(DEFAULT_PORTFOLIO_ID);
    expect(setActivePortfolio(s, "inconnu").activeId).toBe(s.activeId);
  });
});
