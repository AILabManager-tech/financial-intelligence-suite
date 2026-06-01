import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CompliancePanel from "./CompliancePanel";

function asset(symbol, sector, quantity, price) {
  return { symbol, sector, price, position: { quantity } };
}
const ASSETS = [asset("AAPL", "Technologie", 60, 100), asset("KO", "Consommation", 40, 100)];

describe("CompliancePanel", () => {
  beforeEach(() => window.localStorage.clear());

  it("affiche l'éditeur de règles et l'état conforme sans règle", () => {
    render(<CompliancePanel assets={ASSETS} portfolioId="default" />);
    expect(screen.getByText("Conformité du mandat")).toBeInTheDocument();
    expect(screen.getByText(/aucune règle dépassée/i)).toBeInTheDocument();
  });

  it("signale l'absence de positions valorisées", () => {
    render(<CompliancePanel assets={[]} portfolioId="default" />);
    expect(screen.getByText(/Aucune position valorisée/i)).toBeInTheDocument();
  });

  it("charge des règles préenregistrées et affiche une violation", () => {
    window.localStorage.setItem(
      "financial-intelligence-suite.compliance.v1",
      JSON.stringify({ default: { maxPositionPct: 50, maxSectorPct: null, excludedSymbols: [] } }),
    );
    render(<CompliancePanel assets={ASSETS} portfolioId="default" />);
    // AAPL 60% > 50% → violation
    expect(screen.getByText(/AAPL dépasse le poids max/i)).toBeInTheDocument();
  });
});
