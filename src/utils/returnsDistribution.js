// Pure distribution of monthly returns (P4.10). Given the month-over-month
// returns produced by returnsCalculator, summarise their distribution: share of
// positive months, best/worst month, dispersion, shape (skewness / excess
// kurtosis) and a histogram. Catalogue feature dérivée du prix factuel — aucune
// valeur inventée : insuffisant ⇒ null, mesures de forme masquées si non sûres.
//
// Pur et déterministe : opère sur la série fournie, pas de réseau ni Date.now.

// Tranches de l'histogramme (en % de rendement mensuel). Bornes : min inclus,
// max exclu ; les extrêmes débordent vers ±Infinity → chaque valeur tombe dans
// exactement une tranche, somme des comptes = nombre de mois.
export const HISTOGRAM_BUCKETS = Object.freeze([
  { label: "≤ −10 %", min: -Infinity, max: -10 },
  { label: "−10 à −5 %", min: -10, max: -5 },
  { label: "−5 à −2 %", min: -5, max: -2 },
  { label: "−2 à 0 %", min: -2, max: 0 },
  { label: "0 à 2 %", min: 0, max: 2 },
  { label: "2 à 5 %", min: 2, max: 5 },
  { label: "5 à 10 %", min: 5, max: 10 },
  { label: "≥ 10 %", min: 10, max: Infinity },
]);

function bucketOf(value) {
  return HISTOGRAM_BUCKETS.findIndex((b) => value >= b.min && value < b.max);
}

/**
 * @param {Array<{month:string, returnPct:number|null}>} monthlyReturns
 * @returns {null | {
 *   count, averagePct, positiveMonthsPct, stdDevPct,
 *   bestMonth: {month, returnPct}, worstMonth: {month, returnPct},
 *   skewness: number|null, kurtosis: number|null,
 *   histogram: Array<{label, count}>
 * }}
 */
export function computeDistribution(monthlyReturns) {
  if (!Array.isArray(monthlyReturns)) return null;

  const series = monthlyReturns.filter(
    (m) => m && typeof m.returnPct === "number" && Number.isFinite(m.returnPct),
  );
  const n = series.length;
  if (n < 2) return null;

  const values = series.map((m) => m.returnPct);
  const sum = values.reduce((a, v) => a + v, 0);
  const mean = sum / n;

  const positiveCount = values.filter((v) => v > 0).length;

  // Écart-type d'échantillon (n-1) pour le reporting.
  const sumSqDev = values.reduce((a, v) => a + (v - mean) ** 2, 0);
  const stdDevPct = n > 1 ? Math.sqrt(sumSqDev / (n - 1)) : 0;

  // Best / worst (ties → premier rencontré, série en ordre chronologique).
  let best = series[0];
  let worst = series[0];
  for (const m of series) {
    if (m.returnPct > best.returnPct) best = m;
    if (m.returnPct < worst.returnPct) worst = m;
  }

  // Moments standardisés (population, /n) pour skewness g1 et kurtosis excess g2.
  const m2 = sumSqDev / n;
  const popStd = Math.sqrt(m2);
  let skewness = null;
  let kurtosis = null;
  if (n >= 3 && popStd > 0) {
    const m3 = values.reduce((a, v) => a + (v - mean) ** 3, 0) / n;
    const m4 = values.reduce((a, v) => a + (v - mean) ** 4, 0) / n;
    skewness = m3 / popStd ** 3;
    kurtosis = m4 / m2 ** 2 - 3;
  }

  const histogram = HISTOGRAM_BUCKETS.map((b) => ({ label: b.label, count: 0 }));
  for (const v of values) histogram[bucketOf(v)].count += 1;

  return {
    count: n,
    averagePct: mean,
    positiveMonthsPct: (positiveCount / n) * 100,
    stdDevPct,
    bestMonth: { month: best.month, returnPct: best.returnPct },
    worstMonth: { month: worst.month, returnPct: worst.returnPct },
    skewness,
    kurtosis,
    histogram,
  };
}
