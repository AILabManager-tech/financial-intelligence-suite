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
  // Garde anti-point-gratuit : un critère qui ne peut pas échouer pour les
  // entrées que CE pipeline accepte gonfle le score sans rien mesurer.
  // `extractBuffettInputs` refuse pfcf <= 0, donc fcf = prix/pfcf est toujours
  // > 0 : le critère « FCF > 0 » était acquis d'office pour tout titre analysé.
  it("ne compte aucun critère structurellement toujours réussi", () => {
    const fields = ({ roe = 20, g5 = 10, de = 0.3, pfcf = 10 }) => ({
      roeTtm: { value: roe, source: "finnhub.io", asOf: "2026-01-01" },
      epsGrowth5y: { value: g5 },
      debtEquityAnnual: { value: de },
      pfcfShareTtm: { value: pfcf },
    });
    // Balayage large des entrées RÉELLEMENT analysables par le pipeline.
    const failuresByCriterion = new Map();
    let analysed = 0;
    for (const roe of [5, 20]) {
      for (const g5 of [1, 10]) {
        for (const de of [0.3, 2]) {
          for (const pfcf of [0.5, 10, 30]) {
            for (const price of [1, 100, 10_000]) {
              const summary = buildBuffettSummary({ symbol: "T", price }, fields({ roe, g5, de, pfcf }));
              if (summary.status !== "ready") continue;
              analysed += 1;
              for (const criterion of summary.criteria) {
                const seen = failuresByCriterion.get(criterion.label) ?? 0;
                failuresByCriterion.set(criterion.label, seen + (criterion.status === "FAIL" ? 1 : 0));
              }
            }
          }
        }
      }
    }
    expect(analysed).toBeGreaterThan(20);
    // Chaque critère compté dans le score doit pouvoir échouer au moins une fois.
    for (const [label, failures] of failuresByCriterion) {
      expect(failures, `le critère « ${label} » n'échoue jamais : point gratuit`).toBeGreaterThan(0);
    }
  });

  it("returns a ready dashboard summary with score and signal", () => {
    const summary = buildBuffettSummary(asset, fields);

    expect(summary).toMatchObject({
      symbol: "KO",
      status: "ready",
      // 3/5 et non 4/6 : le point acquis d'office (« FCF > 0 ») ne compte plus.
      score: 3,
      criteriaTotal: 5,
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
      criteriaTotal: 5,
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

    await expect(fetchBuffettSummary(asset)).resolves.toMatchObject({ status: "ready", score: 3 });
    expect(fetchFundamentals).toHaveBeenCalledWith("KO", { signal: undefined });
  });
});
