import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import LegalPage from "./LegalPage";

describe("LegalPage", () => {
  it("renders the legal, privacy and retention sections", () => {
    render(<LegalPage />);
    expect(screen.getByText("Mentions légales")).toBeInTheDocument();
    expect(screen.getByText(/Politique de confidentialité/)).toBeInTheDocument();
    expect(screen.getByText("Conservation des données")).toBeInTheDocument();
  });

  it("states the factual privacy posture (local-first, no tracking, named providers)", () => {
    render(<LegalPage />);
    expect(screen.getByText(/Aucun cookie de pistage/i)).toBeInTheDocument();
    expect(screen.getByText(/Finnhub/)).toBeInTheDocument();
    expect(screen.getByText(/Commission d'accès à l'information/)).toBeInTheDocument();
  });

  it("flags operator placeholders and that it is not legal advice", () => {
    render(<LegalPage />);
    expect(screen.getAllByText(/À COMPLÉTER/).length).toBeGreaterThan(0);
    expect(screen.getByText(/n'est pas\s+un avis juridique/i)).toBeInTheDocument();
  });
});
