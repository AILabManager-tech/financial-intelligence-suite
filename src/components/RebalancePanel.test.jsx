import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import RebalancePanel from "./RebalancePanel";

function asset(symbol, quantity, price, targetWeight) {
  return { symbol, price, position: { quantity, targetWeight } };
}

describe("RebalancePanel", () => {
  it("invite à définir des cibles quand aucune n'est posée", () => {
    render(<RebalancePanel assets={[asset("AAPL", 10, 100, 0)]} />);
    expect(screen.getByText(/Définis un poids cible/i)).toBeInTheDocument();
  });

  it("affiche les ordres suggérés vers les cibles", () => {
    render(<RebalancePanel assets={[asset("AAPL", 70, 100, 50), asset("MSFT", 30, 100, 50)]} />);
    expect(screen.getByText("Rééquilibrage")).toBeInTheDocument();
    expect(screen.getAllByText(/Vendre/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Acheter/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("indique l'alignement quand les dérives sont sous le seuil", () => {
    render(<RebalancePanel assets={[asset("AAPL", 5005, 1, 50), asset("MSFT", 4995, 1, 50)]} />);
    expect(screen.getByText(/Aligné sur les cibles/i)).toBeInTheDocument();
  });
});
