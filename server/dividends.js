const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const ALPHA_VANTAGE_BASE = 'https://www.alphavantage.co/query';
const TWELVE_DATA_BASE = 'https://api.twelvedata.com/dividends';
const DEFAULT_YEARS_BACK = 5;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function normalizeItem(raw, symbol, source, fallbackCurrency = 'USD') {
  if (!raw) return null;
  const rawSymbol = nonEmptyString(raw.symbol);
  if (rawSymbol && rawSymbol.toUpperCase() !== symbol) return null;
  const exDate = nonEmptyString(raw.date) ?? nonEmptyString(raw.ex_dividend_date) ?? nonEmptyString(raw.ex_date);
  const amount = toFiniteNumber(raw.amount);
  if (!exDate || amount === null) return null;
  return {
    exDate,
    payDate: nonEmptyString(raw.payDate) ?? nonEmptyString(raw.payment_date),
    recordDate: nonEmptyString(raw.recordDate) ?? nonEmptyString(raw.record_date),
    declarationDate: nonEmptyString(raw.declarationDate) ?? nonEmptyString(raw.declaration_date),
    amount,
    adjustedAmount: toFiniteNumber(raw.adjustedAmount),
    currency: nonEmptyString(raw.currency) ?? fallbackCurrency,
    source,
  };
}

async function fetchFinnhubDividends(cleanSymbol, { finnhubApiKey, fetcher, fromIso, toIso }) {
  const url = new URL(`${FINNHUB_BASE}/stock/dividend`);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('from', fromIso);
  url.searchParams.set('to', toIso);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: finnhub dividends upstream ${response.status}`);
  }

  const payload = await response.json();
  return (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeItem(item, cleanSymbol, 'finnhub.io'))
    .filter(Boolean)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

async function fetchAlphaVantageDividends(cleanSymbol, { alphaVantageApiKey, fetcher, fromIso, toIso }) {
  const url = new URL(ALPHA_VANTAGE_BASE);
  url.searchParams.set('function', 'DIVIDENDS');
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('apikey', alphaVantageApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: alphavantage dividends upstream ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.['Error Message'] || payload?.['Information'] || payload?.Note) {
    throw new Error(`${cleanSymbol}: alphavantage dividends unavailable`);
  }

  return (Array.isArray(payload?.data) ? payload.data : [])
    .map((item) => normalizeItem(item, cleanSymbol, 'alphavantage.co'))
    .filter((item) => item.exDate >= fromIso && item.exDate <= toIso)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

async function fetchTwelveDataDividends(cleanSymbol, { twelveDataApiKey, fetcher }) {
  const url = new URL(TWELVE_DATA_BASE);
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('range', '5y');
  url.searchParams.set('apikey', twelveDataApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: twelvedata dividends upstream ${response.status}`);
  }

  const payload = await response.json();
  if (payload?.status === 'error' || payload?.code || payload?.message) {
    throw new Error(`${cleanSymbol}: twelvedata dividends unavailable`);
  }

  return (Array.isArray(payload?.dividends) ? payload.dividends : [])
    .map((item) => normalizeItem(item, cleanSymbol, 'twelvedata.com', nonEmptyString(payload?.meta?.currency) ?? 'USD'))
    .filter(Boolean)
    .sort((a, b) => b.exDate.localeCompare(a.exDate));
}

async function firstSuccessfulProvider(providers) {
  const errors = [];
  for (const provider of providers) {
    if (!provider.enabled) continue;
    try {
      return await provider.load();
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.at(-1) ?? 'No dividend provider configured');
}

export async function fetchDividends(symbol, {
  finnhubApiKey,
  alphaVantageApiKey,
  twelveDataApiKey,
  fetcher = fetch,
  yearsBack = DEFAULT_YEARS_BACK,
} = {}) {
  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  if (!finnhubApiKey && !alphaVantageApiKey && !twelveDataApiKey) {
    throw new Error('At least one dividend provider API key is required');
  }

  const now = new Date();
  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - yearsBack);
  from.setUTCDate(from.getUTCDate() + 1);
  const fromIso = isoDate(from);
  const toIso = isoDate(now);

  const result = await firstSuccessfulProvider([
    {
      enabled: Boolean(finnhubApiKey),
      load: async () => ({
        source: 'finnhub.io',
        items: await fetchFinnhubDividends(cleanSymbol, { finnhubApiKey, fetcher, fromIso, toIso }),
      }),
    },
    {
      enabled: Boolean(alphaVantageApiKey),
      load: async () => ({
        source: 'alphavantage.co',
        items: await fetchAlphaVantageDividends(cleanSymbol, { alphaVantageApiKey, fetcher, fromIso, toIso }),
      }),
    },
    {
      enabled: Boolean(twelveDataApiKey),
      load: async () => ({
        source: 'twelvedata.com',
        items: await fetchTwelveDataDividends(cleanSymbol, { twelveDataApiKey, fetcher }),
      }),
    },
  ]);

  return {
    symbol: cleanSymbol,
    source: result.source,
    fetchedAt: now.toISOString(),
    window: { from: fromIso, to: toIso },
    items: result.items,
  };
}
