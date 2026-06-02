import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import TaxReportPanel from "./TaxReportPanel";

const TXS = [
  { type: "buy", symbol: "AAPL", date: "2023-01-02", quantity: 10, price: 100, fee: 0 },
  { type: "sell", symbol: "AAPL", date: "2024-03-10", quantity: 10, price: 250, fee: 0 },
];

describe("TaxReportPanel", () => {
  it("shows realized dispositions grouped by year with the gain", () => {
    render(<TaxReportPanel transactions={TXS} method="fifo" />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("AAPL")).toBeInTheDocument();
    expect(screen.getByText(/Exporter CSV/i)).toBeInTheDocument();
  });

  it("discloses the ACB caveat and that it is not advice", () => {
    render(<TaxReportPanel transactions={TXS} method="fifo" />);
    expect(screen.getByText(/PBR\/ACB/)).toBeInTheDocument();
    expect(screen.getByText(/pas un conseil fiscal/i)).toBeInTheDocument();
  });

  it("shows an honest empty state with no dispositions", () => {
    render(<TaxReportPanel transactions={[{ type: "buy", symbol: "AAPL", date: "2023-01-02", quantity: 10, price: 100 }]} method="fifo" />);
    expect(screen.getByText(/Aucune disposition réalisée/i)).toBeInTheDocument();
  });
});
