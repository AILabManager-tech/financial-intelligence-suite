import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import DemoPortfolioPanel from "./DemoPortfolioPanel";

// Each symbol doubles over the window; SPY only +50%.
const SERIES = {
  AAPL: [{ date: "2020-01-01", close: 100 }, { date: "2021-01-01", close: 200 }],
  MSFT: [{ date: "2020-01-01", close: 50 }, { date: "2021-01-01", close: 100 }],
  SPY: [{ date: "2020-01-01", close: 300 }, { date: "2021-01-01", close: 450 }],
};

describe("DemoPortfolioPanel", () => {
  beforeEach(() => {
    fetchPriceHistory.mockImplementation((symbol) =>
      Promise.resolve({ symbol, source: "Twelve Data", points: SERIES[symbol] ?? [] }),
    );
  });
  afterEach(() => vi.clearAllMocks());

  it("affiche en permanence le bandeau « pas un conseil »", () => {
    render(<DemoPortfolioPanel />);
    expect(screen.getByText(/Ne constitue pas un conseil financier/i)).toBeInTheDocument();
  });

  it("simule un portefeuille multi-positions et le compare au benchmark", async () => {
    render(<DemoPortfolioPanel />);
    fireEvent.change(screen.getByLabelText("Date de départ"), { target: { value: "2020-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Simuler le portefeuille/ }));

    await waitFor(() => expect(screen.getByText("Valeur aujourd'hui")).toBeInTheDocument());
    // 10000 AAPL -> 20000 ; 10000 MSFT -> 20000 ; total investi 20000 -> 40000 (+100%)
    // "+100.0%" apparaît au KPI rendement ET sur chaque ligne de position (toutes ont doublé)
    expect(screen.getAllByText(/\+100\.0%/).length).toBeGreaterThanOrEqual(3);
    // benchmark SPY +50% -> excès +50 pts (unique)
    expect(screen.getByText(/vs SPY/)).toBeInTheDocument();
    expect(screen.getByText(/\+50\.0 pts/)).toBeInTheDocument();
    // tableau par position
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText("MSFT")).toBeInTheDocument();
  });

  it("permet d'ajouter et retirer des positions", () => {
    render(<DemoPortfolioPanel />);
    expect(screen.getByLabelText("Symbole position 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Symbole position 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Ajouter une position/ }));
    expect(screen.getByLabelText("Symbole position 3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retirer la position 3" }));
    expect(screen.queryByLabelText("Symbole position 3")).toBeNull();
  });

  it("signale l'absence de position valide sans appeler l'historique", () => {
    render(<DemoPortfolioPanel />);
    fireEvent.change(screen.getByLabelText("Symbole position 1"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Symbole position 2"), { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Simuler le portefeuille/ }));
    expect(screen.getByText(/au moins une position valide/)).toBeInTheDocument();
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });
});
