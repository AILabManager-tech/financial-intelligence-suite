import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import SecFilingsPanel from "./SecFilingsPanel";

vi.mock("../services/secFilings", () => ({
  fetchSecFilings: vi.fn(),
}));

const { fetchSecFilings } = await import("../services/secFilings");

const SAMPLE = {
  symbol: "AAPL",
  source: "finnhub.io",
  fetchedAt: "2026-05-10T12:00:00.000Z",
  items: [
    {
      accessNumber: "0000320193-26-000005",
      form: "10-K",
      filedDate: "2026-04-12",
      acceptedDate: "2026-04-12 18:00:00",
      reportUrl: "https://www.sec.gov/Archives/aapl-10k.htm",
      filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?accession=0000320193-26-000005",
      cik: "0000320193",
    },
    {
      accessNumber: "0000320193-26-000004",
      form: "10-Q",
      filedDate: "2026-02-08",
      acceptedDate: "2026-02-08 16:30:00",
      reportUrl: "https://www.sec.gov/Archives/aapl-10q.htm",
      filingUrl: null,
      cik: "0000320193",
    },
    {
      accessNumber: "0000320193-26-000003",
      form: "8-K",
      filedDate: "2026-01-15",
      acceptedDate: "2026-01-15 09:00:00",
      reportUrl: null,
      filingUrl: "https://www.sec.gov/cgi-bin/browse-edgar?accession=0000320193-26-000003",
      cik: "0000320193",
    },
  ],
};

function makeAsset(overrides = {}) {
  return {
    symbol: "AAPL",
    name: "Apple Inc.",
    price: 220.5,
    change: 1.5,
    changePct: 0.7,
    ...overrides,
  };
}

describe("SecFilingsPanel", () => {
  beforeEach(() => {
    fetchSecFilings.mockReset();
  });

  it("returns null when no asset is provided", () => {
    const { container } = render(<SecFilingsPanel asset={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows the loading state while filings are in flight", () => {
    fetchSecFilings.mockReturnValue(new Promise(() => {}));
    render(<SecFilingsPanel asset={makeAsset()} />);
    expect(screen.getByText(/Chargement des dépôts SEC/i)).toBeInTheDocument();
  });

  it("shows an error when filings fetch fails", async () => {
    fetchSecFilings.mockRejectedValue(new Error("HTTP 503"));
    render(<SecFilingsPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Dépôts SEC indisponibles/i)).toBeInTheDocument());
    expect(screen.getByText(/HTTP 503/)).toBeInTheDocument();
  });

  it("shows an empty-state message when no filings are returned", async () => {
    fetchSecFilings.mockResolvedValue({ ...SAMPLE, items: [] });
    render(<SecFilingsPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByText(/Aucun dépôt SEC publié/i)).toBeInTheDocument());
  });

  it("renders the filings grouped by form with localized labels and SEC links", async () => {
    fetchSecFilings.mockResolvedValue(SAMPLE);
    render(<SecFilingsPanel asset={makeAsset()} />);
    await waitFor(() => expect(screen.getByRole("region", { name: /Dépôts SEC/i })).toBeInTheDocument());

    expect(screen.getByText(/Rapport annuel/)).toBeInTheDocument();
    expect(screen.getByText(/Rapport trimestriel/)).toBeInTheDocument();
    expect(screen.getByText(/Événement matériel/)).toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThanOrEqual(3);
    // The 10-K should link to the report URL (preferred over filingUrl).
    const tenK = links.find((a) => a.href.includes("aapl-10k.htm"));
    expect(tenK).toBeTruthy();
    expect(tenK.getAttribute("rel")).toContain("noopener");
    expect(tenK.getAttribute("target")).toBe("_blank");
    // The 8-K only has filingUrl — link must fall back to it.
    const eightK = links.find((a) => a.href.includes("0000320193-26-000003"));
    expect(eightK).toBeTruthy();
  });

  it("re-fetches when the asset symbol changes", async () => {
    fetchSecFilings.mockResolvedValue(SAMPLE);
    const { rerender } = render(<SecFilingsPanel asset={makeAsset()} />);
    await waitFor(() => expect(fetchSecFilings).toHaveBeenCalledWith("AAPL", expect.any(Object)));

    fetchSecFilings.mockClear();
    fetchSecFilings.mockResolvedValue({ ...SAMPLE, symbol: "MSFT" });
    rerender(<SecFilingsPanel asset={makeAsset({ symbol: "MSFT" })} />);
    await waitFor(() => expect(fetchSecFilings).toHaveBeenCalledWith("MSFT", expect.any(Object)));
  });

  it("aborts the in-flight fetch when the panel unmounts", async () => {
    let abortSignal;
    fetchSecFilings.mockImplementation((symbol, { signal }) => {
      abortSignal = signal;
      return new Promise(() => {});
    });
    const { unmount } = render(<SecFilingsPanel asset={makeAsset()} />);
    await act(async () => {});
    unmount();
    expect(abortSignal?.aborted).toBe(true);
  });
});
