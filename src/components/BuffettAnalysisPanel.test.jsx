import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import BuffettAnalysisPanel from "./BuffettAnalysisPanel";

vi.mock("../services/fundamentals", () => ({
  fetchFundamentals: vi.fn(),
}));

const { fetchFundamentals } = await import("../services/fundamentals");

const ASOF = "2026-05-09T12:00:00.000Z";
const SRC = "finnhub.io";

const completeFields = {
  roeTtm: { value: 43.62, source: SRC, asOf: ASOF },
  epsGrowth5y: { value: 11.14, source: SRC, asOf: ASOF },
  debtEquityAnnual: { value: 1.4142, source: SRC, asOf: ASOF },
  pfcfShareTtm: { value: 26.86, source: SRC, asOf: ASOF },
};

function makeAsset(overrides = {}) {
  return {
    symbol: "KO",
    name: "Coca-Cola",
    price: 62.10,
    change: 0.5,
    changePct: 0.81,
    volume: 14_000_000,
    ...overrides,
  };
}

describe("BuffettAnalysisPanel", () => {
  beforeEach(() => {
    fetchFundamentals.mockReset();
  });

  it("shows the loading state while fundamentals are in flight", () => {
    fetchFundamentals.mockReturnValue(new Promise(() => {})); // never resolves
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    expect(screen.getByText(/Chargement de l'analyse Buffett/i)).toBeInTheDocument();
  });

  it("shows an error when fundamentals fetch fails", async () => {
    fetchFundamentals.mockRejectedValue(new Error("HTTP 503"));
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() =>
      expect(screen.getByText(/Analyse Buffett indisponible/i)).toBeInTheDocument(),
    );
    // The raw technical error (HTTP code) must not leak into the FR UI.
    expect(screen.queryByText(/HTTP 503/)).toBeNull();
  });

  it("shows an explicit insufficient-data message when required fields are missing", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: { roeTtm: completeFields.roeTtm }, // only one field
      upstream: null,
      cache: null,
    });
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() =>
      expect(screen.getByText(/Données insuffisantes/i)).toBeInTheDocument(),
    );
  });

  it("renders the full panel when fundamentals are complete", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() =>
      expect(screen.getByRole("region", { name: /Analyse Buffett/i })).toBeInTheDocument(),
    );
    // Hero MoS visible (also appears in math breakdown section III, hence getAllByText)
    expect(screen.getAllByText(/Marge de sécurité/i).length).toBeGreaterThan(0);
    // 5 Buffett gates listed
    expect(screen.getByText(/ROE > 15%/i)).toBeInTheDocument();
    expect(screen.getByText(/Debt\/Equity < 0\.5/i)).toBeInTheDocument();
    // « FCF > 0 » retiré du score : inatteignable via le pipeline réel.
    expect(screen.queryByText(/FCF > 0/i)).not.toBeInTheDocument();
    expect(screen.getByText(/EPS growth 5y > 5%/i)).toBeInTheDocument();
    expect(screen.getByText(/Economic moat/i)).toBeInTheDocument();
    expect(screen.getByText(/Margin of Safety > 25%/i)).toBeInTheDocument();
    expect(screen.getByText(/Critères Buffett validés/i)).toBeInTheDocument();
    expect(screen.getByText(/3\/5/i)).toBeInTheDocument();
    expect(screen.getByText(/Complet/i)).toBeInTheDocument();
    expect(screen.getByText(/FCF\/action estimé/i)).toBeInTheDocument();
  });

  it("re-fetches when the asset symbol changes", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    const { rerender } = render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() => expect(fetchFundamentals).toHaveBeenCalledWith("KO", expect.any(Object)));

    fetchFundamentals.mockClear();
    fetchFundamentals.mockResolvedValue({
      symbol: "AAPL",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    rerender(<BuffettAnalysisPanel asset={makeAsset({ symbol: "AAPL", price: 200 })} />);
    await waitFor(() => expect(fetchFundamentals).toHaveBeenCalledWith("AAPL", expect.any(Object)));
  });

  it("returns null when no asset is provided", () => {
    const { container } = render(<BuffettAnalysisPanel asset={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("exposes both r and g sliders with accessible labels", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByLabelText(/Taux d'actualisation/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/Taux de croissance/i)).toBeInTheDocument();
  });

  it("offers assumption presets and updates slider values", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Hypothèses/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /Conservateur/i }));
    expect(screen.getByLabelText(/Taux d'actualisation/i)).toHaveValue("0.12");
    expect(screen.getByLabelText(/Taux de croissance/i)).toHaveValue("0.03");
  });

  it("warns when growth is greater than or equal to discount rate", async () => {
    fetchFundamentals.mockResolvedValue({
      symbol: "KO",
      source: SRC,
      fetchedAt: ASOF,
      fields: completeFields,
      upstream: null,
      cache: null,
    });
    render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByLabelText(/Taux de croissance/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText(/Taux de croissance/i), { target: { value: "0.10" } });
    expect(screen.getAllByText(/Hypothèse invalide/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/croissance doit rester inférieur/i)).toBeInTheDocument();
  });

  it("aborts the in-flight fetch when the panel unmounts", async () => {
    let abortSignal;
    fetchFundamentals.mockImplementation((symbol, { signal }) => {
      abortSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<BuffettAnalysisPanel asset={makeAsset()} />);
    await act(async () => {});
    unmount();
    expect(abortSignal?.aborted).toBe(true);
  });
});
