import { parseSymbolExchange } from "../utils/symbolExchange";

function enrichResult(result) {
  const exchange = parseSymbolExchange(result.symbol);
  return {
    ...result,
    base: exchange.base,
    suffix: exchange.suffix,
    exchange: exchange.exchange,
    country: exchange.country,
    countryLabel: exchange.countryLabel,
  };
}

export async function searchSymbols(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/search?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`Symbol search unavailable (${response.status})`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.results) ? payload.results.map(enrichResult) : [];
  return {
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    results,
  };
}

