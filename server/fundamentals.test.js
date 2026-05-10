import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFundamentals } from './fundamentals.js';

const PROFILE_BODY = {
  country: 'US',
  finnhubIndustry: 'Technology',
  marketCapitalization: 3_400_000,
  shareOutstanding: 15_000,
  ticker: 'AAPL',
};

const METRIC_BODY = {
  metric: {
    peTTM: 32.5,
    epsTTM: 6.42,
    revenuePerShareTTM: 25.7,
    grossMarginTTM: 45.2,
    operatingMarginTTM: 30.1,
    netProfitMarginTTM: 25.8,
    dividendYieldIndicatedAnnual: 0.51,
    beta: 1.27,
  },
};

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

function failedFetch(status = 503) {
  return { ok: false, status, json: async () => ({}) };
}

const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z');

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchFundamentals', () => {
  it('returns normalized fields when both Finnhub endpoints succeed', async () => {
    const fetcher = vi.fn(async (url) => {
      const u = String(url);
      if (u.includes('/stock/profile2')) return okJson(PROFILE_BODY);
      if (u.includes('/stock/metric')) return okJson(METRIC_BODY);
      throw new Error(`unexpected ${u}`);
    });

    const result = await fetchFundamentals('AAPL', {
      finnhubApiKey: 'tok',
      fetcher,
    });

    expect(result.symbol).toBe('AAPL');
    expect(result.fetchedAt).toBe(FIXED_NOW.toISOString());
    expect(result.fields.marketCap).toEqual({
      value: 3_400_000_000_000,
      source: 'finnhub.io',
      asOf: FIXED_NOW.toISOString(),
    });
    expect(result.fields.peRatio.value).toBe(32.5);
    expect(result.fields.country.value).toBe('US');
  });

  it('hits each Finnhub endpoint exactly once with the symbol and token', async () => {
    const fetcher = vi.fn(async () => okJson({ metric: {} }));
    await fetchFundamentals('MSFT', { finnhubApiKey: 'secret-token', fetcher });

    const urls = fetcher.mock.calls.map(([url]) => String(url));
    expect(urls).toHaveLength(2);
    expect(urls.some((u) => u.includes('profile2') && u.includes('symbol=MSFT'))).toBe(true);
    expect(urls.some((u) => u.includes('metric') && u.includes('symbol=MSFT'))).toBe(true);
    // Token must be transmitted as query param, never logged in errors below.
    expect(urls.every((u) => u.includes('token=secret-token'))).toBe(true);
  });

  it('returns partial fields when only metric succeeds (profile down)', async () => {
    const fetcher = vi.fn(async (url) => (
      String(url).includes('profile2') ? failedFetch(502) : okJson(METRIC_BODY)
    ));

    const result = await fetchFundamentals('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.fields).not.toHaveProperty('marketCap');
    expect(result.fields).not.toHaveProperty('country');
    expect(result.fields.peRatio.value).toBe(32.5);
  });

  it('returns partial fields when only profile succeeds (metric down)', async () => {
    const fetcher = vi.fn(async (url) => (
      String(url).includes('metric') ? failedFetch(502) : okJson(PROFILE_BODY)
    ));

    const result = await fetchFundamentals('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.fields).not.toHaveProperty('peRatio');
    expect(result.fields.country.value).toBe('US');
    expect(result.fields.marketCap.value).toBe(3_400_000_000_000);
  });

  it('throws when both endpoints fail (caller maps to 502)', async () => {
    const fetcher = vi.fn(async () => failedFetch(502));
    await expect(
      fetchFundamentals('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchFundamentals('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the API token in error messages', async () => {
    const fetcher = vi.fn(async () => failedFetch(500));
    try {
      await fetchFundamentals('AAPL', { finnhubApiKey: 'super-secret', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret');
      return;
    }
    throw new Error('expected fetchFundamentals to throw');
  });

  it('uppercases and trims the symbol before issuing requests', async () => {
    const fetcher = vi.fn(async () => okJson({ metric: {} }));
    await fetchFundamentals('  aapl  ', { finnhubApiKey: 'tok', fetcher });
    const urls = fetcher.mock.calls.map(([url]) => String(url));
    expect(urls.every((u) => u.includes('symbol=AAPL'))).toBe(true);
  });
});
