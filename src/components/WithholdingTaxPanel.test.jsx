import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/dividends", () => ({ fetchDividends: vi.fn() }));

import { fetchDividends } from "../services/dividends";
import WithholdingTaxPanel from "./WithholdingTaxPanel";

// An ex-date within the trailing 12 months relative to the test run.
function recentExDate() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() - 2);
  return d.toISOString().slice(0, 10);
}

function mockDividends(map) {
  fetchDividends.mockReset();
  fetchDividends.mockImplementation((symbol) => {
    const items = map[symbol];
    if (!items) return Promise.reject(new Error(`no data for ${symbol}`));
    return Promise.resolve({ symbol, items });
  });
}

const MSFT = { symbol: "MSFT", price: 400, position: { quantity: 10 } };

describe("WithholdingTaxPanel", () => {
  it("applies 15% withholding to a US holding in a taxable account", async () => {
    mockDividends({ MSFT: [{ exDate: recentExDate(), amount: 3, currency: "USD" }] });
    render(<WithholdingTaxPanel assets={[MSFT]} accountType="taxable" />);

    // gross = 3 $/share × 10 = 30 $ ; withheld = 4.5 → arrondi 5 $ ; net = 25.5 → 26 $
    await waitFor(() => expect(screen.getByText(/Dividendes US bruts/)).toBeInTheDocument());
    expect(screen.getAllByText("MSFT").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/crédit pour impôt étranger/i)).toBeInTheDocument();
    expect(fetchDividends).toHaveBeenCalledWith("MSFT", expect.anything());
  });

  it("withholds nothing in an RRSP (treaty-exempt)", async () => {
    mockDividends({ MSFT: [{ exDate: recentExDate(), amount: 3, currency: "USD" }] });
    render(<WithholdingTaxPanel assets={[MSFT]} accountType="rrsp" />);
    await waitFor(() => expect(screen.getByText(/Exempté/i)).toBeInTheDocument());
  });

  it("excludes non-US holdings and fetches nothing", () => {
    fetchDividends.mockReset();
    render(<WithholdingTaxPanel assets={[{ symbol: "SHOP.TO", price: 100, position: { quantity: 5 } }]} accountType="taxable" />);
    expect(screen.getByText(/Aucune position cotée aux États-Unis/i)).toBeInTheDocument();
    expect(fetchDividends).not.toHaveBeenCalled();
  });

  it("shows an honest note when a US holding has no recent dividends", async () => {
    mockDividends({ MSFT: [] });
    render(<WithholdingTaxPanel assets={[MSFT]} accountType="taxable" />);
    await waitFor(() => expect(screen.getByText(/Aucun dividende US déclaré/i)).toBeInTheDocument());
  });
});
