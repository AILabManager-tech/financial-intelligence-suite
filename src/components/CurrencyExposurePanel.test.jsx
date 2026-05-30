import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/fx", () => ({ fetchFxRates: vi.fn() }));
import { fetchFxRates } from "../services/fx";
import CurrencyExposurePanel from "./CurrencyExposurePanel";

const assets = [
  { symbol: "AAPL", sector: "Tech", price: 200, position: { quantity: 10, averageCost: 100, targetWeight: 0 } },
];

describe("CurrencyExposurePanel", () => {
  beforeEach(() => {
    fetchFxRates.mockResolvedValue({ base: "CAD", source: "frankfurter.app", asOf: "2026-05-30", rates: { USD: 1, CAD: 1.36 } });
  });
  afterEach(() => vi.clearAllMocks());

  it("ne rend rien si la devise base est USD", () => {
    const { container } = render(<CurrencyExposurePanel assets={assets} baseCurrency="USD" />);
    expect(container).toBeEmptyDOMElement();
    expect(fetchFxRates).not.toHaveBeenCalled();
  });

  it("convertit les totaux USD vers la devise base et affiche la source", async () => {
    render(<CurrencyExposurePanel assets={assets} baseCurrency="CAD" />);
    // market value USD = 10*200 = 2000 -> CAD 2720
    await waitFor(() => expect(screen.getByText(/Exposition en CAD/)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/frankfurter\.app/)).toBeInTheDocument());
    expect(screen.getByText(/au 2026-05-30/)).toBeInTheDocument();
  });

  it("masque la conversion si les taux échouent", async () => {
    fetchFxRates.mockRejectedValue(new Error("down"));
    render(<CurrencyExposurePanel assets={assets} baseCurrency="CAD" />);
    await waitFor(() => expect(screen.getByText(/Conversion masquée/)).toBeInTheDocument());
  });
});
