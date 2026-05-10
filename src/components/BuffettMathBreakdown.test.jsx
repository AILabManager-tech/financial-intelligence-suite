import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BuffettMathBreakdown from "./BuffettMathBreakdown";

describe("BuffettMathBreakdown — KaTeX panel", () => {
  it("renders the five canonical sections", () => {
    render(
      <BuffettMathBreakdown
        ticker="AAPL"
        fcf={8.79}
        r={0.10}
        g={0.05}
        intrinsicValue={184.69}
        livePrice={293.32}
        mos={-0.5881}
      />,
    );
    expect(screen.getByRole("region", { name: /décomposition mathématique/i })).toBeInTheDocument();
    expect(screen.getByText(/Discounted Cash Flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Appliqué à AAPL/i)).toBeInTheDocument();
    expect(screen.getByText(/Marge de sécurité/i)).toBeInTheDocument();
    expect(screen.getByText(/Règle de décision/i)).toBeInTheDocument();
    expect(screen.getByText(/Critères quantitatifs/i)).toBeInTheDocument();
  });

  it("warns when the DCF diverges (r ≤ g) and skips the numeric MoS substitution", () => {
    render(
      <BuffettMathBreakdown
        ticker="AAPL"
        fcf={8.79}
        r={0.05}
        g={0.10}
        intrinsicValue={Infinity}
        livePrice={200}
        mos={NaN}
      />,
    );
    expect(screen.getByText(/le modèle diverge/i)).toBeInTheDocument();
  });

  it("includes the ticker in the applied-to section", () => {
    render(
      <BuffettMathBreakdown
        ticker="BRK.B"
        fcf={2.31}
        r={0.10}
        g={0.05}
        intrinsicValue={50}
        livePrice={420}
        mos={-7.4}
      />,
    );
    expect(screen.getByText(/Appliqué à BRK\.B/i)).toBeInTheDocument();
  });
});
