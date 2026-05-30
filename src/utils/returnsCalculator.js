// Pure returns calculator (P4.1 — Returns standards, base de tout factsheet).
//
// Given a FACTUAL historical price series ({date, close}), compute the standard
// performance figures of a single instrument: cumulative return, CAGR, a
// period-return matrix (1M → inception) and month-over-month returns.
//
// Factualité stricte (CLAUDE.md) : aucune valeur inventée. Une période dont les
// données ne remontent pas assez loin renvoie `pct: null` (masquée par l'UI),
// jamais un 0. Pur et déterministe : toutes les dates proviennent de la série ou
// du paramètre `asOf`, jamais de Date.now — entièrement testable.

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * MS_PER_DAY;

function toTime(dateStr) {
  return new Date(dateStr).getTime();
}

// Périodes du factsheet, dans l'ordre d'affichage. `days` = fenêtre de recul ;
// `ytd`/`inception` = bornes spéciales (calculées à part).
export const PERIOD_DEFS = Object.freeze([
  { key: "1M", label: "1 mois", days: 30 },
  { key: "3M", label: "3 mois", days: 91 },
  { key: "6M", label: "6 mois", days: 182 },
  { key: "YTD", label: "Année en cours", ytd: true },
  { key: "1Y", label: "1 an", days: 365 },
  { key: "3Y", label: "3 ans", days: 1095 },
  { key: "inception", label: "Depuis l'origine", inception: true },
]);

// Normalise + trie ascendant, en écartant tout point sans date ou sans close > 0.
function cleanSeries(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter((p) => p && p.date && Number.isFinite(p.close) && p.close > 0)
    .map((p) => ({ date: p.date, close: p.close }))
    .sort((a, b) => toTime(a.date) - toTime(b.date));
}

// Dernière clôture dont la date est <= cible (le « prix d'il y a N jours » réel,
// les marchés étant fermés certains jours). null si la série ne remonte pas là.
function closeOnOrBefore(series, targetTime) {
  let found = null;
  for (const point of series) {
    if (toTime(point.date) <= targetTime) found = point;
    else break;
  }
  return found ? found.close : null;
}

/**
 * Matrice de rendements par période.
 * @param {Array<{date:string, close:number}>} points
 * @param {{asOf?:string}} [opts]
 * @returns {Array<{key:string, label:string, pct:number|null}>}
 */
export function computePeriodReturns(points, { asOf } = {}) {
  const series = cleanSeries(points);
  if (series.length < 2) {
    return PERIOD_DEFS.map((def) => ({ key: def.key, label: def.label, pct: null }));
  }

  const last = series[series.length - 1];
  const asOfTime = asOf != null && !Number.isNaN(toTime(asOf)) ? toTime(asOf) : toTime(last.date);
  const lastClose = last.close;

  return PERIOD_DEFS.map((def) => {
    let base = null;
    if (def.inception) {
      base = series[0].close;
    } else if (def.ytd) {
      // Base YTD = dernière clôture de l'année précédente (UTC), ou à défaut la
      // première clôture de l'année en cours (série démarrée en cours d'année).
      const yearStart = Date.UTC(new Date(asOfTime).getUTCFullYear(), 0, 1);
      base = closeOnOrBefore(series, yearStart - 1);
      if (base == null) {
        const firstOfYear = series.find((p) => toTime(p.date) >= yearStart);
        base = firstOfYear ? firstOfYear.close : null;
      }
    } else {
      base = closeOnOrBefore(series, asOfTime - def.days * MS_PER_DAY);
    }

    const pct = base != null && base > 0 ? (lastClose / base - 1) * 100 : null;
    return { key: def.key, label: def.label, pct };
  });
}

/**
 * Rendements mois sur mois : dernière clôture de chaque mois, variation vs le
 * mois précédent (premier mois = null faute d'antécédent).
 * @param {Array<{date:string, close:number}>} points
 * @returns {Array<{month:string, close:number, returnPct:number|null}>}
 */
export function computeMonthlyReturns(points) {
  const series = cleanSeries(points);
  if (series.length === 0) return [];

  // Map ordonnée mois -> dernière clôture (la série est déjà triée ascendant).
  const byMonth = new Map();
  for (const point of series) {
    byMonth.set(point.date.slice(0, 7), point.close);
  }

  const months = [...byMonth.entries()];
  return months.map(([month, close], index) => {
    const prevClose = index > 0 ? months[index - 1][1] : null;
    const returnPct = prevClose != null && prevClose > 0 ? (close / prevClose - 1) * 100 : null;
    return { month, close, returnPct };
  });
}

/**
 * Figures standards de rendement d'un instrument depuis sa série de prix.
 * @param {Array<{date:string, close:number}>} points
 * @param {{asOf?:string}} [opts]
 * @returns {null | {
 *   firstDate, lastDate, lastClose, years,
 *   cumulativeReturnPct, cagrPct,
 *   periodReturns: Array<{key, label, pct}>,
 *   monthly: Array<{month, close, returnPct}>
 * }}
 */
export function computeReturns(points, { asOf } = {}) {
  const series = cleanSeries(points);
  if (series.length < 2) return null;

  const first = series[0];
  const last = series[series.length - 1];
  const years = (toTime(last.date) - toTime(first.date)) / MS_PER_YEAR;
  const cumulativeReturnPct = (last.close / first.close - 1) * 100;

  return {
    firstDate: first.date,
    lastDate: last.date,
    lastClose: last.close,
    years,
    cumulativeReturnPct,
    cagrPct: years > 0 ? (Math.pow(last.close / first.close, 1 / years) - 1) * 100 : null,
    periodReturns: computePeriodReturns(series, { asOf: asOf ?? last.date }),
    monthly: computeMonthlyReturns(series),
  };
}
