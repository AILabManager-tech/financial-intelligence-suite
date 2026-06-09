import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import PanelErrorBoundary from "./PanelErrorBoundary";

function Boom() {
  throw new Error("panel exploded");
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("PanelErrorBoundary", () => {
  it("renders children unchanged when they don't throw", () => {
    render(
      <PanelErrorBoundary>
        <div data-testid="ok">contenu sain</div>
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toHaveTextContent("contenu sain");
  });

  it("shows a contained fallback instead of propagating a render throw", () => {
    // React logs the caught error to console.error — silence it for a clean run.
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <PanelErrorBoundary>
        <Boom />
      </PanelErrorBoundary>,
    );
    expect(screen.getByRole("region", { name: "Panneau indisponible" })).toBeInTheDocument();
    expect(screen.getByText(/temporairement indisponible/i)).toBeInTheDocument();
  });

  it("recovers when resetKey changes", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { rerender } = render(
      <PanelErrorBoundary resetKey="AAPL">
        <Boom />
      </PanelErrorBoundary>,
    );
    expect(screen.getByRole("region", { name: "Panneau indisponible" })).toBeInTheDocument();
    rerender(
      <PanelErrorBoundary resetKey="MSFT">
        <div data-testid="ok">rétabli</div>
      </PanelErrorBoundary>,
    );
    expect(screen.getByTestId("ok")).toHaveTextContent("rétabli");
  });
});
