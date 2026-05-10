const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 25;

function trimString(value) {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeItem(raw, expectedSymbol) {
  if (!raw || typeof raw !== 'object') return null;
  const symbol = trimString(raw.symbol).toUpperCase();
  if (symbol && symbol !== expectedSymbol) return null;

  const form = trimString(raw.form);
  const filedDate = trimString(raw.filedDate);
  if (!form || !filedDate) return null;

  const reportUrl = trimString(raw.reportUrl);
  const filingUrl = trimString(raw.filingUrl);
  if (!reportUrl && !filingUrl) return null;

  return {
    accessNumber: trimString(raw.accessNumber) || null,
    form,
    filedDate,
    acceptedDate: trimString(raw.acceptedDate) || null,
    reportUrl: reportUrl || null,
    filingUrl: filingUrl || null,
    cik: trimString(raw.cik) || null,
  };
}

export async function fetchSecFilings(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  limit = DEFAULT_LIMIT,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for SEC filings');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const safeLimit = Math.min(Math.max(1, Number(limit) || DEFAULT_LIMIT), MAX_LIMIT);

  const url = new URL(`${FINNHUB_BASE}/stock/filings`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: SEC filings upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeItem(item, cleanSymbol))
    .filter(Boolean)
    .sort((a, b) => b.filedDate.localeCompare(a.filedDate))
    .slice(0, safeLimit);

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: new Date().toISOString(),
    items,
  };
}
