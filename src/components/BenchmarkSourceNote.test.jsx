import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import BenchmarkSourceNote from "./BenchmarkSourceNote";

const POINTS = [
  { date: "2022-01-03", close: 470 },
  { date: "2022-12-19", close: 383 },
  { date: "2022-06-10", close: 389 },
];

describe("BenchmarkSourceNote", () => {
  it("names the benchmark price source and the last close date", () => {
    const { container } = render(
      <BenchmarkSourceNote label="S&P 500" source="twelvedata.com" points={POINTS} fetchedAt="2026-07-17T12:00:00Z" />,
    );
    expect(screen.getByText("twelvedata.com")).toBeInTheDocument();
    expect(container.textContent).toContain("Prix S&P 500");
    // as-of = the max date in the series, not fetch time nor series order
    expect(container.textContent).toContain("série jusqu'au");
    expect(container.textContent).not.toContain("2022-01-03");
  });

  it("renders nothing when no source is available", () => {
    const { container } = render(<BenchmarkSourceNote label="S&P 500" source={null} points={POINTS} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("omits the as-of clause when the series has no points", () => {
    render(<BenchmarkSourceNote label="Nasdaq 100" source="twelvedata.com" points={[]} />);
    expect(screen.getByText("twelvedata.com")).toBeInTheDocument();
    expect(screen.queryByText(/série jusqu'au/)).toBeNull();
  });
});
