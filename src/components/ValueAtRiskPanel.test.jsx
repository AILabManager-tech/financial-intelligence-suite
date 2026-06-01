import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ValueAtRiskPanel from "./ValueAtRiskPanel";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}
function snapsFromReturns(returns, start = 1000) {
  const snaps = [snap("2026-01-01", start)];
  let value = start;
  let day = 1;
  for (const r of returns) {
    value *= 1 + r;
    day += 1;
    snaps.push(snap(`2026-01-${String(day).padStart(2, "0")}`, value));
  }
  return snaps;
}

describe("ValueAtRiskPanel", () => {
  it("affiche un message d'accumulation tant que la série est insuffisante", () => {
    render(<ValueAtRiskPanel snapshots={[snap("2026-01-01", 1000)]} transactions={[]} />);
    expect(screen.getByText(/insuffisante/i)).toBeInTheDocument();
  });

  it("affiche la table VaR et signale la VaR historique masquée sous 10 obs", () => {
    render(<ValueAtRiskPanel snapshots={snapsFromReturns([0.05, -0.03, 0.02])} transactions={[]} />);
    expect(screen.getByText("VaR paramétrique")).toBeInTheDocument();
    expect(screen.getByText(/VaR historique masquée/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("affiche les niveaux 95 % et 99 %", () => {
    render(<ValueAtRiskPanel snapshots={snapsFromReturns([0.02, -0.01, 0.03, -0.02])} transactions={[]} />);
    expect(screen.getByText("95 %")).toBeInTheDocument();
    expect(screen.getByText("99 %")).toBeInTheDocument();
  });
});
