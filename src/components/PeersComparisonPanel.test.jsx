import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import PeersComparisonPanel from "./PeersComparisonPanel";

vi.mock("../services/peers", () => ({
  fetchPeers: vi.fn(),
  fetchPeerQuotes: vi.fn(),
}));

const { fetchPeers, fetchPeerQuotes } = await import("../services/peers");

function makeAsset(overrides = {}) {
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 220,
    change: 2.2,
    changePct: 1.0,
    ...overrides,
  };
}

describe("PeersComparisonPanel", () => {
  beforeEach(() => {
    fetchPeers.mockReset();
    fetchPeerQuotes.mockReset();
  });

  it("returns null when no asset is provided", () => {
    const { container } = render(<PeersComparisonPanel asset={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the loading state while peers are in flight", () => {
    fetchPeers.mockReturnValue(new Promise(() => {}));
    render(<PeersComparisonPanel asset={makeAsset()} />);
    expect(screen.getByText(/Chargement de la comparaison sectorielle/i)).toBeInTheDocument();
  });

  it("shows an error when the peers fetch fails", async () => {
    fetchPeers.mockRejectedValue(new Error("HTTP 503"));
    render(<PeersComparisonPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Comparaison sectorielle indisponible/i)).toBeInTheDocument());
    // The raw technical error (HTTP code) must not leak into the FR UI.
    expect(screen.queryByText(/HTTP 503/)).toBeNull();
  });

  it("shows an empty-state message when no peer is returned", async () => {
    fetchPeers.mockResolvedValue({ symbol: "AAPL", source: "finnhub.io", fetchedAt: null, peers: [] });
    render(<PeersComparisonPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Aucun pair sectoriel/i)).toBeInTheDocument());
    expect(fetchPeerQuotes).not.toHaveBeenCalled();
  });

  it("renders a sortable table of peers with their live quote and delta vs the base", async () => {
    fetchPeers.mockResolvedValue({
      symbol: "AAPL",
      source: "finnhub.io",
      fetchedAt: "2026-05-10T12:00:00.000Z",
      peers: ["MSFT", "GOOGL", "META"],
    });
    fetchPeerQuotes.mockResolvedValue({
      quotes: [
        { symbol: "MSFT", price: 380, change: -1.5, changePct: -0.4, source: "finnhub.io" },
        { symbol: "GOOGL", price: 145, change: 3, changePct: 2.1, source: "finnhub.io" },
        { symbol: "META", price: 510, change: 0, changePct: 0, source: "finnhub.io" },
      ],
      errors: [],
      source: "finnhub.io",
      fetchedAt: "2026-05-10T12:00:01.000Z",
    });
    render(<PeersComparisonPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByRole("region", { name: /Comparaison sectorielle/i })).toBeInTheDocument());
    expect(screen.getByText("MSFT")).toBeInTheDocument();
    expect(screen.getByText("GOOGL")).toBeInTheDocument();
    expect(screen.getByText("META")).toBeInTheDocument();
    // delta vs base: GOOGL is +1.10 pp better than AAPL.
    expect(screen.getByText(/\+1\.10 pp/)).toBeInTheDocument();
    // Default ranking: GOOGL first (highest changePct).
    const rowSymbols = screen.getAllByTestId("peer-row").map((row) => row.dataset.symbol);
    expect(rowSymbols[0]).toBe("GOOGL");
  });

  it("flags peers without a quote as missing", async () => {
    fetchPeers.mockResolvedValue({
      symbol: "AAPL",
      source: "finnhub.io",
      fetchedAt: null,
      peers: ["MSFT", "TSLA"],
    });
    fetchPeerQuotes.mockResolvedValue({
      quotes: [{ symbol: "MSFT", price: 380, change: -1.5, changePct: -0.4, source: "finnhub.io" }],
      errors: ["TSLA: 502"],
      source: "finnhub.io",
      fetchedAt: null,
    });
    render(<PeersComparisonPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText("TSLA")).toBeInTheDocument());
    const tslaRow = screen.getAllByTestId("peer-row").find((row) => row.dataset.symbol === "TSLA");
    expect(tslaRow).toBeTruthy();
    expect(tslaRow.textContent).toMatch(/cotation indisponible/i);
  });

  it("re-fetches when the asset symbol changes", async () => {
    fetchPeers.mockResolvedValue({ symbol: "AAPL", source: "finnhub.io", fetchedAt: null, peers: ["MSFT"] });
    fetchPeerQuotes.mockResolvedValue({ quotes: [], errors: [], source: null, fetchedAt: null });
    const { rerender } = render(<PeersComparisonPanel asset={makeAsset()} />);
    await waitFor(() => expect(fetchPeers).toHaveBeenCalledWith("AAPL", expect.any(Object)));

    fetchPeers.mockClear();
    fetchPeers.mockResolvedValue({ symbol: "MSFT", source: "finnhub.io", fetchedAt: null, peers: [] });
    rerender(<PeersComparisonPanel asset={makeAsset({ symbol: "MSFT" })} />);
    await waitFor(() => expect(fetchPeers).toHaveBeenCalledWith("MSFT", expect.any(Object)));
  });

  it("aborts the in-flight fetch when the panel unmounts", async () => {
    let abortSignal;
    fetchPeers.mockImplementation((symbol, { signal }) => {
      abortSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<PeersComparisonPanel asset={makeAsset()} />);
    await act(async () => {});
    unmount();
    expect(abortSignal?.aborted).toBe(true);
  });
});
