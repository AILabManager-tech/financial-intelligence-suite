import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PortfolioRiskPanel from "./PortfolioRiskPanel";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("PortfolioRiskPanel", () => {
  it("affiche un message d'accumulation tant que la série est insuffisante", () => {
    render(<PortfolioRiskPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    expect(screen.getByText(/insuffisante/i)).toBeInTheDocument();
  });

  it("affiche volatilité, repli maximal et statut quand la série suffit", () => {
    render(
      <PortfolioRiskPanel
        snapshots={[
          snap("2026-05-01", 100),
          snap("2026-05-02", 110),
          snap("2026-05-03", 99),
          snap("2026-05-04", 108.9),
        ]}
        transactions={[]}
      />,
    );
    expect(screen.getByText("Volatilité annualisée")).toBeInTheDocument();
    expect(screen.getByText("-10.00 %")).toBeInTheDocument(); // repli maximal
    expect(screen.getByText(/neutralisés/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("indique « Au sommet » quand le portefeuille a récupéré", () => {
    render(
      <PortfolioRiskPanel
        snapshots={[
          snap("2026-05-01", 100),
          snap("2026-05-02", 110),
          snap("2026-05-03", 99),
          snap("2026-05-04", 110),
        ]}
        transactions={[]}
      />,
    );
    expect(screen.getByText("Au sommet")).toBeInTheDocument();
  });
});
