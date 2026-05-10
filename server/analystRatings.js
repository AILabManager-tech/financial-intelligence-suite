const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function toNonNegativeInt(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num) || num < 0) return null;
  return Math.round(num);
}

function normalizeItem(raw, symbol) {
  if (!raw || raw.symbol !== symbol) return null;
  const period = typeof raw.period === 'string' && raw.period ? raw.period : null;
  if (!period) return null;
  const strongBuy = toNonNegativeInt(raw.strongBuy) ?? 0;
  const buy = toNonNegativeInt(raw.buy) ?? 0;
  const hold = toNonNegativeInt(raw.hold) ?? 0;
  const sell = toNonNegativeInt(raw.sell) ?? 0;
  const strongSell = toNonNegativeInt(raw.strongSell) ?? 0;
  const total = strongBuy + buy + hold + sell + strongSell;
  if (total === 0) return null;
  return { period, strongBuy, buy, hold, sell, strongSell, total };
}

export async function fetchAnalystRatings(symbol, {
  finnhubApiKey,
  fetcher = fetch,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for analyst ratings');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const url = new URL(`${FINNHUB_BASE}/stock/recommendation`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: analyst ratings upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeItem(item, cleanSymbol))
    .filter(Boolean)
    .sort((a, b) => b.period.localeCompare(a.period));

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: new Date().toISOString(),
    items,
  };
}
