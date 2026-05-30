import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import ReturnsMatrixPanel from "./ReturnsMatrixPanel";

const ASSET = { symbol: "AAPL", name: "Apple" };

// ~14 mois, +13 % cumulé (100 -> 113).
const POINTS = [
  ["2023-01-31", 100], ["2023-02-28", 101], ["2023-03-31", 102], ["2023-04-30", 103],
  ["2023-05-31", 104], ["2023-06-30", 105], ["2023-07-31", 106], ["2023-08-31", 107],
  ["2023-09-30", 108], ["2023-10-31", 109], ["2023-11-30", 110], ["2023-12-31", 111],
  ["2024-01-31", 112], ["2024-02-29", 113],
].map(([date, close]) => ({ date, close }));

// NB: on réinitialise le mock en tête de chaque test (et non via beforeEach) —
// un `mockReset` en beforeEach amène le détecteur de rejets non gérés de vitest à
// mal attribuer le rejet (pourtant capté par le .catch du panneau) au test réseau.
describe("ReturnsMatrixPanel", () => {
  it("affiche la matrice de rendements après chargement", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<ReturnsMatrixPanel asset={ASSET} />);

    await waitFor(() => expect(screen.getByText(/Rendement cumulé/i)).toBeInTheDocument());
    // inception = +13.00 % ; le panneau l'affiche.
    expect(screen.getAllByText(/\+13\.00 %/).length).toBeGreaterThan(0);
    // période 3 ans masquée (hors données) ⇒ rendu en tiret, pas en 0.
    expect(screen.getByText("3 ans").parentElement).toHaveTextContent("—");
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", { days: 1825 });
  });

  it("masque tout et signale quand l'historique est insuffisant", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: [] });
    render(<ReturnsMatrixPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });

  it("gère une erreur réseau sans afficher de valeur inventée", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("boom")));
    render(<ReturnsMatrixPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
    expect(screen.queryByText(/0\.00 %/)).not.toBeInTheDocument();
  });

  it("affiche la mention de factualité (rendements de prix, hors dividendes)", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<ReturnsMatrixPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/hors dividendes/i)).toBeInTheDocument());
  });
});
