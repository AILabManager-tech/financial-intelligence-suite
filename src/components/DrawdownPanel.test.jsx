import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({
  fetchPriceHistory: vi.fn(),
}));

import { fetchPriceHistory } from "../services/priceHistory";
import DrawdownPanel from "./DrawdownPanel";

const ASSET = { symbol: "AAPL", name: "Apple" };

// 100 → 120 (peak) → 90 (trough, -25%) → 110 (still under water)
const POINTS = [
  ["2023-01-31", 100],
  ["2023-02-28", 120],
  ["2023-03-31", 90],
  ["2023-04-30", 110],
].map(([date, close]) => ({ date, close }));

describe("DrawdownPanel", () => {
  it("renders the max drawdown after loading", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<DrawdownPanel asset={ASSET} />);

    await waitFor(() => expect(screen.getByText(/repli maximal/i)).toBeInTheDocument());
    expect(screen.getByText(/sous l'eau/i)).toBeInTheDocument(); // not recovered
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", { days: 1825 });
  });

  it("hides and flags an insufficient history", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: [] });
    render(<DrawdownPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });

  it("handles a network error without inventing values", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockImplementation(() => Promise.reject(new Error("boom")));
    render(<DrawdownPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/indisponible/i)).toBeInTheDocument());
  });

  it("carries the factual disclaimer (close prices, ex-dividends)", async () => {
    fetchPriceHistory.mockReset();
    fetchPriceHistory.mockResolvedValue({ symbol: "AAPL", source: "Twelve Data", points: POINTS });
    render(<DrawdownPanel asset={ASSET} />);
    await waitFor(() => expect(screen.getByText(/hors dividendes/i)).toBeInTheDocument());
  });
});
