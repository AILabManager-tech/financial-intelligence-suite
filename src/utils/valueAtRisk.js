// VaR / CVaR (P4.11) — pures et factuelles.
//
// Sur les rendements de sous-période FLUX-NEUTRALISÉS du portefeuille (P4.2).
// Deux méthodes : paramétrique gaussienne (μ − z·σ) et historique (quantile
// empirique + CVaR = moyenne de la queue). Exprimées en PERTE % par période.
//
// Honnêteté méthodo : les périodes de la série sont irrégulières (snapshots
// possiblement espacés) ⇒ on ne prétend pas à un horizon « 1 j / 10 j » exact,
// on raisonne « par période de la série » (étiqueté). La VaR historique exige
// ≥ 10 observations pour un quantile crédible, sinon `null` (jamais inventé).

import { computeSubPeriodReturns } from "./timeWeightedReturn";

const MIN_HISTORICAL = 10;
// Quantiles normaux standard pour les niveaux de confiance usuels.
const Z = { 0.9: 1.2815516, 0.95: 1.6448536, 0.99: 2.3263479 };

export function computeValueAtRisk(snapshots, transactions = [], { confidences = [0.95, 0.99] } = {}) {
  const rets = computeSubPeriodReturns(snapshots, transactions).map((s) => s.ret);
  const n = rets.length;
  if (n < 2) {
    return { hasData: false };
  }

  const mean = rets.reduce((a, r) => a + r, 0) / n;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const sorted = [...rets].sort((a, b) => a - b); // croissant : pires pertes en tête

  const levels = confidences.map((confidence) => {
    const z = Z[confidence] ?? null;
    // VaR paramétrique : perte au quantile (positive = perte attendue dépassée 1−c).
    const varParametricPct = z === null ? null : Math.max(0, -(mean - z * sd)) * 100;

    let varHistoricalPct = null;
    let cvarHistoricalPct = null;
    if (n >= MIN_HISTORICAL) {
      const tailFraction = 1 - confidence;
      const index = Math.max(0, Math.min(sorted.length - 1, Math.floor(tailFraction * n)));
      varHistoricalPct = Math.max(0, -sorted[index]) * 100;
      const tail = sorted.slice(0, index + 1);
      const tailMean = tail.reduce((a, r) => a + r, 0) / tail.length;
      cvarHistoricalPct = Math.max(0, -tailMean) * 100;
    }

    return {
      confidence,
      varParametricPct,
      varHistoricalPct, // null tant que < 10 observations
      cvarHistoricalPct,
    };
  });

  return {
    hasData: true,
    observations: n,
    meanPct: mean * 100,
    volPct: sd * 100,
    historicalAvailable: n >= MIN_HISTORICAL,
    levels,
  };
}
