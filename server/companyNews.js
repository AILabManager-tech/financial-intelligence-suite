const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_DAYS_BACK = 14;
const DEFAULT_LIMIT = 10;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeItem(raw) {
  const datetime = Number(raw?.datetime);
  const headline = typeof raw?.headline === 'string' ? raw.headline.trim() : '';
  const url = typeof raw?.url === 'string' ? raw.url.trim() : '';
  if (!Number.isFinite(datetime) || !headline || !url) {
    return null;
  }
  return {
    id: raw.id ?? null,
    date: new Date(datetime * 1000).toISOString(),
    headline,
    source: typeof raw.source === 'string' ? raw.source : '',
    url,
    summary: typeof raw.summary === 'string' ? raw.summary : '',
    category: typeof raw.category === 'string' ? raw.category : '',
    image: typeof raw.image === 'string' && raw.image ? raw.image : undefined,
  };
}

export async function fetchCompanyNews(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  daysBack = DEFAULT_DAYS_BACK,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for company news');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const now = new Date();
  const from = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const url = new URL(`${FINNHUB_BASE}/company-news`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('from', isoDate(from));
  url.searchParams.set('to', isoDate(now));
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: company news upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : [])
    .map(normalizeItem)
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, Math.max(1, limit));

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: now.toISOString(),
    window: { from: isoDate(from), to: isoDate(now) },
    items,
  };
}
