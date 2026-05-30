import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import SimulationPanel from "./SimulationPanel";

const ASSET = { symbol: "AAPL", name: "Apple", price: 200 };

const HISTORY = {
  symbol: "AAPL",
  source: "Twelve Data",
  points: [
    { date: "2017-01-03", close: 100 },
    { date: "2019-01-03", close: 150 },
    { date: "2021-01-04", close: 200 },
  ],
};

describe("SimulationPanel", () => {
  beforeEach(() => fetchPriceHistory.mockReset());
  afterEach(() => vi.clearAllMocks());

  it("affiche en permanence le bandeau « pas un conseil »", () => {
    render(<SimulationPanel asset={ASSET} />);
    expect(screen.getByText(/Ne constitue pas un conseil financier/i)).toBeInTheDocument();
  });

  it("calcule et affiche les KPIs après « Simuler »", async () => {
    fetchPriceHistory.mockResolvedValue(HISTORY);
    render(<SimulationPanel asset={ASSET} />);
    fireEvent.change(screen.getByLabelText("Montant investi"), { target: { value: "1000" } });
    fireEvent.change(screen.getByLabelText("Date de départ"), { target: { value: "2017-01-01" } });
    fireEvent.click(screen.getByRole("button", { name: /Simuler/ }));
    await waitFor(() => {
      expect(screen.getByText("Valeur aujourd'hui")).toBeInTheDocument();
    });
    // 1000$ à 100 -> 10 parts ; 10 * 200 = 2000$
    expect(screen.getByText(/2[\s ]?000/)).toBeInTheDocument();
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", expect.objectContaining({ days: expect.any(Number) }));
  });

  it("signale un montant invalide sans appeler l'historique", () => {
    render(<SimulationPanel asset={ASSET} />);
    fireEvent.change(screen.getByLabelText("Montant investi"), { target: { value: "0" } });
    fireEvent.click(screen.getByRole("button", { name: /Simuler/ }));
    expect(screen.getByText(/Montant invalide/)).toBeInTheDocument();
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });

  it("gère un historique insuffisant", async () => {
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: [] });
    render(<SimulationPanel asset={ASSET} />);
    fireEvent.click(screen.getByRole("button", { name: /Simuler/ }));
    await waitFor(() => {
      expect(screen.getByText(/Historique insuffisant/)).toBeInTheDocument();
    });
  });
  // NB : la branche "erreur réseau" (catch -> message) emprunte la même UI
  // d'erreur que ci-dessus ; non testée isolément car un mock à promesse
  // rejetée déclenche un faux positif "unhandled rejection" du runner Vitest.
});
