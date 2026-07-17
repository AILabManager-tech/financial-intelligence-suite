import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

vi.mock("../services/priceHistory", () => ({ fetchPriceHistory: vi.fn() }));

import { fetchPriceHistory } from "../services/priceHistory";
import { useEffectiveSnapshots } from "./useEffectiveSnapshots";

const ASSETS = [{ symbol: "AAPL", position: { quantity: 10 } }];
const TXS = [{ type: "buy", symbol: "AAPL", date: "2026-05-01", quantity: 10, price: 100 }];

beforeEach(() => {
  vi.clearAllMocks();
  fetchPriceHistory.mockResolvedValue({ points: [] });
});

describe("useEffectiveSnapshots", () => {
  it("returns the real accrued series when it has ≥ 2 points, without fetching history", () => {
    const real = [
      { snapshotDate: "2026-05-01", totalMarketValue: 1000 },
      { snapshotDate: "2026-06-01", totalMarketValue: 1100 },
    ];
    const { result } = renderHook(() => useEffectiveSnapshots(ASSETS, TXS, real));
    expect(result.current).toBe(real);
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });

  it("reconstructs from the journal × real closes when no snapshot has accrued", async () => {
    fetchPriceHistory.mockResolvedValue({
      points: [
        { date: "2026-05-01", close: 100 },
        { date: "2026-06-01", close: 120 },
      ],
    });
    const { result } = renderHook(() => useEffectiveSnapshots(ASSETS, TXS, []));
    await waitFor(() => expect(result.current.length).toBeGreaterThan(0));
    expect(result.current.every((s) => s.reconstructed)).toBe(true);
    expect(result.current[0].totalMarketValue).toBe(1000);
    expect(fetchPriceHistory).toHaveBeenCalledWith("AAPL", expect.anything());
  });

  it("still fetches to reconstruct when the real series has only one point (< 2)", async () => {
    const oneReal = [{ snapshotDate: "2026-06-01", totalMarketValue: 1100 }];
    fetchPriceHistory.mockResolvedValue({ points: [{ date: "2026-05-01", close: 100 }] });
    renderHook(() => useEffectiveSnapshots(ASSETS, TXS, oneReal));
    await waitFor(() => expect(fetchPriceHistory).toHaveBeenCalled());
  });

  it("falls back to the given series when there is no history to reconstruct from", async () => {
    const { result } = renderHook(() => useEffectiveSnapshots(ASSETS, TXS, []));
    await waitFor(() => expect(fetchPriceHistory).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it("does not fetch when nothing is held", () => {
    renderHook(() => useEffectiveSnapshots([], TXS, []));
    expect(fetchPriceHistory).not.toHaveBeenCalled();
  });
});
