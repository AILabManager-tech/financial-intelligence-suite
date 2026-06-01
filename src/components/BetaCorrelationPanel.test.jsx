import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BetaCorrelationPanel from "./BetaCorrelationPanel";

vi.mock("../services/priceHistory", () => ({ fetchPriceHistory: vi.fn() }));
const { fetchPriceHistory } = await import("../services/priceHistory");

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}
const SNAPS = [snap("2026-05-01", 1000), snap("2026-05-02", 1200), snap("2026-05-03", 960), snap("2026-05-04", 1152)];
const BENCH = [
  { date: "2026-05-01", close: 100 },
  { date: "2026-05-02", close: 110 },
  { date: "2026-05-03", close: 99 },
  { date: "2026-05-04", close: 108.9 },
];

describe("BetaCorrelationPanel", () => {
  it("affiche beta, corrélation et R² après chargement", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "SPY", points: BENCH });
    render(<BetaCorrelationPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText("Beta")).toBeInTheDocument());
    expect(screen.getByText("2.00")).toBeInTheDocument(); // beta exact
    expect(screen.getByText("Corrélation")).toBeInTheDocument();
  });

  it("montre une erreur si le benchmark ne charge pas", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("HTTP 502")));
    render(<BetaCorrelationPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText(/Benchmark indisponible/i)).toBeInTheDocument());
  });

  it("signale une série commune insuffisante", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "SPY", points: [{ date: "2026-05-01", close: 100 }] });
    render(<BetaCorrelationPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    await waitFor(() => expect(screen.getByText(/insuffisante pour régresser/i)).toBeInTheDocument());
  });
});
