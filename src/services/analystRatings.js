export async function fetchAnalystRatings(symbol, { signal } = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const params = new URLSearchParams({ symbol: cleanSymbol });
  const response = await fetch(`/api/analyst-ratings?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Analyst ratings unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol ?? cleanSymbol,
    source: payload.source ?? 'finnhub.io',
    fetchedAt: payload.fetchedAt ?? null,
    items: Array.isArray(payload.items) ? payload.items : [],
    cache: payload.cache ?? null,
  };
}
