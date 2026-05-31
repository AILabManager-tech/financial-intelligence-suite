// Asset drawdown analysis (P5.x) — pure, derived from a FACTUAL close-price
// series ({ date, close }), the same /api/history feed the returns panels use.
// Drawdown = the decline from the running peak; this surfaces the worst
// peak-to-trough episode (max drawdown, its dates and duration), whether it has
// since recovered, and the current drawdown from the latest running peak.
//
// Asset-level only — distinct from the portfolio drawdown (P4.4) that needs the
// snapshot value series. Factuality: a flat/rising series has a real 0% drawdown
// (a computed value, not a fabricated one); an insufficient series returns null
// so the panel hides rather than inventing numbers.

const MS_PER_DAY = 86_400_000;

function toTime(dateStr) {
  return new Date(dateStr).getTime();
}

// Normalise + sort ascending, dropping any point without a date or a close > 0.
function cleanSeries(points) {
  if (!Array.isArray(points)) return [];
  return points
    .filter((p) => p && p.date && Number.isFinite(p.close) && p.close > 0)
    .map((p) => ({ date: p.date, close: p.close }))
    .sort((a, b) => toTime(a.date) - toTime(b.date));
}

export function computeDrawdown(points) {
  const series = cleanSeries(points);
  if (series.length < 2) return null;

  let peak = series[0].close;
  let peakDate = series[0].date;
  let maxDrawdownPct = 0;
  let mddPeakClose = peak;
  let mddPeakDate = peakDate;
  let mddTroughClose = peak;
  let mddTroughDate = peakDate;

  for (const point of series) {
    if (point.close > peak) {
      peak = point.close;
      peakDate = point.date;
    }
    const ddPct = ((point.close - peak) / peak) * 100;
    if (ddPct < maxDrawdownPct) {
      maxDrawdownPct = ddPct;
      mddPeakClose = peak;
      mddPeakDate = peakDate;
      mddTroughClose = point.close;
      mddTroughDate = point.date;
    }
  }

  // Current drawdown from the running peak over the whole series.
  const last = series[series.length - 1];
  const currentDrawdownPct = ((last.close - peak) / peak) * 100;

  // Recovered = price returned to the worst episode's prior peak after the trough.
  const recovered = series.some(
    (p) => toTime(p.date) > toTime(mddTroughDate) && p.close >= mddPeakClose,
  );

  const drawdownDays = Math.round((toTime(mddTroughDate) - toTime(mddPeakDate)) / MS_PER_DAY);

  return {
    maxDrawdownPct,
    peakDate: mddPeakDate,
    peakClose: mddPeakClose,
    troughDate: mddTroughDate,
    troughClose: mddTroughClose,
    currentDrawdownPct: currentDrawdownPct < 0 ? currentDrawdownPct : 0,
    atHigh: currentDrawdownPct >= 0,
    recovered: maxDrawdownPct === 0 ? true : recovered,
    drawdownDays,
    observations: series.length,
  };
}
