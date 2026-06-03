// Pure helpers for enriching market-search results with live quotes.
// Factuality: a quote with no usable price is dropped (never shown as 0),
// and the symbol set is capped to keep the quote fetch within the free quota.

export function collectLookupSymbols(results, cap = 12) {
  const seen = new Set();
  const symbols = [];
  for (const result of results ?? []) {
    const symbol = String(result?.symbol ?? "").toUpperCase();
    if (!symbol || seen.has(symbol)) continue;
    seen.add(symbol);
    symbols.push(symbol);
    if (symbols.length >= cap) break;
  }
  return symbols;
}

// A nullish or non-numeric field becomes null (absent datum), but a real 0
// (an unchanged price) is preserved.
function finiteOrNull(value) {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export function indexQuotesBySymbol(quotes) {
  const index = {};
  for (const quote of quotes ?? []) {
    const symbol = String(quote?.symbol ?? "").toUpperCase();
    const price = Number(quote?.price);
    if (!symbol || !Number.isFinite(price) || price <= 0) continue;
    index[symbol] = {
      price,
      change: finiteOrNull(quote?.change),
      changePct: finiteOrNull(quote?.changePct),
      source: quote?.source ?? null,
    };
  }
  return index;
}
