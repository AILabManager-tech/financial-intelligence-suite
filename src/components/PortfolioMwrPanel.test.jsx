import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PortfolioMwrPanel from "./PortfolioMwrPanel";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("PortfolioMwrPanel", () => {
  it("affiche un message d'accumulation tant que la série est insuffisante", () => {
    render(<PortfolioMwrPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    expect(screen.getByText(/insuffisante/i)).toBeInTheDocument();
  });

  it("affiche le MWR de période et la comparaison au TWR", () => {
    render(
      <PortfolioMwrPanel snapshots={[snap("2026-05-01", 1000), snap("2026-05-11", 1050)]} transactions={[]} />,
    );
    expect(screen.getByText("+5.00 %")).toBeInTheDocument(); // MWR de période
    expect(screen.getByText(/série < 1 an/i)).toBeInTheDocument(); // IRR annualisé masqué
    expect(screen.getByText(/timing des apports/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("affiche l'IRR annualisé quand la série couvre un an", () => {
    render(
      <PortfolioMwrPanel snapshots={[snap("2025-05-01", 1000), snap("2026-05-01", 1100)]} transactions={[]} />,
    );
    expect(screen.getAllByText("+10.00 %").length).toBeGreaterThanOrEqual(1);
  });
});
