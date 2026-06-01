import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import MacroPanel from "./MacroPanel";

vi.mock("../services/macro", () => ({ fetchMacroIndicators: vi.fn() }));
const { fetchMacroIndicators } = await import("../services/macro");

describe("MacroPanel", () => {
  it("affiche les indicateurs macro", async () => {
    fetchMacroIndicators.mockReset();
    fetchMacroIndicators.mockResolvedValue({
      source: "fred.stlouisfed.org",
      indicators: [{ id: "FEDFUNDS", label: "Taux directeur Fed", unit: "%", value: 5.33, date: "2026-05-01" }],
    });
    render(<MacroPanel />);
    await waitFor(() => expect(screen.getByText("Taux directeur Fed")).toBeInTheDocument());
    expect(screen.getByText("5.33 %")).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil/i)).toBeInTheDocument();
  });

  it("invite à configurer FRED_API_KEY en cas d'erreur", async () => {
    fetchMacroIndicators.mockReset();
    fetchMacroIndicators.mockImplementation(() => Promise.reject(new Error("HTTP 502")));
    render(<MacroPanel />);
    await waitFor(() => expect(screen.getByText(/Indicateurs macro indisponibles/i)).toBeInTheDocument());
    expect(screen.getByText(/FRED_API_KEY/)).toBeInTheDocument();
  });
});
