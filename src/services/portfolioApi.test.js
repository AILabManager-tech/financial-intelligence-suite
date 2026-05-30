import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  fetchPortfolioFromApi,
  savePortfolioToApi,
  fetchPortfoliosFromApi,
  savePortfolioMandateToApi,
  deletePortfolioMandateFromApi,
} from "./portfolioApi";

const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const firstUrl = () => globalThis.fetch.mock.calls[0][0];

describe("portfolioApi — scoping par mandat (P3.2c)", () => {
  beforeEach(() => { globalThis.fetch = vi.fn(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it("le mandat default utilise l'endpoint nu", async () => {
    globalThis.fetch.mockReturnValue(ok({ assets: [] }));
    await fetchPortfolioFromApi();
    expect(firstUrl()).toBe("/api/portfolio");
  });

  it("un autre mandat ajoute ?portfolio=", async () => {
    globalThis.fetch.mockReturnValue(ok({ assets: [] }));
    await fetchPortfolioFromApi("client-a");
    expect(firstUrl()).toBe("/api/portfolio?portfolio=client-a");
  });

  it("la sauvegarde scope par mandat", async () => {
    globalThis.fetch.mockReturnValue(ok({ assets: [{ symbol: "AAPL" }] }));
    await savePortfolioToApi([{ symbol: "AAPL" }], "client-a");
    expect(firstUrl()).toBe("/api/portfolio?portfolio=client-a");
    expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({ method: "PUT" });
  });

  it("retourne les actifs normalisés", async () => {
    globalThis.fetch.mockReturnValue(ok({ assets: [{ symbol: "AAPL" }] }));
    expect(await fetchPortfolioFromApi("client-a")).toEqual([{ symbol: "AAPL" }]);
  });

  it("CRUD des mandats", async () => {
    globalThis.fetch.mockReturnValue(ok({ portfolios: [{ id: "default" }] }));
    expect(await fetchPortfoliosFromApi()).toEqual([{ id: "default" }]);
    expect(firstUrl()).toBe("/api/portfolios");

    globalThis.fetch = vi.fn().mockReturnValue(ok({ portfolio: { id: "client-a" } }));
    await savePortfolioMandateToApi({ id: "client-a", name: "A" });
    expect(firstUrl()).toBe("/api/portfolios");
    expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({ method: "POST" });

    globalThis.fetch = vi.fn().mockReturnValue(ok({ removed: true }));
    expect(await deletePortfolioMandateFromApi("client-a")).toBe(true);
    expect(firstUrl()).toBe("/api/portfolios?id=client-a");
    expect(globalThis.fetch.mock.calls[0][1]).toMatchObject({ method: "DELETE" });
  });
});
