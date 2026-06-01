const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

function toIsoDate(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function normalizeItem(raw) {
  const name = typeof raw?.name === 'string' ? raw.name.trim() : '';
  const change = Number(raw?.change);
  const transactionDate = toIsoDate(raw?.transactionDate);
  // An insider row is only meaningful with an insider name, a transaction date,
  // and a finite share delta. Anything missing is dropped (no fabricated zero).
  if (!name || !Number.isFinite(change) || !transactionDate) {
    return null;
  }
  const share = Number(raw?.share);
  const transactionPrice = Number(raw?.transactionPrice);
  return {
    name,
    change,
    share: Number.isFinite(share) ? share : null,
    transactionDate,
    filingDate: toIsoDate(raw?.filingDate),
    transactionCode: typeof raw?.transactionCode === 'string' ? raw.transactionCode.trim() : '',
    transactionPrice: Number.isFinite(transactionPrice) && transactionPrice > 0 ? transactionPrice : null,
  };
}

export async function fetchInsiderTransactions(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for insider transactions');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const cap = Math.min(Math.max(Number(limit) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  const url = new URL(`${FINNHUB_BASE}/stock/insider-transactions`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: insider transactions upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload?.data) ? payload.data : [])
    .map(normalizeItem)
    .filter(Boolean)
    .sort((a, b) => b.transactionDate.localeCompare(a.transactionDate))
    .slice(0, cap);

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: new Date().toISOString(),
    items,
  };
}
