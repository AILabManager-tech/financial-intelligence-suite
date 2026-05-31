// Operational trade statistics (P4.12). Pure: derives realized-trade metrics for
// a mandate from its transaction log, via the tax-lot engine — turnover, average
// holding period, hit ratio, win/loss ratio, and yield-on-cost. Deterministic,
// no network, no market-data and no snapshots required (it reads only the entered
// transactions), so it stays strictly factual: an empty mandate yields hasData
// false rather than fabricated zeros, and every measure that lacks the inputs to
// be meaningful is returned as null (hidden by the panel, never shown as 0).
//
// Definitions kept honest and label-able by the panel:
//   - turnoverPct: share of deployed capital (at cost) already sold back —
//     soldCost / (soldCost + openCostBasis). Needs no portfolio-value series.
//   - avgHoldingDays: quantity-weighted days between entry and exit on closed
//     round-trips.
//   - hitRatioPct: % of closed round-trips with a positive realized P&L.
//   - winLossRatio: average winning P&L / |average losing P&L| (a multiple).
//   - yieldOnCostPct: cumulative dividends / open cost basis (cumulative, not
//     annualized — the panel labels it as such).

import { applyTransactions, summarize } from "./lotEngine";

const MS_PER_DAY = 86_400_000;

export function computeOperationalStats(transactions, { method = "fifo" } = {}) {
  const list = Array.isArray(transactions) ? transactions : [];
  const bySymbol = applyTransactions(list, { method });
  const summaries = summarize(bySymbol);

  let closedCount = 0;
  let winners = 0;
  let losers = 0;
  let sumWin = 0;
  let sumLoss = 0; // accumulates negative pnl
  let holdQtyDays = 0;
  let holdQty = 0;
  let soldCost = 0;

  for (const acc of Object.values(bySymbol)) {
    for (const cl of acc.closedLots) {
      closedCount += 1;
      if (cl.pnl > 0) {
        winners += 1;
        sumWin += cl.pnl;
      } else if (cl.pnl < 0) {
        losers += 1;
        sumLoss += cl.pnl;
      }
      soldCost += cl.quantity * cl.costPerShare;
      const days = (new Date(cl.exitDate).getTime() - new Date(cl.entryDate).getTime()) / MS_PER_DAY;
      if (Number.isFinite(days) && days >= 0) {
        holdQtyDays += days * cl.quantity;
        holdQty += cl.quantity;
      }
    }
  }

  let openCostBasis = 0;
  let dividends = 0;
  let realizedPnl = 0;
  let fees = 0;
  let oversold = 0;
  for (const s of Object.values(summaries)) {
    openCostBasis += s.costBasis;
    dividends += s.dividends;
    realizedPnl += s.realizedPnl;
    fees += s.fees;
    oversold += s.oversold;
  }

  let firstTime = Infinity;
  let lastTime = -Infinity;
  for (const t of list) {
    const tm = new Date(t?.date).getTime();
    if (Number.isFinite(tm)) {
      if (tm < firstTime) firstTime = tm;
      if (tm > lastTime) lastTime = tm;
    }
  }
  const periodDays =
    Number.isFinite(firstTime) && Number.isFinite(lastTime) && lastTime >= firstTime
      ? (lastTime - firstTime) / MS_PER_DAY
      : null;

  const totalBuyCost = soldCost + openCostBasis;
  const avgWin = winners > 0 ? sumWin / winners : null;
  const avgLoss = losers > 0 ? sumLoss / losers : null; // negative

  return {
    hasData: list.length > 0,
    closedCount,
    winners,
    losers,
    hitRatioPct: closedCount > 0 ? (winners / closedCount) * 100 : null,
    avgWin,
    avgLoss,
    winLossRatio: avgWin !== null && avgLoss !== null && avgLoss !== 0 ? avgWin / Math.abs(avgLoss) : null,
    avgHoldingDays: holdQty > 0 ? holdQtyDays / holdQty : null,
    turnoverPct: totalBuyCost > 0 ? (soldCost / totalBuyCost) * 100 : null,
    yieldOnCostPct: openCostBasis > 0 ? (dividends / openCostBasis) * 100 : null,
    dividends,
    openCostBasis,
    realizedPnl,
    fees,
    oversold,
    periodDays,
  };
}
