import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import InvestmentJournalPanel from "./InvestmentJournalPanel";
import { JOURNAL_KEY, getNote, loadJournal } from "../services/investmentJournalStore";

const asset = (symbol) => ({ symbol, name: `${symbol} Inc.` });

beforeEach(() => {
  localStorage.clear();
});

describe("InvestmentJournalPanel", () => {
  it("renders the journal heading for the asset symbol", () => {
    render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    expect(screen.getByRole("region", { name: /journal d'investissement/i })).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
  });

  it("prefills the form from an existing stored note", () => {
    localStorage.setItem(
      JOURNAL_KEY,
      JSON.stringify({ AAPL: { symbol: "AAPL", thesis: "Moat durable.", conviction: 4, targetPrice: 250 } }),
    );
    render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    expect(screen.getByLabelText(/thèse/i)).toHaveValue("Moat durable.");
    expect(screen.getByLabelText(/conviction/i)).toHaveValue("4");
    expect(screen.getByLabelText(/prix cible/i)).toHaveValue(250);
  });

  it("persists the note to the store on save", () => {
    render(<InvestmentJournalPanel asset={asset("MSFT")} />);
    fireEvent.change(screen.getByLabelText(/thèse/i), { target: { value: "Cloud + IA." } });
    fireEvent.change(screen.getByLabelText(/conviction/i), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: /enregistrer/i }));

    const note = getNote(loadJournal(), "MSFT");
    expect(note.thesis).toBe("Cloud + IA.");
    expect(note.conviction).toBe(5);
    expect(note.updatedAt).toBeTruthy();
  });

  it("shows an overdue review badge when the review date is past", () => {
    localStorage.setItem(
      JOURNAL_KEY,
      JSON.stringify({ AAPL: { symbol: "AAPL", reviewDate: "2000-01-01" } }),
    );
    render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    expect(screen.getByText(/revue en retard/i)).toBeInTheDocument();
  });

  it("clears a stored note with the Effacer action", () => {
    localStorage.setItem(JOURNAL_KEY, JSON.stringify({ AAPL: { symbol: "AAPL", thesis: "À revoir." } }));
    render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    fireEvent.click(screen.getByRole("button", { name: /effacer/i }));
    expect(getNote(loadJournal(), "AAPL")).toBeNull();
    expect(screen.getByLabelText(/thèse/i)).toHaveValue("");
  });

  it("reloads the note when the displayed symbol changes", () => {
    localStorage.setItem(
      JOURNAL_KEY,
      JSON.stringify({
        AAPL: { symbol: "AAPL", thesis: "Thèse Apple." },
        MSFT: { symbol: "MSFT", thesis: "Thèse Microsoft." },
      }),
    );
    const { rerender } = render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    expect(screen.getByLabelText(/thèse/i)).toHaveValue("Thèse Apple.");
    rerender(<InvestmentJournalPanel asset={asset("MSFT")} />);
    expect(screen.getByLabelText(/thèse/i)).toHaveValue("Thèse Microsoft.");
  });

  it("carries a factual disclaimer (not advice)", () => {
    render(<InvestmentJournalPanel asset={asset("AAPL")} />);
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });
});
