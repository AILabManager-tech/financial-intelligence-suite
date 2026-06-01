const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function normalizeItem(raw) {
  const year = Number(raw?.year);
  const month = Number(raw?.month);
  const mspr = Number(raw?.mspr);
  const change = Number(raw?.change);
  // MSPR (monthly share purchase ratio) et l'année/mois sont requis : sans eux la
  // ligne n'a pas de sens. Aucune valeur fabriquée.
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(mspr)) {
    return null;
  }
  return {
    year,
    month,
    mspr,
    change: Number.isFinite(change) ? change : null,
  };
}

export async function fetchInsiderSentiment(symbol, { finnhubApiKey, fetcher = fetch } = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for insider sentiment');
  }
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const now = new Date();
  const from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
  const url = new URL(`${FINNHUB_BASE}/stock/insider-sentiment`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('from', isoDate(from));
  url.searchParams.set('to', isoDate(now));
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: insider sentiment upstream ${response.status}`);
  }

  const payload = await response.json();
  const items = (Array.isArray(payload?.data) ? payload.data : [])
    .map(normalizeItem)
    .filter(Boolean)
    .sort((a, b) => b.year - a.year || b.month - a.month);

  return { symbol: cleanSymbol, source: 'finnhub.io', fetchedAt: now.toISOString(), items };
}
