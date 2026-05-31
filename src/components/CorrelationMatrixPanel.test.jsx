import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import CorrelationMatrixPanel from "./CorrelationMatrixPanel";

// 8 monthly closes → 7 monthly returns (≥ the default 6-month overlap).
function points(closes) {
  return closes.map((close, i) => ({
    date: `2024-${String(i + 1).padStart(2, "0")}-15`,
    close,
  }));
}

const AAPL_CLOSES = [100, 110, 104.5, 120, 114, 130, 122, 140];
// Proportional series → identical monthly returns → correlation ≈ 1.
const MSFT_CLOSES = AAPL_CLOSES.map((c) => c * 0.5);

function mockBySymbol(map) {
  fetchPriceHistory.mockReset();
  fetchPriceHistory.mockImplementation((symbol) => {
    const entry = map[symbol];
    if (!entry) return Promise.reject(new Error(`no data for ${symbol}`));
    if (entry instanceof Error) return Promise.reject(entry);
    return Promise.resolve({ symbol, source: "Twelve Data", points: entry });
  });
}

describe("CorrelationMatrixPanel", () => {
  it("renders the correlation matrix once the histories load", async () => {
    mockBySymbol({ AAPL: points(AAPL_CLOSES), MSFT: points(MSFT_CLOSES) });
    render(<CorrelationMatrixPanel assets={[{ symbol: "AAPL" }, { symbol: "MSFT" }]} />);

    await waitFor(() => expect(screen.getByText(/corrélation moyenne/i)).toBeInTheDocument());
    // Both symbols labelled in the grid (header + row label = 2 nodes each).
    expect(screen.getAllByText("AAPL").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("MSFT").length).toBeGreaterThanOrEqual(1);
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", { days: 1825 });
    expect(fetchPriceHistory).toHaveBeenCalledWith("MSFT", { days: 1825 });
  });

  it("shows an honest empty state and fetches nothing with fewer than two positions", () => {
    fetchPriceHistory.mockReset();
    render(<CorrelationMatrixPanel assets={[{ symbol: "AAPL" }]} />);
    expect(screen.getByText(/au moins deux positions/i)).toBeInTheDocument();
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });

  it("degrades gracefully when the histories cannot be fetched", async () => {
    mockBySymbol({ AAPL: new Error("boom"), MSFT: new Error("boom") });
    render(<CorrelationMatrixPanel assets={[{ symbol: "AAPL" }, { symbol: "MSFT" }]} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });

  it("carries the factual disclaimer (Pearson, monthly, ex-dividends, not advice)", async () => {
    mockBySymbol({ AAPL: points(AAPL_CLOSES), MSFT: points(MSFT_CLOSES) });
    render(<CorrelationMatrixPanel assets={[{ symbol: "AAPL" }, { symbol: "MSFT" }]} />);
    await waitFor(() => expect(screen.getByText(/pearson/i)).toBeInTheDocument());
    expect(screen.getByText(/hors dividendes/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("does not refetch when assets change reference but the symbol set is identical", async () => {
    mockBySymbol({ AAPL: points(AAPL_CLOSES), MSFT: points(MSFT_CLOSES) });
    const { rerender } = render(
      <CorrelationMatrixPanel assets={[{ symbol: "AAPL" }, { symbol: "MSFT" }]} />,
    );
    await waitFor(() => expect(screen.getByText(/corrélation moyenne/i)).toBeInTheDocument());
    const callsAfterLoad = fetchPriceHistory.mock.calls.length;

    // Simulate a quote tick: new asset objects, same symbols, fresh prices.
    rerender(
      <CorrelationMatrixPanel assets={[{ symbol: "AAPL", price: 1 }, { symbol: "MSFT", price: 2 }]} />,
    );
    await Promise.resolve();
    expect(fetchPriceHistory.mock.calls.length).toBe(callsAfterLoad);
  });
});
