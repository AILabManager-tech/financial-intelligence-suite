import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import OperationalStatsPanel from "./OperationalStatsPanel";

const buy = (symbol, date, quantity, price) => ({ type: "buy", symbol, date, quantity, price });
const sell = (symbol, date, quantity, price) => ({ type: "sell", symbol, date, quantity, price });
const dividend = (symbol, date, amount) => ({ type: "dividend", symbol, date, amount });

describe("OperationalStatsPanel", () => {
  it("affiche un état vide honnête sans transaction", () => {
    render(<OperationalStatsPanel transactions={[]} />);
    expect(screen.getByText(/Aucune transaction saisie/i)).toBeInTheDocument();
  });

  it("affiche le taux de réussite et le ratio gain/perte sur des round-trips clôturés", () => {
    const transactions = [
      buy("WIN", "2020-01-01", 10, 100),
      sell("WIN", "2020-04-01", 10, 130), // +300 gagnant
      buy("LOSE", "2020-01-01", 10, 100),
      sell("LOSE", "2020-04-01", 10, 90), // -100 perdant
    ];
    render(<OperationalStatsPanel transactions={transactions} />);
    expect(screen.getByText("Transactions clôturées")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // closedCount
    expect(screen.getByText("50.00 %")).toBeInTheDocument(); // hit ratio
    expect(screen.getByText("3,00×")).toBeInTheDocument(); // win/loss
  });

  it("masque les mesures de clôture (—) tant qu'aucune vente, sans inventer de 0", () => {
    render(<OperationalStatsPanel transactions={[buy("AAPL", "2020-01-01", 10, 100)]} />);
    expect(screen.getByText(/Aucune position clôturée/i)).toBeInTheDocument();
    // au moins un tuile de clôture en tiret
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("calcule le rendement sur coût à partir des dividendes et du coût ouvert", () => {
    const transactions = [buy("D", "2020-01-01", 10, 100), dividend("D", "2020-06-01", 40)];
    render(<OperationalStatsPanel transactions={transactions} />);
    expect(screen.getByText("Rendement sur coût")).toBeInTheDocument();
    expect(screen.getByText("4.00 %")).toBeInTheDocument(); // 40 / 1000
  });
});
