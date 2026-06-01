import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TwrPanel from "./TwrPanel";

function snap(snapshotDate, totalMarketValue) {
  return { snapshotDate, totalMarketValue };
}

describe("TwrPanel", () => {
  it("affiche un message d'accumulation tant que la série est insuffisante", () => {
    render(<TwrPanel snapshots={[snap("2026-05-01", 1000)]} transactions={[]} />);
    expect(screen.getByText(/en cours d'accumulation/i)).toBeInTheDocument();
  });

  it("affiche le TWR cumulé et la mention de méthode quand la série suffit", () => {
    render(
      <TwrPanel
        snapshots={[snap("2026-05-01", 1000), snap("2026-05-02", 1100), snap("2026-05-03", 1045)]}
        transactions={[]}
      />,
    );
    expect(screen.getByText("+4.50 %")).toBeInTheDocument();
    expect(screen.getByText(/série < 1 an/i)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
    expect(screen.getByText(/neutralisés/i)).toBeInTheDocument();
  });

  it("masque l'annualisé en tiret tant que la série ne couvre pas un an", () => {
    render(<TwrPanel snapshots={[snap("2026-05-01", 1000), snap("2026-05-10", 1100)]} transactions={[]} />);
    // Le bloc annualisé montre un tiret, pas un pourcentage annualisé inventé.
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("neutralise un apport de capital (achat) : pas compté comme performance", () => {
    render(
      <TwrPanel
        snapshots={[snap("2026-05-01", 1000), snap("2026-05-02", 2000)]}
        transactions={[{ type: "buy", date: "2026-05-02", quantity: 10, price: 100 }]}
      />,
    );
    expect(screen.getByText("+0.00 %")).toBeInTheDocument();
  });
});
