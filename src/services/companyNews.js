export async function fetchCompanyNews(symbol, { signal, limit } = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const params = new URLSearchParams({ symbol: cleanSymbol });
  if (Number.isFinite(Number(limit))) {
    params.set('limit', String(Math.min(Math.max(Number(limit), 1), 25)));
  }

  const response = await fetch(`/api/company-news?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Company news unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol ?? cleanSymbol,
    source: payload.source ?? 'finnhub.io',
    fetchedAt: payload.fetchedAt ?? null,
    window: payload.window ?? null,
    items: Array.isArray(payload.items) ? payload.items : [],
    cache: payload.cache ?? null,
  };
}
