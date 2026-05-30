import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

vi.mock("../services/marketDataHealth", () => ({
  fetchMarketDataHealth: vi.fn(),
}));

import { fetchMarketDataHealth } from "../services/marketDataHealth";
import MarketDataHealthPanel from "./MarketDataHealthPanel";

// A single provider (finnhub.io) exposes several capabilities, so the health
// payload carries multiple rows with the SAME `provider` value. Keying rows by
// provider alone collided (React "two children with the same key" warning seen
// live on the dashboard). Rows are now keyed by provider + capability.
const PAYLOAD = {
  status: "ok",
  checkedAt: "2026-05-29T00:00:00.000Z",
  providers: [
    { provider: "finnhub.io", capability: "quote", status: "ok", latencyMs: 42, sample: "AAPL" },
    { provider: "finnhub.io", capability: "fundamentals", status: "ok", latencyMs: 51, sample: "AAPL" },
    { provider: "finnhub.io", capability: "company-news", status: "ok", latencyMs: 63, sample: "AAPL" },
    { provider: "twelvedata.com", capability: "history", status: "ok", latencyMs: 80, sample: "AAPL" },
  ],
};

describe("MarketDataHealthPanel", () => {
  let errorSpy;

  beforeEach(() => {
    fetchMarketDataHealth.mockResolvedValue(PAYLOAD);
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it("rend une carte par capability même quand le provider se répète", async () => {
    render(<MarketDataHealthPanel />);
    await waitFor(() => {
      expect(screen.getAllByText("finnhub.io").length).toBe(3);
    });
    expect(screen.getByText("twelvedata.com")).toBeInTheDocument();
    expect(screen.getByText("quote")).toBeInTheDocument();
    expect(screen.getByText("fundamentals")).toBeInTheDocument();
    expect(screen.getByText("company-news")).toBeInTheDocument();
  });

  it("ne déclenche aucun avertissement React de clé dupliquée", async () => {
    render(<MarketDataHealthPanel />);
    await waitFor(() => {
      expect(screen.getAllByText("finnhub.io").length).toBe(3);
    });
    const dupKeyWarning = errorSpy.mock.calls.some((args) =>
      String(args[0] ?? "").includes("same key"),
    );
    expect(dupKeyWarning).toBe(false);
  });
});
