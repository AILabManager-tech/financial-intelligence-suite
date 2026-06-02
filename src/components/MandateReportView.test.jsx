import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/priceHistory", () => ({ fetchPriceHistory: vi.fn() }));

import { fetchPriceHistory } from "../services/priceHistory";
import MandateReportView from "./MandateReportView";

const MANDATE = { name: "Client A", client: "A inc.", accountType: "taxable", baseCurrency: "USD" };
const ASSETS = [{ symbol: "AAPL", name: "Apple", price: 200, position: { quantity: 10, averageCost: 100 } }];

describe("MandateReportView", () => {
  it("renders the mandate report header, summary and positions", () => {
    fetchPriceHistory.mockResolvedValue({ points: [] });
    render(<MandateReportView mandate={MANDATE} assets={ASSETS} />);
    expect(screen.getByText(/Rapport de mandat — Client A/)).toBeInTheDocument();
    expect(screen.getByText("Sommaire")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("discloses that Brinson attribution is blocked and it is not advice", () => {
    fetchPriceHistory.mockResolvedValue({ points: [] });
    render(<MandateReportView mandate={MANDATE} assets={ASSETS} />);
    expect(screen.getByText(/Brinson/)).toBeInTheDocument();
    expect(screen.getByText(/Pas un conseil/i)).toBeInTheDocument();
  });

  it("triggers the browser print dialog from the toolbar", async () => {
    fetchPriceHistory.mockResolvedValue({ points: [] });
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(<MandateReportView mandate={MANDATE} assets={ASSETS} />);
    screen.getByLabelText(/Imprimer ou enregistrer le rapport en PDF/i).click();
    await waitFor(() => expect(printSpy).toHaveBeenCalled());
    printSpy.mockRestore();
  });

  it("renders PM commentary entries and adds a new dated note", () => {
    fetchPriceHistory.mockResolvedValue({ points: [] });
    const onAddComment = vi.fn();
    render(
      <MandateReportView
        mandate={MANDATE}
        assets={ASSETS}
        commentary={[{ id: "c1", date: "2026-03-31", text: "Trimestre solide." }]}
        onAddComment={onAddComment}
        onRemoveComment={vi.fn()}
      />,
    );
    expect(screen.getByText("Trimestre solide.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Texte du commentaire"), { target: { value: "Nouvelle note" } });
    fireEvent.click(screen.getByLabelText("Ajouter le commentaire"));
    expect(onAddComment).toHaveBeenCalledWith(expect.objectContaining({ text: "Nouvelle note" }));
  });
});
