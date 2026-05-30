// Pure currency conversion for the client (P3.4). Mirrors the server's
// base-anchored rate convention: ratesMap[ccy] = units of <ccy> per 1 <base>.
// Returns null when a leg is missing — the UI hides the figure, never invents a
// rate. Kept client-side (no server import) so panels stay testable in jsdom.

function toFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function cleanCurrency(value, fallback = "USD") {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

export function convertAmount(amount, from, to, ratesMap) {
  const value = toFiniteNumber(amount);
  if (value === null || !ratesMap) return null;
  const fromCode = cleanCurrency(from);
  const toCode = cleanCurrency(to);
  if (fromCode === toCode) return value;
  const fromRate = toFiniteNumber(ratesMap[fromCode]);
  const toRate = toFiniteNumber(ratesMap[toCode]);
  if (fromRate === null || toRate === null || fromRate === 0) return null;
  return value * (toRate / fromRate);
}

// Convert a set of portfolio aggregates from `from` (the app's reporting
// currency, USD) into `to` (the mandate base currency). Returns null fields
// where conversion isn't possible, plus a `converted` flag the UI can gate on.
export function convertPortfolioTotals(totals, from, to, ratesMap) {
  const fromCode = cleanCurrency(from);
  const toCode = cleanCurrency(to);
  const fields = ["totalMarketValue", "totalCost", "unrealizedPnl"];
  const out = { from: fromCode, to: toCode, converted: fromCode !== toCode };
  for (const field of fields) {
    out[field] = convertAmount(totals?.[field], fromCode, toCode, ratesMap);
  }
  return out;
}
