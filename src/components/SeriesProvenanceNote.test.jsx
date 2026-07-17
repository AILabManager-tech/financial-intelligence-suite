import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import SeriesProvenanceNote from "./SeriesProvenanceNote";

describe("SeriesProvenanceNote", () => {
  it("renders nothing for a real accrued series", () => {
    const { container } = render(
      <SeriesProvenanceNote snapshots={[{ snapshotDate: "2026-05-01", totalMarketValue: 1000 }]} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for an empty series", () => {
    const { container } = render(<SeriesProvenanceNote snapshots={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("discloses reconstruction when any point carries the flag", () => {
    render(
      <SeriesProvenanceNote
        snapshots={[
          { snapshotDate: "2026-05-01", totalMarketValue: 1000, reconstructed: true },
          { snapshotDate: "2026-06-01", totalMarketValue: 1100, reconstructed: true },
        ]}
      />,
    );
    expect(screen.getByText(/à partir du journal de transactions/i)).toBeInTheDocument();
    expect(screen.getByText(/factuelle mais rétrospective/i)).toBeInTheDocument();
  });
});
