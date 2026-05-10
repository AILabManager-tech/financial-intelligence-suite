import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAnalystRatings } from './analystRatings.js';

const FIXED_NOW = new Date('2026-05-10T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = [
  { symbol: 'AAPL', period: '2026-04-01', strongBuy: 12, buy: 18, hold: 7, sell: 1, strongSell: 0 },
  { symbol: 'AAPL', period: '2026-03-01', strongBuy: 10, buy: 17, hold: 8, sell: 2, strongSell: 1 },
  // Wrong symbol — must be filtered out.
  { symbol: 'MSFT', period: '2026-04-01', strongBuy: 5, buy: 10, hold: 2, sell: 0, strongSell: 0 },
  // Junk: missing period.
  { symbol: 'AAPL', strongBuy: 1 },
  // Junk: zero votes everywhere.
  { symbol: 'AAPL', period: '2026-02-01', strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 0 },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchAnalystRatings', () => {
  it('hits /stock/recommendation with the uppercased symbol and the API token', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchAnalystRatings('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/recommendation');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('token=tok');
  });

  it('keeps only items with the right symbol, a period and at least one vote', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchAnalystRatings('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      period: '2026-04-01',
      strongBuy: 12,
      buy: 18,
      hold: 7,
      sell: 1,
      strongSell: 0,
      total: 38,
    });
  });

  it('sorts items most-recent-first by period', async () => {
    const fetcher = vi.fn(async () => okJson([RAW[1], RAW[0]]));
    const result = await fetchAnalystRatings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.period)).toEqual(['2026-04-01', '2026-03-01']);
  });

  it('returns an empty list when Finnhub returns no consensus', async () => {
    const fetcher = vi.fn(async () => okJson([]));
    const result = await fetchAnalystRatings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(
      fetchAnalystRatings('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchAnalystRatings('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the API token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    try {
      await fetchAnalystRatings('AAPL', { finnhubApiKey: 'super-secret-token', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret-token');
    }
  });
});
