import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PortfolioRatiosPanel from "./PortfolioRatiosPanel";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("PortfolioRatiosPanel", () => {
  it("affiche un message d'accumulation tant que la série est insuffisante", () => {
    render(<PortfolioRatiosPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    expect(screen.getByText(/insuffisante/i)).toBeInTheDocument();
  });

  it("affiche les trois ratios, l'hypothèse de taux sans risque et le disclaimer", () => {
    render(
      <PortfolioRatiosPanel
        snapshots={[
          snap("2026-05-01", 100),
          snap("2026-05-02", 110),
          snap("2026-05-03", 99),
          snap("2026-05-04", 108.9),
        ]}
        transactions={[]}
      />,
    );
    expect(screen.getByText("Sharpe")).toBeInTheDocument();
    expect(screen.getByText("Sortino")).toBeInTheDocument();
    expect(screen.getByText("Calmar")).toBeInTheDocument();
    // série < 1 an → Calmar masqué
    expect(screen.getByText("série < 1 an")).toBeInTheDocument();
    expect(screen.getByText(/taux sans risque supposé 0 %/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });
});
