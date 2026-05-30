import { simulateInvestment } from "./simulationCalculator";

// Multi-position demo portfolio simulator (P2.2). Pure: takes pre-fetched price
// series per position and produces an aggregated growth curve + KPIs, so it can
// be compared to a benchmark. Hypothetical-from-real-data, never advice.

// Sum N value-curves onto a common date axis. Curves may have different dates
// (different symbols / data availability): we walk the union of dates and, for
// each, add every curve's last-known value (forward fill). Before a curve's
// first point its contribution is 0. ISO date strings compare chronologically.
export function aggregateCurves(curves) {
  const valid = (curves ?? []).filter((c) => Array.isArray(c) && c.length > 0);
  if (valid.length === 0) return [];

  const dates = [...new Set(valid.flatMap((c) => c.map((p) => p.date)))].sort();

  const idx = valid.map(() => 0);
  const last = valid.map(() => 0);
  const result = [];
  for (const date of dates) {
    let sum = 0;
    for (let i = 0; i < valid.length; i++) {
      const curve = valid[i];
      while (idx[i] < curve.length && curve[idx[i]].date <= date) {
        last[i] = curve[idx[i]].value;
        idx[i] += 1;
      }
      sum += last[i];
    }
    result.push({ date, value: sum });
  }
  return result;
}

/**
 * @param {Array<{symbol:string, amount:number, points:Array}>} positions
 * @param {{startDate?:string}} options
 * @returns {null | {
 *   totalInvested, finalValue, totalReturn, totalReturnPct,
 *   positions: Array<{symbol, amount, finalValue, totalReturnPct}>,
 *   curve: Array<{date, value}>
 * }}
 */
export function simulateDemoPortfolio(positions, { startDate } = {}) {
  const sims = (positions ?? [])
    .map((p) => {
      const result = simulateInvestment(p?.points, { amount: p?.amount, startDate });
      return result ? { symbol: p.symbol, ...result } : null;
    })
    .filter(Boolean);

  if (sims.length === 0) return null;

  const curve = aggregateCurves(sims.map((s) => s.curve));
  const totalInvested = sims.reduce((sum, s) => sum + s.initialAmount, 0);
  const finalValue = curve.length ? curve[curve.length - 1].value : 0;

  return {
    totalInvested,
    finalValue,
    totalReturn: finalValue - totalInvested,
    totalReturnPct: totalInvested > 0 ? (finalValue / totalInvested - 1) * 100 : null,
    positions: sims.map((s) => ({
      symbol: s.symbol,
      amount: s.initialAmount,
      finalValue: s.finalValue,
      totalReturnPct: s.totalReturnPct,
    })),
    curve,
  };
}

// Excess return (in percentage points) of a portfolio vs a benchmark, both as
// total-return percentages. Returns null if either is missing.
export function excessReturnPct(portfolioReturnPct, benchmarkReturnPct) {
  if (!Number.isFinite(portfolioReturnPct) || !Number.isFinite(benchmarkReturnPct)) return null;
  return portfolioReturnPct - benchmarkReturnPct;
}
