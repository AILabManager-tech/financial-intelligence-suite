import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TransactionJournalPanel from "./TransactionJournalPanel";
import { formatCurrency } from "../utils/scoreTranslator";

// Summary table column order: symbol, open qty, avg cost, cost basis, realized.
const REALIZED_COL = 4;

const fifoLifo = [
  { id: "t1", type: "buy", symbol: "AAPL", date: "2020-01-01", quantity: 10, price: 100, fee: 0, amount: 0 },
  { id: "t2", type: "buy", symbol: "AAPL", date: "2020-06-01", quantity: 10, price: 200, fee: 0, amount: 0 },
  { id: "t3", type: "sell", symbol: "AAPL", date: "2021-01-01", quantity: 10, price: 250, fee: 0, amount: 0 },
];

describe("TransactionJournalPanel", () => {
  it("affiche un état vide quand il n'y a aucune transaction", () => {
    render(<TransactionJournalPanel transactions={[]} onAdd={() => {}} onRemove={() => {}} />);
    expect(screen.getByText(/Aucune transaction enregistrée/i)).toBeInTheDocument();
  });

  it("saisit un achat et appelle onAdd avec le brouillon normalisé", () => {
    const onAdd = vi.fn();
    render(<TransactionJournalPanel transactions={[]} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.change(screen.getByLabelText("Symbole"), { target: { value: "aapl" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2020-01-01" } });
    fireEvent.change(screen.getByLabelText("Quantité"), { target: { value: "10" } });
    fireEvent.change(screen.getByLabelText("Prix unitaire"), { target: { value: "100" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter la transaction/ }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "buy", symbol: "AAPL", date: "2020-01-01", quantity: 10, price: 100 }),
    );
  });

  it("refuse une saisie incomplète sans appeler onAdd", () => {
    const onAdd = vi.fn();
    render(<TransactionJournalPanel transactions={[]} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.click(screen.getByRole("button", { name: /Ajouter la transaction/ }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/requis/i)).toBeInTheDocument();
  });

  it("bascule la saisie vers Montant pour un dividende", () => {
    const onAdd = vi.fn();
    render(<TransactionJournalPanel transactions={[]} onAdd={onAdd} onRemove={() => {}} />);
    fireEvent.change(screen.getByLabelText("Type de transaction"), { target: { value: "dividend" } });
    expect(screen.queryByLabelText("Quantité")).toBeNull();
    fireEvent.change(screen.getByLabelText("Symbole"), { target: { value: "msft" } });
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2021-02-01" } });
    fireEvent.change(screen.getByLabelText("Montant"), { target: { value: "25" } });
    fireEvent.click(screen.getByRole("button", { name: /Ajouter la transaction/ }));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "dividend", symbol: "MSFT", amount: 25 }),
    );
  });

  it("calcule le P&L réalisé par symbole et recalcule en LIFO", () => {
    const { container } = render(<TransactionJournalPanel transactions={fifoLifo} onAdd={() => {}} onRemove={() => {}} />);
    // Première ligne de la table de synthèse (par symbole), colonne réalisé.
    const realized = () => container.querySelector("table tbody tr").cells[REALIZED_COL].textContent;
    // FIFO par défaut : vend le lot @100 -> réalisé 1500
    expect(realized()).toBe(formatCurrency(1500));
    fireEvent.click(screen.getByRole("button", { name: "lifo" }));
    // LIFO : vend le lot @200 -> réalisé 500
    expect(realized()).toBe(formatCurrency(500));
  });

  it("supprime une transaction via son bouton", () => {
    const onRemove = vi.fn();
    render(<TransactionJournalPanel transactions={fifoLifo} onAdd={() => {}} onRemove={onRemove} />);
    fireEvent.click(screen.getByRole("button", { name: /Supprimer la transaction AAPL du 2021-01-01/ }));
    expect(onRemove).toHaveBeenCalledWith("t3");
  });
});

describe("TransactionJournalPanel — import d'un relevé", () => {
  const csv = [
    "Date de transaction,Opération,Symbole,Quantité,Prix unitaire,Frais",
    "2026-03-06,Achat,VOO,2,517.84,9.95",
    "2026-03-07,Transfert entrant,VOO,5,",
  ].join("\n");

  function fileOf(text, name = "releve.csv") {
    const file = new File([text], name, { type: "text/csv" });
    // jsdom n'implémente pas File.text(), qui est standard et disponible dans
    // tous les navigateurs (PortfolioManager l'utilise déjà en prod). On comble
    // la lacune de l'environnement, pas un défaut du composant.
    file.text = async () => text;
    return file;
  }

  it("montre un aperçu avant d'écrire, avec les lignes rejetées et leur numéro", async () => {
    render(<TransactionJournalPanel transactions={[]} onAdd={vi.fn()} onRemove={vi.fn()} onImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Importer un relevé de transactions CSV/i), {
      target: { files: [fileOf(csv)] },
    });
    await waitFor(() => expect(screen.getByText("releve.csv")).toBeInTheDocument());
    expect(screen.getByText(/transaction\(s\) lisibles/)).toBeInTheDocument();
    expect(screen.getByText(/ligne\(s\) rejetée\(s\)/)).toBeInTheDocument();
    // La ligne fautive est nommée par son numéro et sa raison, pas juste comptée.
    expect(screen.getByText(/Ligne 3 —.*Transfert entrant/)).toBeInTheDocument();
  });

  it("n'écrit rien tant que l'import n'est pas confirmé", async () => {
    const onImport = vi.fn();
    render(<TransactionJournalPanel transactions={[]} onAdd={vi.fn()} onRemove={vi.fn()} onImport={onImport} />);
    fireEvent.change(screen.getByLabelText(/Importer un relevé de transactions CSV/i), {
      target: { files: [fileOf(csv)] },
    });
    await waitFor(() => expect(screen.getByText("releve.csv")).toBeInTheDocument());
    expect(onImport).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Ajouter au journal"));
    expect(onImport).toHaveBeenCalledWith([expect.objectContaining({ symbol: "VOO", type: "buy", quantity: 2 })]);
  });

  it("avertit qu'un journal incomplet fausse les gains réalisés", async () => {
    render(<TransactionJournalPanel transactions={[]} onAdd={vi.fn()} onRemove={vi.fn()} onImport={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Importer un relevé de transactions CSV/i), {
      target: { files: [fileOf(csv)] },
    });
    await waitFor(() => expect(screen.getByText(/fausse les gains réalisés/i)).toBeInTheDocument());
  });
});
