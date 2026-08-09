import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import InsiderTransactionsPanel from "./InsiderTransactionsPanel";

vi.mock("../services/insiderTransactions", () => ({
  fetchInsiderTransactions: vi.fn(),
}));

const { fetchInsiderTransactions } = await import("../services/insiderTransactions");

const SAMPLE = {
  symbol: "AAPL",
  source: "finnhub.io",
  fetchedAt: "2026-05-10T12:00:00.000Z",
  items: [
    { name: "COOK TIMOTHY", change: -240000, share: 3280000, transactionDate: "2026-04-02", filingDate: "2026-04-04", transactionCode: "S", transactionPrice: 170.12 },
    { name: "MAESTRI LUCA", change: 5000, share: 110000, transactionDate: "2026-03-10", filingDate: "2026-03-12", transactionCode: "P", transactionPrice: 165.4 },
  ],
};

function makeAsset(overrides = {}) {
  return { symbol: "AAPL", name: "Apple Inc.", price: 220.5, change: 1.5, changePct: 0.7, ...overrides };
}

describe("InsiderTransactionsPanel", () => {
  beforeEach(() => {
    fetchInsiderTransactions.mockReset();
  });

  it("returns null when no asset is provided", () => {
    const { container } = render(<InsiderTransactionsPanel asset={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the loading state while the fetch is in flight", () => {
    fetchInsiderTransactions.mockReturnValue(new Promise(() => {}));
    render(<InsiderTransactionsPanel asset={makeAsset()} />);
    expect(screen.getByText(/Chargement des transactions d'initiés/i)).toBeInTheDocument();
  });

  it("shows an error when the fetch fails", async () => {
    fetchInsiderTransactions.mockRejectedValue(new Error("HTTP 503"));
    render(<InsiderTransactionsPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Transactions d'initiés indisponibles/i)).toBeInTheDocument());
    // The raw technical error (HTTP code) must not leak into the FR UI.
    expect(screen.queryByText(/HTTP 503/)).toBeNull();
  });

  it("shows a US-only empty-state message when no transactions are returned", async () => {
    fetchInsiderTransactions.mockResolvedValue({ ...SAMPLE, items: [] });
    render(<InsiderTransactionsPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Aucune transaction d'initié publiée/i)).toBeInTheDocument());
    expect(screen.getByText(/États-Unis/i)).toBeInTheDocument();
  });

  it("renders the summary, the rows and the not-advice disclaimer", async () => {
    fetchInsiderTransactions.mockResolvedValue(SAMPLE);
    render(<InsiderTransactionsPanel asset={makeAsset()} />);
    // Ancré sur la donnée : la région existe avant que les lignes soient rendues.
    expect(await screen.findByText("COOK TIMOTHY")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: /Transactions d'initiés/i })).toBeInTheDocument();
    expect(screen.getByText("MAESTRI LUCA")).toBeInTheDocument();
    expect(screen.getByText(/Vente \(marché\)/)).toBeInTheDocument();
    expect(screen.getByText(/Achat \(marché\)/)).toBeInTheDocument();
    // Net = 5000 - 240000 = -235000 disposed.
    expect(screen.getByText(/235.?000/)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("re-fetches when the asset symbol changes", async () => {
    fetchInsiderTransactions.mockResolvedValue(SAMPLE);
    const { rerender } = render(<InsiderTransactionsPanel asset={makeAsset()} />);
    await waitFor(() => expect(fetchInsiderTransactions).toHaveBeenCalledWith("AAPL", expect.any(Object)));

    fetchInsiderTransactions.mockClear();
    fetchInsiderTransactions.mockResolvedValue({ ...SAMPLE, symbol: "MSFT" });
    rerender(<InsiderTransactionsPanel asset={makeAsset({ symbol: "MSFT" })} />);
    await waitFor(() => expect(fetchInsiderTransactions).toHaveBeenCalledWith("MSFT", expect.any(Object)));
  });

  it("aborts the in-flight fetch when the panel unmounts", async () => {
    let abortSignal;
    fetchInsiderTransactions.mockImplementation((symbol, { signal }) => {
      abortSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<InsiderTransactionsPanel asset={makeAsset()} />);
    await act(async () => {});
    unmount();
    expect(abortSignal?.aborted).toBe(true);
  });
});
