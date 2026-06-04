import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import GuidePage from "./GuidePage";

describe("GuidePage", () => {
  it("renders the standard guide by default with a print action and three level tabs", () => {
    render(<GuidePage />);
    expect(screen.getByRole("heading", { name: /Guide d'utilisation/i, level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Détaillé" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Intermédiaire" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Aide-mémoire" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Intermédiaire" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: /Imprimer/i })).toBeInTheDocument();
    // standard guide body rendered from markdown
    expect(screen.getByText(/Version intermédiaire/i)).toBeInTheDocument();
  });

  it("switches the rendered guide when another level is selected", () => {
    render(<GuidePage />);
    expect(screen.queryByText(/Version détaillée/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Détaillé" }));
    expect(screen.getByText(/Version détaillée/i)).toBeInTheDocument();
  });

  it("renders GFM tables from the markdown source", () => {
    render(<GuidePage />);
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
  });
});
