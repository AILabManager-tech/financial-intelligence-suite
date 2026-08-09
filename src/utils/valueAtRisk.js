// VaR / CVaR (P4.11) — pures et factuelles.
//
// Sur les rendements de sous-période FLUX-NEUTRALISÉS du portefeuille (P4.2).
// Deux méthodes : paramétrique gaussienne (μ − z·σ) et historique (quantile
// empirique + CVaR = moyenne de la queue). Exprimées en PERTE % par période.
//
// Honnêteté méthodo : les périodes de la série sont irrégulières (snapshots
// possiblement espacés) ⇒ on ne prétend pas à un horizon « 1 j / 10 j » exact,
// on raisonne « par période de la série » (étiqueté).
//
// Seuil d'estimabilité PAR NIVEAU. Un quantile de niveau p = 1 − confiance ne
// s'estime pas sur une queue d'un seul point : il faut au moins
// MIN_TAIL_OBSERVATIONS points sous le seuil, donc n ≥ MIN_TAIL / (1 − c).
//   95 % → 40 observations   |   99 % → 200 observations
// Un seuil global de 10 laissait `floor(0.05×10) = floor(0.01×10) = 0` : la VaR
// 95 %, la VaR 99 % et les deux CVaR rendaient toutes **le même** nombre — le
// pire rendement de la série — présenté comme un quantile à 5 % ET à 1 %.
// En dessous du seuil, `null` (jamais un chiffre mal calibré), et
// `minObservations` dit à l'interface combien il en faudrait.

import { computeSubPeriodReturns } from "./timeWeightedReturn";

const MIN_TAIL_OBSERVATIONS = 2;
// Quantiles normaux standard pour les niveaux de confiance usuels.
const Z = { 0.9: 1.2815516, 0.95: 1.6448536, 0.99: 2.3263479 };

export function minObservationsFor(confidence) {
  return Math.ceil(MIN_TAIL_OBSERVATIONS / (1 - confidence));
}

// Quantile empirique interpolé linéairement (convention type 7, celle d'Excel
// PERCENTILE et de numpy) sur une série TRIÉE croissante. `floor` seul écrasait
// des niveaux de confiance distincts sur le même point de données.
function interpolatedQuantile(sorted, p) {
  const position = p * (sorted.length - 1);
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (position - lower) * (sorted[upper] - sorted[lower]);
}

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

    const tailFraction = 1 - confidence;
    const minObservations = minObservationsFor(confidence);

    let varHistoricalPct = null;
    let cvarHistoricalPct = null;
    if (n >= minObservations) {
      varHistoricalPct = Math.max(0, -interpolatedQuantile(sorted, tailFraction)) * 100;
      // CVaR = moyenne des pertes de la queue. `MIN_TAIL_OBSERVATIONS` garantit
      // au moins 2 points ici, donc une CVaR strictement pire que la VaR.
      const tailSize = Math.max(1, Math.floor(tailFraction * n));
      const tail = sorted.slice(0, tailSize);
      const tailMean = tail.reduce((a, r) => a + r, 0) / tail.length;
      cvarHistoricalPct = Math.max(0, -tailMean) * 100;
    }

    return {
      confidence,
      varParametricPct,
      varHistoricalPct, // null tant que la queue est trop peu peuplée
      cvarHistoricalPct,
      minObservations, // ce qu'il faudrait pour estimer ce niveau
    };
  });

  return {
    hasData: true,
    observations: n,
    meanPct: mean * 100,
    volPct: sd * 100,
    historicalAvailable: levels.some((l) => l.varHistoricalPct !== null),
    levels,
  };
}
