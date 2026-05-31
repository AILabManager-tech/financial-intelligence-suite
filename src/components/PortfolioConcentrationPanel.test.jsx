import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PortfolioConcentrationPanel from "./PortfolioConcentrationPanel";

const holding = (symbol, sector, quantity, price) => ({
  symbol,
  sector,
  price,
  position: { quantity, averageCost: price },
});

describe("PortfolioConcentrationPanel", () => {
  it("shows an honest empty state with no positions", () => {
    render(<PortfolioConcentrationPanel assets={[]} />);
    expect(screen.getByText(/aucune position/i)).toBeInTheDocument();
  });

  it("renders concentration KPIs for held positions", () => {
    render(
      <PortfolioConcentrationPanel
        assets={[holding("BIG", "Tech", 1, 30), holding("SMALL", "Tech", 1, 10)]}
      />,
    );
    expect(screen.getByText("Indice HHI")).toBeInTheDocument();
    expect(screen.getByText("Plus grosse position")).toBeInTheDocument();
    // BIG is 75% → the largest holding symbol appears
    expect(screen.getAllByText("BIG").length).toBeGreaterThan(0);
  });

  it("flags a concentrated single-holding portfolio", () => {
    render(<PortfolioConcentrationPanel assets={[holding("AAPL", "Tech", 10, 100)]} />);
    // header badge + amber warning + footer legend all mention it
    expect(screen.getAllByText(/concentré/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/risque idiosyncratique/i)).toBeInTheDocument();
  });

  it("flags a diversified equal-weight portfolio", () => {
    const assets = Array.from({ length: 10 }, (_, i) => holding(`S${i}`, `Sector ${i}`, 1, 100));
    render(<PortfolioConcentrationPanel assets={assets} />);
    expect(screen.getAllByText(/diversifié/i).length).toBeGreaterThan(0);
    // the concentrated-only warning must NOT appear for a diversified book
    expect(screen.queryByText(/risque idiosyncratique/i)).not.toBeInTheDocument();
  });

  it("carries a factual disclaimer (not advice)", () => {
    render(<PortfolioConcentrationPanel assets={[holding("AAPL", "Tech", 10, 100)]} />);
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });
});
