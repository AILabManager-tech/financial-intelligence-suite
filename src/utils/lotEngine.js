// Tax-lot engine (P3.3). Pure: apply a chronological sequence of transactions to
// produce, per symbol, the open lots and the realized P&L using FIFO or LIFO lot
// matching. This is the fiscal core behind realized gains, T5008/1099-B exports
// (P6.2), and turnover/holding stats (P4.12). No network, deterministic.
//
// Transaction shape: { type, symbol, date, quantity, price, fee }
//   type: "buy" | "sell" | "dividend" | "fee"
//   buy/sell: quantity (>0), price (per share); fee optional (>=0)
//   dividend: amount via `amount` (cash received); fee: amount via `amount`
// Convention: a buy fee is added to the lot cost basis; a sell fee reduces
// proceeds. Selling more than held consumes what's available and flags oversold.

const EPS = 1e-9;

function toTime(d) {
  return new Date(d).getTime();
}

function emptySymbol() {
  return {
    lots: [], // { date, quantity, costPerShare }
    closedLots: [], // realized round-trips: { entryDate, exitDate, quantity, costPerShare, proceedsPerShare, pnl }
    realizedPnl: 0,
    dividends: 0,
    fees: 0,
    oversold: 0, // shares sold beyond holdings (data issue, surfaced not hidden)
  };
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function applyTransactions(transactions, { method = "fifo" } = {}) {
  const lifo = method === "lifo";
  const ordered = (Array.isArray(transactions) ? transactions : [])
    .filter((t) => t && t.symbol && t.date)
    .slice()
    .sort((a, b) => toTime(a.date) - toTime(b.date));

  const bySymbol = {};
  const sym = (s) => (bySymbol[s] ??= emptySymbol());

  for (const t of ordered) {
    const symbol = String(t.symbol).trim().toUpperCase();
    const acc = sym(symbol);
    const fee = num(t.fee, 0);

    if (t.type === "buy") {
      const qty = num(t.quantity);
      if (qty <= 0) continue;
      const price = num(t.price);
      // Buy fee capitalised into cost basis.
      const costPerShare = price + (qty > 0 ? fee / qty : 0);
      acc.lots.push({ date: t.date, quantity: qty, costPerShare });
      acc.fees += fee;
    } else if (t.type === "sell") {
      let remaining = num(t.quantity);
      if (remaining <= 0) continue;
      const price = num(t.price);
      const proceedsPerShare = price; // sell fee handled below on total
      while (remaining > EPS && acc.lots.length > 0) {
        const idx = lifo ? acc.lots.length - 1 : 0;
        const lot = acc.lots[idx];
        const matched = Math.min(remaining, lot.quantity);
        const pnl = matched * (proceedsPerShare - lot.costPerShare);
        acc.realizedPnl += pnl;
        // Record the realized round-trip (gross of the sell fee, which is applied
        // once to the whole sell below). Feeds holding-period / hit-ratio stats
        // (P4.12) and per-lot fiscal exports (P6.2).
        acc.closedLots.push({
          entryDate: lot.date,
          exitDate: t.date,
          quantity: matched,
          costPerShare: lot.costPerShare,
          proceedsPerShare,
          pnl,
        });
        lot.quantity -= matched;
        remaining -= matched;
        if (lot.quantity <= EPS) acc.lots.splice(idx, 1);
      }
      if (remaining > EPS) acc.oversold += remaining;
      // Sell fee reduces realized proceeds.
      acc.realizedPnl -= fee;
      acc.fees += fee;
    } else if (t.type === "dividend") {
      acc.dividends += num(t.amount, num(t.quantity) * num(t.price));
    } else if (t.type === "fee") {
      acc.fees += num(t.amount, fee);
      acc.realizedPnl -= num(t.amount, fee);
    }
  }

  // Round tiny float dust on lot quantities for stable display.
  for (const acc of Object.values(bySymbol)) {
    acc.lots = acc.lots.filter((l) => l.quantity > EPS);
  }
  return bySymbol;
}

// Per-symbol summary derived from the engine output: open quantity, remaining
// cost basis, average cost, realized P&L, dividends, fees.
export function summarizeSymbol(acc) {
  if (!acc) return null;
  const openQuantity = acc.lots.reduce((s, l) => s + l.quantity, 0);
  const costBasis = acc.lots.reduce((s, l) => s + l.quantity * l.costPerShare, 0);
  return {
    openQuantity,
    costBasis,
    averageCost: openQuantity > EPS ? costBasis / openQuantity : 0,
    realizedPnl: acc.realizedPnl,
    dividends: acc.dividends,
    fees: acc.fees,
    oversold: acc.oversold,
  };
}

export function summarize(bySymbol) {
  const out = {};
  for (const [symbol, acc] of Object.entries(bySymbol ?? {})) {
    out[symbol] = summarizeSymbol(acc);
  }
  return out;
}
