const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_YEARS_BACK = 5;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeItem(raw, symbol) {
  if (!raw || raw.symbol !== symbol) return null;
  const exDate = typeof raw.date === 'string' && raw.date ? raw.date : null;
  const amount = toFiniteNumber(raw.amount);
  if (!exDate || amount === null) return null;
  return {
    exDate,
    payDate: typeof raw.payDate === 'string' && raw.payDate ? raw.payDate : null,
    recordDate: typeof raw.recordDate === 'string' && raw.recordDate ? raw.recordDate : null,
    declarationDate: typeof raw.declarationDate === 'string' && raw.declarationDate ? raw.declarationDate : null,
    amount,
    adjustedAmount: toFiniteNumber(raw.adjustedAmount),
    currency: typeof raw.currency === 'string' && raw.currency ? raw.currency : 'USD',
  };
}

export async function fetchDividends(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  yearsBack = DEFAULT_YEARS_BACK,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for dividends');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - yearsBack);
  from.setUTCDate(from.getUTCDate() + 1);

  const url = new URL(`${FINNHUB_BASE}/stock/dividend`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('from', isoDate(from));
  url.searchParams.set('to', isoDate(now));
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: dividends upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeItem(item, cleanSymbol))
    .filter(Boolean)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: now.toISOString(),
    window: { from: isoDate(from), to: isoDate(now) },
    items,
  };
}
