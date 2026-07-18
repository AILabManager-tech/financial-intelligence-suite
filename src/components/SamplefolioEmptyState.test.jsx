import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SamplefolioEmptyState from "./SamplefolioEmptyState";

describe("SamplefolioEmptyState", () => {
  it("labels the example as simulated and calls onLoad on click (factuality)", () => {
    const onLoad = vi.fn();
    render(<SamplefolioEmptyState onLoad={onLoad} />);

    // the CTA names it a simulation — never presented as real data
    const button = screen.getByRole("button", { name: /exemple.*simul/i });
    expect(button).toBeInTheDocument();

    // provenance disclaimer states it is not real market data nor advice
    expect(screen.getByText(/pas des données de marché réelles/i)).toBeInTheDocument();

    fireEvent.click(button);
    expect(onLoad).toHaveBeenCalledTimes(1);
  });
});
