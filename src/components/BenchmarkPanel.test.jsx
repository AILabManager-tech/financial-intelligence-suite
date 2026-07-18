import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BenchmarkPanel from "./BenchmarkPanel";

vi.mock("../services/priceHistory", () => ({ fetchPriceHistory: vi.fn() }));
const { fetchPriceHistory } = await import("../services/priceHistory");

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}
const SNAPS = [snap("2026-05-01", 1000), snap("2026-05-02", 1100), snap("2026-05-03", 1045)];

// NB: mockReset en tête de chaque test (pas via beforeEach) — un mockReset en
// beforeEach amène le détecteur de rejets non gérés de vitest à mal attribuer le
// rejet (pourtant capté par le .catch du panneau) au test réseau.
describe("BenchmarkPanel", () => {
  it("affiche le chargement puis la comparaison portefeuille/benchmark/excès", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({
      symbol: "SPY",
      points: [
        { date: "2026-05-01", close: 100 },
        { date: "2026-05-03", close: 103 },
      ],
    });
    render(<BenchmarkPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText("Portefeuille (TWR)")).toBeInTheDocument());
    expect(screen.getByText("+4.50 %")).toBeInTheDocument(); // portefeuille
    expect(screen.getByText("+3.00 %")).toBeInTheDocument(); // benchmark
    expect(screen.getByText("+1.50 %")).toBeInTheDocument(); // excès
  });

  it("attribue la source du prix benchmark quand elle est fournie", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({
      symbol: "SPY",
      source: "twelvedata.com",
      fetchedAt: "2026-07-17T12:00:00Z",
      points: [
        { date: "2026-05-01", close: 100 },
        { date: "2026-05-03", close: 103 },
      ],
    });
    render(<BenchmarkPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText("twelvedata.com")).toBeInTheDocument());
    expect(screen.getByText(/Prix S&P 500/)).toBeInTheDocument();
  });

  it("montre une erreur si le benchmark ne se charge pas", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("HTTP 502")));
    render(<BenchmarkPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText(/Benchmark indisponible/i)).toBeInTheDocument());
  });

  it("signale une série de portefeuille insuffisante", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "SPY", points: [{ date: "2026-05-01", close: 100 }] });
    render(<BenchmarkPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    await waitFor(() => expect(screen.getByText(/insuffisante pour comparer/i)).toBeInTheDocument());
  });
});
