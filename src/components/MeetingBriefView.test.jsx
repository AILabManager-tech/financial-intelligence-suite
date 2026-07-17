import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import MeetingBriefView from "./MeetingBriefView";

const MANDATE = { name: "Client A", client: "A inc.", accountType: "taxable", baseCurrency: "USD" };
const ASSETS = [{ symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } }];
const SNAPSHOTS = [
  { snapshotDate: "2026-05-01", totalMarketValue: 1100 },
  { snapshotDate: "2026-06-01", totalMarketValue: 2000 },
];

describe("MeetingBriefView", () => {
  it("renders the brief heading and the no-recommendation notice", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    expect(screen.getByText(/Brief de rencontre/)).toBeInTheDocument();
    expect(screen.getByText(/aucune recommandation/i)).toBeInTheDocument();
  });

  it("reports the missing meeting date as an absence until one is picked", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} snapshots={SNAPSHOTS} />);
    expect(screen.getByText("Données absentes")).toBeInTheDocument();
    expect(screen.getByText(/Aucune date de dernière rencontre/i)).toBeInTheDocument();
  });

  it("rebuilds the brief with a period once a meeting date is picked", () => {
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} snapshots={SNAPSHOTS} />);
    fireEvent.change(screen.getByLabelText(/Dernière rencontre le/i), { target: { value: "2026-05-01" } });
    expect(screen.getByText(/Depuis la dernière rencontre \(2026-05-01 → 2026-06-01\)/)).toBeInTheDocument();
  });

  it("copies the raw markdown to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { ...navigator, clipboard: { writeText } });
    render(<MeetingBriefView mandate={MANDATE} assets={ASSETS} />);
    fireEvent.click(screen.getByLabelText(/Copier le brief en markdown/i));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    expect(writeText.mock.calls[0][0]).toContain("# Brief de rencontre — Client A — A inc.");
    await waitFor(() => expect(screen.getByText("Copié")).toBeInTheDocument());
    vi.unstubAllGlobals();
  });
});
