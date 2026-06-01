// Comparaison au benchmark (P4.6), pure et factuelle.
//
// Compare le TWR du portefeuille (effet gérant, flux neutralisés — P4.2) au
// rendement de prix d'un indice de référence sur LA MÊME fenêtre [from, to] que
// la série de snapshots, et expose l'excès de rendement. Le benchmark n'a pas de
// flux : son rendement = variation de prix point à point sur la fenêtre.
//
// Factualité : si la série du benchmark ne couvre pas la fenêtre du portefeuille,
// le rendement benchmark et l'excès sont `null` (jamais extrapolés). L'excès
// annualisé n'est exposé qu'à partir de 365 j.

import { computeTimeWeightedReturn } from "./timeWeightedReturn";

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

// Clôture du dernier point dont la date est ≤ `day` (série triée croissante).
function closeOnOrBefore(points, day) {
  let close = null;
  for (const point of points) {
    if (point.date <= day) close = point.close;
    else break;
  }
  return close;
}

export function computeBenchmarkComparison(snapshots, transactions, benchmarkPoints, { benchmarkLabel = null } = {}) {
  const twr = computeTimeWeightedReturn(snapshots, transactions);
  if (!twr.hasData) {
    return { hasData: false };
  }

  const points = (Array.isArray(benchmarkPoints) ? benchmarkPoints : [])
    .map((p) => ({ date: dayKey(p?.date), close: Number(p?.close) }))
    .filter((p) => p.date && Number.isFinite(p.close))
    .sort((a, b) => a.date.localeCompare(b.date));

  const startClose = closeOnOrBefore(points, twr.from);
  const endClose = closeOnOrBefore(points, twr.to);

  let benchmarkReturnPct = null;
  let excessPct = null;
  if (startClose !== null && endClose !== null && startClose > 0) {
    benchmarkReturnPct = ((endClose - startClose) / startClose) * 100;
    excessPct = twr.twrPct - benchmarkReturnPct;
  }

  return {
    hasData: true,
    benchmarkLabel,
    portfolioReturnPct: twr.twrPct,
    benchmarkReturnPct, // null si la série benchmark ne couvre pas la fenêtre
    excessPct, // portefeuille − benchmark, même fenêtre
    from: twr.from,
    to: twr.to,
    days: twr.days,
    covered: benchmarkReturnPct !== null,
  };
}
