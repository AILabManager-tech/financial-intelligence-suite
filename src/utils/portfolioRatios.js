// Ratios de risque ajusté (P4.5) — Sharpe / Sortino / Calmar, purs et factuels.
//
// Dérivés des rendements de sous-période FLUX-NEUTRALISÉS (primitif P4.2) et du
// repli maximal (P4.4). Le taux sans risque est une HYPOTHÈSE étiquetée (défaut
// 0 %), pas une donnée de marché live — conforme à la règle « what-if étiqueté ».
//
//  - Sharpe  = (excès de rendement moyen / σ) annualisé × √(périodes/an)
//  - Sortino = (excès / déviation à la baisse) annualisé × √(périodes/an)
//  - Calmar  = rendement annualisé / |repli max|  (seulement si série ≥ 1 an,
//    car annualiser un rendement sur quelques semaines serait trompeur)
//
// Factualité stricte : < 2 rendements ⇒ hasData:false. Ratio masqué (null) quand
// son dénominateur est nul (σ=0, aucune baisse) plutôt qu'un ∞ fabriqué.

import { computeSubPeriodReturns, daysBetween } from "./timeWeightedReturn";
import { computePortfolioRisk } from "./portfolioRisk";

// Nombre de sous-périodes par an = 365 / espacement moyen en jours CALENDAIRES.
// Les deux termes doivent partager la même unité : `daysBetween` compte en
// calendaire, donc 252 (jours de bourse) au numérateur sous-estimait tous les
// ratios annualisés de ~15 %. Voir la note détaillée dans portfolioRisk.js.
const CALENDAR_DAYS = 365;

export function computePortfolioRatios(snapshots, transactions = [], { annualRiskFreePct = 0 } = {}) {
  const series = computeSubPeriodReturns(snapshots, transactions);
  if (series.length < 2) {
    return { hasData: false };
  }

  const rets = series.map((s) => s.ret);
  const n = rets.length;
  const from = series[0].fromDay;
  const to = series[series.length - 1].toDay;
  const spanDays = daysBetween(from, to) ?? n;
  const meanPeriodDays = spanDays > 0 ? spanDays / n : 1;
  const periodsPerYear = CALENDAR_DAYS / meanPeriodDays;
  const annualizationFactor = Math.sqrt(periodsPerYear);

  // Taux sans risque ramené à la période (hypothèse).
  const rfPerPeriod = annualRiskFreePct / 100 / periodsPerYear;

  const mean = rets.reduce((a, r) => a + r, 0) / n;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const meanExcess = mean - rfPerPeriod;

  const sharpe = sd > 0 ? (meanExcess / sd) * annualizationFactor : null;

  // Déviation à la baisse vs le MAR (= taux sans risque) : moyenne sur N des
  // carrés des écarts négatifs seulement (convention Sortino).
  const downsideSqSum = rets.reduce((a, r) => {
    const d = Math.min(0, r - rfPerPeriod);
    return a + d * d;
  }, 0);
  const downsideDev = Math.sqrt(downsideSqSum / n);
  const sortino = downsideDev > 0 ? (meanExcess / downsideDev) * annualizationFactor : null;

  // Calmar : rendement annualisé / |repli max|. Annualiser un rendement exige une
  // série ≥ 1 an pour ne pas extrapoler quelques semaines en chiffre annuel.
  const cumulative = series.reduce((acc, s) => acc * s.growth, 1);
  const risk = computePortfolioRisk(snapshots, transactions);
  const maxDrawdown = risk.hasData ? risk.maxDrawdownPct / 100 : 0; // ≤ 0
  let annualizedReturnPct = null;
  let calmar = null;
  if (spanDays >= 365 && cumulative > 0) {
    annualizedReturnPct = (cumulative ** (365 / spanDays) - 1) * 100;
    if (maxDrawdown < 0) {
      calmar = annualizedReturnPct / 100 / Math.abs(maxDrawdown);
    }
  }

  return {
    hasData: true,
    observations: n,
    days: spanDays,
    riskFreePct: annualRiskFreePct,
    sharpe, // null si σ = 0
    sortino, // null si aucune baisse
    calmar, // null tant que série < 1 an
    annualizedReturnPct, // null tant que série < 1 an
  };
}
