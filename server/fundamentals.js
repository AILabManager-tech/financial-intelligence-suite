import { normalizeFundamentals } from '../src/utils/fundamentalsNormalizer.js';

const FINNHUB_BASE = 'https://finnhub.io/api/v1';

function buildUrl(path, symbol, token) {
  const url = new URL(`${FINNHUB_BASE}${path}`);
  url.searchParams.set('symbol', symbol);
  if (path === '/stock/metric') {
    url.searchParams.set('metric', 'all');
  }
  url.searchParams.set('token', token);
  return url;
}

async function fetchJson(fetcher, url) {
  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

export async function fetchFundamentals(symbol, { finnhubApiKey, fetcher = fetch } = {}) {
  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for fundamentals');
  }

  const cleanSymbol = String(symbol ?? '').trim().toUpperCase();
  if (!cleanSymbol) {
    throw new Error('symbol is required');
  }

  const fetchedAt = new Date().toISOString();
  const profileUrl = buildUrl('/stock/profile2', cleanSymbol, finnhubApiKey);
  const metricUrl = buildUrl('/stock/metric', cleanSymbol, finnhubApiKey);

  const [profileResult, metricResult] = await Promise.allSettled([
    fetchJson(fetcher, profileUrl),
    fetchJson(fetcher, metricUrl),
  ]);

  const profile = profileResult.status === 'fulfilled' ? profileResult.value : undefined;
  const metric = metricResult.status === 'fulfilled' ? metricResult.value : undefined;

  if (!profile && !metric) {
    throw new Error(`${cleanSymbol}: fundamentals upstream unavailable`);
  }

  return {
    symbol: cleanSymbol,
    source: 'finnhub.io',
    fetchedAt,
    fields: normalizeFundamentals({ profile, metric, asOf: fetchedAt }),
    upstream: {
      profile: profileResult.status,
      metric: metricResult.status,
    },
  };
}
