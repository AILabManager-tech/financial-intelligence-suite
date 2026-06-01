// Risque portefeuille (P4.4) — volatilité + drawdown, pur et factuel.
//
// Dérivé de la série de valeur journalière (accrual de snapshots), en réutilisant
// les rendements de sous-période FLUX-NEUTRALISÉS du primitif P4.2 : un apport de
// capital ne doit pas gonfler la volatilité ni simuler un creux/sommet.
//
// Volatilité : écart-type d'échantillon (n-1) des rendements de sous-période,
// annualisé en tenant compte de l'espacement RÉEL des points (les snapshots
// peuvent sauter des jours) : σ_annuel = σ_période × √(252 / jours_moyens_période).
// Drawdown : repli maximal sur la courbe de performance flux-neutralisée (indice
// base 1), dates pic→creux, durée de récupération, repli courant, statut.
//
// Factualité stricte : < 2 rendements ⇒ hasData:false. Aucune valeur fabriquée,
// aucun backfill. Annualisation étiquetée comme estimation sur la série accumulée.

import { computeSubPeriodReturns, daysBetween } from "./timeWeightedReturn";

const TRADING_DAYS = 252;
const EPS = 1e-9;

export function computePortfolioRisk(snapshots, transactions = []) {
  const series = computeSubPeriodReturns(snapshots, transactions);
  if (series.length < 2) {
    return { hasData: false };
  }

  const rets = series.map((s) => s.ret);
  const n = rets.length;
  const mean = rets.reduce((a, r) => a + r, 0) / n;
  const variance = rets.reduce((a, r) => a + (r - mean) ** 2, 0) / (n - 1);
  const perPeriodVol = Math.sqrt(variance);

  const from = series[0].fromDay;
  const to = series[series.length - 1].toDay;
  const spanDays = daysBetween(from, to) ?? n;
  const meanPeriodDays = spanDays > 0 ? spanDays / n : 1;
  const annualizedVol = perPeriodVol * Math.sqrt(TRADING_DAYS / meanPeriodDays);

  // Courbe de performance flux-neutralisée (indice base 1 au premier point).
  const curve = [{ day: from, idx: 1 }];
  let idx = 1;
  for (const s of series) {
    idx *= s.growth;
    curve.push({ day: s.toDay, idx });
  }

  // Repli maximal pic → creux.
  let peak = curve[0].idx;
  let peakDay = curve[0].day;
  let peakValue = curve[0].idx;
  let maxDrawdown = 0;
  let ddPeakDay = null;
  let ddTroughDay = null;
  let ddPeakValue = peak;
  let troughCurveIndex = 0;
  for (let i = 0; i < curve.length; i += 1) {
    const point = curve[i];
    if (point.idx > peak) {
      peak = point.idx;
      peakDay = point.day;
      peakValue = point.idx;
    }
    const drawdown = (point.idx - peak) / peak;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      ddPeakDay = peakDay;
      ddTroughDay = point.day;
      ddPeakValue = peakValue;
      troughCurveIndex = i;
    }
  }

  // Durée de récupération : 1er point après le creux dont l'indice rejoint le pic.
  let recoveryDays = null;
  if (ddTroughDay) {
    for (let i = troughCurveIndex + 1; i < curve.length; i += 1) {
      if (curve[i].idx >= ddPeakValue - EPS) {
        recoveryDays = daysBetween(ddTroughDay, curve[i].day);
        break;
      }
    }
  }

  // Repli courant vs le sommet historique de la série.
  const overallPeak = curve.reduce((m, p) => Math.max(m, p.idx), curve[0].idx);
  const lastIdx = curve[curve.length - 1].idx;
  const currentDrawdown = overallPeak > 0 ? (lastIdx - overallPeak) / overallPeak : 0;
  const atHigh = currentDrawdown >= -EPS;

  return {
    hasData: true,
    observations: n,
    days: spanDays,
    from,
    to,
    perPeriodVolPct: perPeriodVol * 100,
    annualizedVolPct: annualizedVol * 100,
    maxDrawdownPct: maxDrawdown * 100, // ≤ 0
    maxDrawdownFrom: ddPeakDay,
    maxDrawdownTo: ddTroughDay,
    recoveryDays, // null si pas encore récupéré
    recovered: recoveryDays !== null,
    currentDrawdownPct: currentDrawdown * 100,
    atHigh,
  };
}
