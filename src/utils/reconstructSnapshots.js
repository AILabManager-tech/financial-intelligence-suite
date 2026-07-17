// Reconstruct a FACTUAL daily-value snapshot series from a transaction journal
// and real historical closes (P3.4 follow-up). This is the block that lets the
// meeting brief's "depuis la dernière rencontre" section and the portfolio TWR
// light up on day 1 — instead of waiting weeks for the live accrual to build a
// series point by point.
//
//   value(t) = Σ_symbol heldQty(symbol, t) × closeOnOrBefore(symbol, t)
//
// heldQty is replayed from the buy/sell log, so each purchase shows up as a
// capital inflow exactly where TWR's flow-neutralisation expects it. Every price
// is a REAL past close — never a wiggle, never an interpolation. This is NOT the
// dev-only demoSnapshots reconstruction (which invents an intra-period wiggle);
// here every number traces to two real datasets (the journal and /api/history).
//
// Factualité stricte : a day on which a HELD symbol has no close at or before it
// is OMITTED entirely — never interpolated, never carried forward from a guess.
// closeOnOrBefore returns the last real close ≤ the day (standard end-of-day
// valuation on non-trading days), or null when history does not reach that far
// back → the whole day is dropped.
//
// Output: [{ snapshotDate, totalMarketValue, reconstructed: true }] ascending,
// the same shape the accrual produces and computeSubPeriodReturns / TWR consume.
import { closeOnOrBefore } from "./priceSeries";

function dayKey(value) {
  return typeof value === "string" && value.length >= 10 ? value.slice(0, 10) : null;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// { SYMBOL: [{date, close}] } | { SYMBOL: {points:[...]} } → Map<SYMBOL, points[]>.
function normalizeHistory(historyBySymbol) {
  const map = new Map();
  for (const [symbol, entry] of Object.entries(historyBySymbol ?? {})) {
    const points = Array.isArray(entry) ? entry : Array.isArray(entry?.points) ? entry.points : [];
    map.set(String(symbol).trim().toUpperCase(), points);
  }
  return map;
}

// Per-symbol chronological quantity deltas (buy = +qty, sell = -qty).
function buildDeltas(transactions) {
  const bySymbol = new Map();
  for (const tx of transactions) {
    const day = dayKey(tx?.date);
    const symbol = tx?.symbol ? String(tx.symbol).trim().toUpperCase() : null;
    const qty = Number(tx?.quantity);
    if (!day || !symbol || !Number.isFinite(qty) || qty <= 0) continue;
    let delta;
    if (tx.type === "buy") delta = qty;
    else if (tx.type === "sell") delta = -qty;
    else continue;
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, []);
    bySymbol.get(symbol).push({ day, delta });
  }
  for (const list of bySymbol.values()) list.sort((a, b) => a.day.localeCompare(b.day));
  return bySymbol;
}

export function reconstructSnapshots({ transactions = [], historyBySymbol = {}, asOf = null } = {}) {
  const asOfDay = dayKey(asOf);
  if (!asOfDay) return [];

  const deltas = buildDeltas(transactions);
  if (deltas.size === 0) return [];

  // First buy anchors the series start; nothing to value before it.
  let firstBuyDay = null;
  for (const list of deltas.values()) {
    const firstBuy = list.find((d) => d.delta > 0);
    if (firstBuy && (firstBuyDay === null || firstBuy.day < firstBuyDay)) firstBuyDay = firstBuy.day;
  }
  if (!firstBuyDay || asOfDay < firstBuyDay) return [];

  const history = normalizeHistory(historyBySymbol);

  // Grid = every real trading day (from any held symbol's history) in
  // [firstBuyDay, asOf], plus asOf itself so the series ends on the report date.
  const grid = new Set([asOfDay]);
  for (const points of history.values()) {
    for (const p of points) {
      const day = dayKey(p?.date);
      if (day && day >= firstBuyDay && day <= asOfDay) grid.add(day);
    }
  }
  const dates = [...grid].sort((a, b) => a.localeCompare(b));

  // Held quantity per symbol, advanced along the ascending grid via a cursor.
  const cursors = new Map();
  for (const symbol of deltas.keys()) cursors.set(symbol, { index: 0, qty: 0 });

  const series = [];
  for (const day of dates) {
    for (const [symbol, list] of deltas) {
      const cursor = cursors.get(symbol);
      while (cursor.index < list.length && list[cursor.index].day <= day) {
        cursor.qty += list[cursor.index].delta;
        cursor.index += 1;
      }
    }

    let value = 0;
    let complete = true;
    for (const [symbol, cursor] of cursors) {
      if (cursor.qty <= 0) continue;
      const close = closeOnOrBefore(history.get(symbol), day);
      if (close == null) {
        complete = false; // held but unpriced ⇒ omit the whole day, never interpolate
        break;
      }
      value += cursor.qty * close;
    }

    if (complete && value > 0) {
      series.push({ snapshotDate: day, totalMarketValue: round2(value), reconstructed: true });
    }
  }

  return series;
}
