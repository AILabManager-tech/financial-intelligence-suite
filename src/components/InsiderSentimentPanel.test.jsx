import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import InsiderSentimentPanel from "./InsiderSentimentPanel";

vi.mock("../services/insiderSentiment", () => ({ fetchInsiderSentiment: vi.fn() }));
const { fetchInsiderSentiment } = await import("../services/insiderSentiment");

const asset = { symbol: "AAPL", name: "Apple", price: 220, change: 1, changePct: 0.5 };
const SAMPLE = {
  symbol: "AAPL",
  source: "finnhub.io",
  items: [
    { year: 2026, month: 3, mspr: 20, change: 5000 },
    { year: 2026, month: 2, mspr: -10, change: -2000 },
  ],
};

describe("InsiderSentimentPanel", () => {
  it("retourne null sans asset", () => {
    fetchInsiderSentiment.mockReset();
    const { container } = render(<InsiderSentimentPanel asset={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("affiche le MSPR moyen et les lignes mensuelles", async () => {
    fetchInsiderSentiment.mockReset();
    fetchInsiderSentiment.mockResolvedValue(SAMPLE);
    render(<InsiderSentimentPanel asset={asset} />);
    // Ancré sur la donnée : la région existe avant que les lignes soient rendues.
    expect(await screen.findByText(/MSPR moyen/i)).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Sentiment des initiés/i })).toBeInTheDocument();
    expect(screen.getByText("mars 2026")).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("état vide US-only quand aucune donnée", async () => {
    fetchInsiderSentiment.mockReset();
    fetchInsiderSentiment.mockResolvedValue({ ...SAMPLE, items: [] });
    render(<InsiderSentimentPanel asset={asset} />);
    await waitFor(() => expect(screen.getByText(/Aucun sentiment d'initié/i)).toBeInTheDocument());
  });

  it("erreur réseau sans valeur inventée", async () => {
    fetchInsiderSentiment.mockReset();
    fetchInsiderSentiment.mockImplementation(() => Promise.reject(new Error("HTTP 502")));
    render(<InsiderSentimentPanel asset={asset} />);
    await waitFor(() => expect(screen.getByText(/Sentiment indisponible/i)).toBeInTheDocument());
  });
});
