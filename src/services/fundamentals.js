export async function fetchFundamentals(symbol, { signal } = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const params = new URLSearchParams({ symbol: cleanSymbol });
  const response = await fetch(`/api/fundamentals?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Fundamentals unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol ?? cleanSymbol,
    source: payload.source ?? 'finnhub.io',
    fetchedAt: payload.fetchedAt ?? null,
    fields: payload.fields && typeof payload.fields === 'object' ? payload.fields : {},
    upstream: payload.upstream ?? null,
    cache: payload.cache ?? null,
  };
}
