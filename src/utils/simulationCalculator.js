// Pure what-if simulator (P2.1). Given a FACTUAL historical price series, compute
// what an initial lump sum invested at a start date would be worth at the end of
// the series. This is a hypothetical illustration derived from real data — never
// a prediction or advice; the UI (P2.3) labels it as such.
//
// No network, no Date.now: every date comes from the series itself, so the result
// is deterministic and fully testable.

function toTime(dateStr) {
  return new Date(dateStr).getTime();
}

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * @param {Array<{date:string, close:number}>} points  ascending or unsorted
 * @param {{amount:number, startDate?:string}} params
 * @returns {null | {
 *   initialAmount, entryDate, entryPrice, shares, finalDate, finalValue,
 *   totalReturn, totalReturnPct, cagrPct, years, curve: Array<{date, value}>
 * }}
 */
export function simulateInvestment(points, { amount, startDate } = {}) {
  if (!Array.isArray(points) || points.length < 2) return null;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const series = points
    .filter((p) => p && p.date && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => toTime(a.date) - toTime(b.date));
  if (series.length < 2) return null;

  const startTime = startDate != null ? toTime(startDate) : toTime(series[0].date);
  if (Number.isNaN(startTime)) return null;

  // Entry = first available point on or after the start date (real data may have
  // no quote exactly on that calendar day — markets close on weekends/holidays).
  const entry = series.find((p) => toTime(p.date) >= startTime);
  if (!entry) return null; // start date is after the whole series

  const tail = series.filter((p) => toTime(p.date) >= toTime(entry.date));
  if (tail.length < 2) return null;

  const entryPrice = entry.close;
  const shares = amount / entryPrice;
  const last = tail[tail.length - 1];
  const finalValue = shares * last.close;
  const years = (toTime(last.date) - toTime(entry.date)) / MS_PER_YEAR;

  return {
    initialAmount: amount,
    entryDate: entry.date,
    entryPrice,
    shares,
    finalDate: last.date,
    finalValue,
    totalReturn: finalValue - amount,
    totalReturnPct: (finalValue / amount - 1) * 100,
    cagrPct: years > 0 ? (Math.pow(finalValue / amount, 1 / years) - 1) * 100 : null,
    years,
    curve: tail.map((p) => ({ date: p.date, value: shares * p.close })),
  };
}
