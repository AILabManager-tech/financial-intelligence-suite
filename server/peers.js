const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 25;

function normalizeSymbol(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  return trimmed;
}

export async function fetchPeers(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for peers');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

  const url = new URL(`${FINNHUB_BASE}/stock/peers`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: peers upstream ${response.status}`);
  }

  const payload = await response.json();
  const seen = new Set();
  const peers = [];
  if (Array.isArray(payload)) {
    for (const raw of payload) {
      const candidate = normalizeSymbol(raw);
      if (!candidate || candidate === cleanSymbol || seen.has(candidate)) continue;
      seen.add(candidate);
      peers.push(candidate);
      if (peers.length >= safeLimit) break;
    }
  }

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: new Date().toISOString(),
    peers,
  };
}
