export async function fetchPeers(symbol, { signal } = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const params = new URLSearchParams({ symbol: cleanSymbol });
  const response = await fetch(`/api/peers?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Peers unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol ?? cleanSymbol,
    source: payload.source ?? 'finnhub.io',
    fetchedAt: payload.fetchedAt ?? null,
    peers: Array.isArray(payload.peers) ? payload.peers : [],
    cache: payload.cache ?? null,
  };
}

export async function fetchPeerQuotes(symbols, { signal } = {}) {
  const cleanSymbols = Array.isArray(symbols)
    ? symbols.map((s) => String(s ?? '').trim().toUpperCase()).filter(Boolean)
    : [];
  if (cleanSymbols.length === 0) {
    return { quotes: [], errors: [], source: null, fetchedAt: null };
  }

  const params = new URLSearchParams({ symbols: cleanSymbols.join(',') });
  const response = await fetch(`/api/quotes?${params.toString()}`, {
    headers: { accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`Peer quotes unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    quotes: Array.isArray(payload.quotes) ? payload.quotes : [],
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    source: payload.source ?? null,
    fetchedAt: payload.fetchedAt ?? null,
  };
}
