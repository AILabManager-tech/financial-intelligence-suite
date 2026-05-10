const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const DEFAULT_PAST_DAYS = 365;
const DEFAULT_UPCOMING_DAYS = 90;

function isoDate(date) {
  return date.toISOString().slice(0, 10);
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function normalizeItem(raw, symbol, todayIso) {
  if (!raw || raw.symbol !== symbol) return null;
  const date = typeof raw.date === 'string' ? raw.date : null;
  if (!date) return null;
  const epsActual = toFiniteNumber(raw.epsActual);
  const epsEstimate = toFiniteNumber(raw.epsEstimate);
  const revenueActual = toFiniteNumber(raw.revenueActual);
  const revenueEstimate = toFiniteNumber(raw.revenueEstimate);

  let surprisePct = null;
  if (epsActual !== null && epsEstimate !== null && epsEstimate !== 0) {
    surprisePct = ((epsActual - epsEstimate) / Math.abs(epsEstimate)) * 100;
  }

  const year = Number.isFinite(Number(raw.year)) ? Number(raw.year) : null;
  const quarter = Number.isFinite(Number(raw.quarter)) ? Number(raw.quarter) : null;
  const period = year && quarter ? `Q${quarter} ${year}` : date;

  return {
    date,
    period,
    hour: typeof raw.hour === 'string' ? raw.hour : null,
    epsEstimate,
    epsActual,
    surprisePct,
    revenueEstimate,
    revenueActual,
    when: date < todayIso ? 'past' : 'upcoming',
  };
}

export async function fetchEarningsCalendar(symbol, {
  finnhubApiKey,
  fetcher = fetch,
  pastDays = DEFAULT_PAST_DAYS,
  upcomingDays = DEFAULT_UPCOMING_DAYS,
} = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for earnings calendar');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const now = new Date();
  const from = new Date(now.getTime() - pastDays * 24 * 60 * 60 * 1000);
  const to = new Date(now.getTime() + upcomingDays * 24 * 60 * 60 * 1000);
  const todayIso = isoDate(now);

  const url = new URL(`${FINNHUB_BASE}/calendar/earnings`);
  url.searchParams.set('from', isoDate(from));
  url.searchParams.set('to', isoDate(to));
  url.searchParams.set('symbol', cleanSymbol);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${cleanSymbol}: earnings calendar upstream ${response.status}`);
  }

  const payload = await response.json();
  const raw = Array.isArray(payload?.earningsCalendar) ? payload.earningsCalendar : [];
  const items = raw
    .map((item) => normalizeItem(item, cleanSymbol, todayIso))
    .filter(Boolean)
    .sort((a, b) => b.date.localeCompare(a.date));

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt: now.toISOString(),
    window: { from: isoDate(from), to: isoDate(to) },
    items,
  };
}
