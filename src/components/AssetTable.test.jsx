import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import AssetTable from "./AssetTable";

const assets = [
  {
    symbol: "AAPL",
    name: "Apple Inc.",
    sector: "Technology",
    price: 292.68,
    change: -0.64,
    changePct: -0.21,
    volume: 1000,
    marketData: { source: "finnhub.io", asOf: "2026-05-11T20:00:00.000Z" },
    position: { quantity: 1, averageCost: 200, targetWeight: 10 },
  },
];

describe("AssetTable", () => {
  it("renders Buffett dashboard status when summaries are provided", () => {
    render(
      <AssetTable
        assets={assets}
        buffettSummaries={{
          AAPL: {
            status: "ready",
            score: 4,
            criteriaTotal: 5,
            signal: "SELL",
            label: "Signal défavorable",
          },
        }}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByText("Buffett")).toBeInTheDocument();
    expect(screen.getByText("4/5")).toBeInTheDocument();
    expect(screen.getByText("Signal défavorable")).toBeInTheDocument();
  });

  it("affiche une variation absente comme absence, jamais comme +0,00 %", () => {
    // Une cote sans variation déterminable (source de repli sans cours
    // d'ouverture). Afficher « +0,00 % » avec la flèche haussière fabriquerait
    // le fait « stable aujourd'hui » ; l'absence doit rester visible.
    const noChange = [{ ...assets[0], change: null, changePct: null }];
    render(<AssetTable assets={noChange} onSelect={vi.fn()} />);
    expect(screen.queryByText("+0.00%")).not.toBeInTheDocument();
    expect(screen.queryByText("+$0.00")).not.toBeInTheDocument();
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });
});
