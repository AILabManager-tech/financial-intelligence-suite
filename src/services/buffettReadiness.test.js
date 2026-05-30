import { describe, expect, it, vi, beforeEach } from "vitest";

import { buildBuffettSummary, fetchBuffettSummary } from "./buffettReadiness";
import { fetchFundamentals } from "./fundamentals";

vi.mock("./fundamentals", () => ({
  fetchFundamentals: vi.fn(),
}));

const fields = {
  roeTtm: { value: 43.62, source: "finnhub.io", asOf: "2026-05-09T12:00:00.000Z" },
  epsGrowth5y: { value: 11.14, source: "finnhub.io", asOf: "2026-05-09T12:00:00.000Z" },
  debtEquityAnnual: { value: 1.4142, source: "finnhub.io", asOf: "2026-05-09T12:00:00.000Z" },
  pfcfShareTtm: { value: 26.86, source: "finnhub.io", asOf: "2026-05-09T12:00:00.000Z" },
};

const asset = {
  symbol: "KO",
  price: 62.10,
};

describe("buildBuffettSummary", () => {
  it("returns a ready dashboard summary with score and signal", () => {
    const summary = buildBuffettSummary(asset, fields);

    expect(summary).toMatchObject({
      symbol: "KO",
      status: "ready",
      score: 4,
      criteriaTotal: 6,
      signal: "SELL",
      label: "Signal défavorable",
      source: "finnhub.io",
    });
    expect(Number.isFinite(summary.intrinsicValue)).toBe(true);
    expect(Number.isFinite(summary.mos)).toBe(true);
  });

  it("returns incomplete when required fields are absent", () => {
    const summary = buildBuffettSummary(asset, { roeTtm: fields.roeTtm });

    expect(summary).toMatchObject({
      symbol: "KO",
      status: "incomplete",
      score: null,
      criteriaTotal: 6,
      label: "Incomplet",
    });
    expect(summary.missing).toEqual(["epsGrowth5y", "debtEquityAnnual", "pfcfShareTtm"]);
  });
});

describe("fetchBuffettSummary", () => {
  beforeEach(() => {
    fetchFundamentals.mockReset();
  });

  it("loads fundamentals through the existing service", async () => {
    fetchFundamentals.mockResolvedValue({ fields });

    await expect(fetchBuffettSummary(asset)).resolves.toMatchObject({ status: "ready", score: 4 });
    expect(fetchFundamentals).toHaveBeenCalledWith("KO", { signal: undefined });
  });
});
