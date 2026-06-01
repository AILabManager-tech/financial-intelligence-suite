import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BenchmarkRatiosPanel from "./BenchmarkRatiosPanel";

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

describe("BenchmarkRatiosPanel", () => {
  it("affiche les ratios étendus et l'hypothèse de taux sans risque", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "SPY", points: BENCH });
    render(<BenchmarkRatiosPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText("Alpha (Jensen)")).toBeInTheDocument());
    expect(screen.getByText("Information ratio")).toBeInTheDocument();
    expect(screen.getByText("Up capture")).toBeInTheDocument();
    expect(screen.getByText(/taux sans risque supposé 0 %/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("montre une erreur si le benchmark ne charge pas", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("HTTP 502")));
    render(<BenchmarkRatiosPanel snapshots={SNAPS} transactions={[]} />);
    await waitFor(() => expect(screen.getByText(/Benchmark indisponible/i)).toBeInTheDocument());
  });
});
