import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ReconstructedSnapshotsBanner from "./ReconstructedSnapshotsBanner";

describe("ReconstructedSnapshotsBanner", () => {
  it("renders nothing when inactive (real portfolio)", () => {
    const { container } = render(<ReconstructedSnapshotsBanner active={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("labels the performance surface as reconstituted when active (demo variant)", () => {
    render(<ReconstructedSnapshotsBanner active />);
    expect(screen.getByText(/performance reconstituée/i)).toBeInTheDocument();
    expect(screen.getByText(/pas/i)).toBeInTheDocument();
  });

  it("uses the journal wording for a real cold-start mandate", () => {
    render(<ReconstructedSnapshotsBanner active variant="journal" />);
    expect(screen.getByText(/reconstruite à partir du journal/i)).toBeInTheDocument();
    expect(screen.getByText(/clôtures historiques\s+réelles/i)).toBeInTheDocument();
  });
});
