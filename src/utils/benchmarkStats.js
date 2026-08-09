// Statistiques vs benchmark (P4.7 régression beta/corrélation, P4.8 ratios
// étendus) — pures et factuelles.
//
// Apparie les rendements de sous-période FLUX-NEUTRALISÉS du portefeuille (P4.2)
// avec le rendement de PRIX du benchmark sur le même intervalle, puis dérive la
// régression OLS (beta, corrélation, R²) et les ratios actifs (alpha de Jensen,
// tracking error, information ratio, Treynor, up/down capture).
//
// Factualité : < 2 paires ⇒ hasData:false. Toute statistique dont le
// dénominateur est nul (variance benchmark nulle, σ nul, beta nul…) ⇒ null,
// jamais un ∞ ni un 0 fabriqué. Annualisation étiquetée comme estimation.

import { computeSubPeriodReturns, daysBetween } from "./timeWeightedReturn";

// Même unité de temps des deux côtés (jours calendaires) — cf. portfolioRisk.js.
const CALENDAR_DAYS = 365;

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

function closeOnOrBefore(points, day) {
  let close = null;
  for (const point of points) {
    if (point.date <= day) close = point.close;
    else break;
  }
  return close;
}

// Rendements appariés { p, b } par sous-période (p = portefeuille, b = benchmark).
export function pairBenchmarkReturns(snapshots, transactions, benchmarkPoints) {
  const series = computeSubPeriodReturns(snapshots, transactions);
  const points = (Array.isArray(benchmarkPoints) ? benchmarkPoints : [])
    .map((p) => ({ date: dayKey(p?.date), close: Number(p?.close) }))
    .filter((p) => p.date && Number.isFinite(p.close))
    .sort((a, b) => a.date.localeCompare(b.date));

  const pairs = [];
  for (const sub of series) {
    const startClose = closeOnOrBefore(points, sub.fromDay);
    const endClose = closeOnOrBefore(points, sub.toDay);
    if (startClose === null || endClose === null || !(startClose > 0)) continue;
    pairs.push({ p: sub.ret, b: endClose / startClose - 1, fromDay: sub.fromDay, toDay: sub.toDay });
  }
  return pairs;
}

export function computeBenchmarkStats(snapshots, transactions, benchmarkPoints, { annualRiskFreePct = 0 } = {}) {
  const pairs = pairBenchmarkReturns(snapshots, transactions, benchmarkPoints);
  if (pairs.length < 2) {
    return { hasData: false };
  }

  const n = pairs.length;
  const from = pairs[0].fromDay;
  const to = pairs[n - 1].toDay;
  const spanDays = daysBetween(from, to) ?? n;
  const meanPeriodDays = spanDays > 0 ? spanDays / n : 1;
  const periodsPerYear = CALENDAR_DAYS / meanPeriodDays;
  const rfPerPeriod = annualRiskFreePct / 100 / periodsPerYear;

  const meanP = pairs.reduce((a, x) => a + x.p, 0) / n;
  const meanB = pairs.reduce((a, x) => a + x.b, 0) / n;
  const covPB = pairs.reduce((a, x) => a + (x.p - meanP) * (x.b - meanB), 0) / (n - 1);
  const varB = pairs.reduce((a, x) => a + (x.b - meanB) ** 2, 0) / (n - 1);
  const varP = pairs.reduce((a, x) => a + (x.p - meanP) ** 2, 0) / (n - 1);
  const sdP = Math.sqrt(varP);
  const sdB = Math.sqrt(varB);

  const beta = varB > 0 ? covPB / varB : null;
  const correlation = sdP > 0 && sdB > 0 ? covPB / (sdP * sdB) : null;
  const rSquared = correlation !== null ? correlation ** 2 : null;

  // Alpha de Jensen (annualisé) : excès portefeuille − beta × excès benchmark.
  let alphaAnnualizedPct = null;
  let treynor = null;
  if (beta !== null) {
    const alphaPerPeriod = meanP - rfPerPeriod - beta * (meanB - rfPerPeriod);
    alphaAnnualizedPct = alphaPerPeriod * periodsPerYear * 100;
    if (beta !== 0) {
      treynor = ((meanP - rfPerPeriod) * periodsPerYear) / beta;
    }
  }

  // Rendement actif (portefeuille − benchmark) : tracking error + information ratio.
  const active = pairs.map((x) => x.p - x.b);
  const meanActive = active.reduce((a, r) => a + r, 0) / n;
  const varActive = active.reduce((a, r) => a + (r - meanActive) ** 2, 0) / (n - 1);
  const sdActive = Math.sqrt(varActive);
  const trackingErrorPct = sdActive * Math.sqrt(periodsPerYear) * 100;
  const informationRatio = sdActive > 0 ? (meanActive / sdActive) * Math.sqrt(periodsPerYear) : null;

  // Up / down capture (versions arithmétiques) : somme des rendements portefeuille
  // sur les périodes où le benchmark monte / descend, rapportée au benchmark.
  let upP = 0;
  let upB = 0;
  let downP = 0;
  let downB = 0;
  for (const x of pairs) {
    if (x.b > 0) {
      upP += x.p;
      upB += x.b;
    } else if (x.b < 0) {
      downP += x.p;
      downB += x.b;
    }
  }
  const upCapturePct = upB > 0 ? (upP / upB) * 100 : null;
  const downCapturePct = downB < 0 ? (downP / downB) * 100 : null;

  return {
    hasData: true,
    pairs: n,
    days: spanDays,
    riskFreePct: annualRiskFreePct,
    beta,
    correlation,
    rSquared,
    alphaAnnualizedPct,
    trackingErrorPct,
    informationRatio,
    treynor,
    upCapturePct,
    downCapturePct,
  };
}
