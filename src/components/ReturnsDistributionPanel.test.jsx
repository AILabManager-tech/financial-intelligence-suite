import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import ReturnsDistributionPanel from "./ReturnsDistributionPanel";

const ASSET = { symbol: "AAPL", name: "Apple" };

// 14 clôtures mensuelles → 13 rendements mensuels, assez pour la distribution.
const POINTS = [
  ["2023-01-31", 100], ["2023-02-28", 104], ["2023-03-31", 101], ["2023-04-30", 106],
  ["2023-05-31", 103], ["2023-06-30", 110], ["2023-07-31", 108], ["2023-08-31", 99],
  ["2023-09-30", 112], ["2023-10-31", 107], ["2023-11-30", 118], ["2023-12-31", 115],
  ["2024-01-31", 120], ["2024-02-29", 113],
].map(([date, close]) => ({ date, close }));

describe("ReturnsDistributionPanel", () => {
  it("affiche la distribution après chargement", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<ReturnsDistributionPanel asset={ASSET} />);

    await waitFor(() => expect(screen.getByText(/mois positifs/i)).toBeInTheDocument());
    expect(screen.getByText(/Meilleur mois/i)).toBeInTheDocument();
    expect(screen.getByText(/Pire mois/i)).toBeInTheDocument();
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", { days: 1825 });
  });

  it("masque et signale quand l'historique est insuffisant", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: [] });
    render(<ReturnsDistributionPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });

  it("gère une erreur réseau sans afficher de valeur inventée", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("boom")));
    render(<ReturnsDistributionPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
    expect(screen.queryByText(/0\.00 %/)).not.toBeInTheDocument();
  });

  it("affiche la mention de factualité (rendements mensuels, hors dividendes)", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<ReturnsDistributionPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/hors dividendes/i)).toBeInTheDocument());
  });
});
