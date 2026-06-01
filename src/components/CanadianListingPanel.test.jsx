import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CanadianListingPanel from "./CanadianListingPanel";

describe("CanadianListingPanel", () => {
  it("surfaces the venue and usual quote currency for a Canadian listing", () => {
    render(<CanadianListingPanel asset={{ symbol: "SHOP.TO" }} />);
    expect(screen.getByText(/Toronto Stock Exchange/)).toBeInTheDocument();
    expect(screen.getByText("CAD")).toBeInTheDocument();
  });

  it("discloses the blocked-data limitations honestly", () => {
    render(<CanadianListingPanel asset={{ symbol: "XYZ.CN" }} />);
    expect(screen.getByText(/SEDAR\+/)).toBeInTheDocument();
    expect(screen.getByText(/retenue 15/i)).toBeInTheDocument();
  });

  it("renders nothing for non-Canadian symbols", () => {
    const { container } = render(<CanadianListingPanel asset={{ symbol: "AAPL" }} />);
    expect(container).toBeEmptyDOMElement();
  });
});
