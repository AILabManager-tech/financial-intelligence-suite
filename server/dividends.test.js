import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDividends } from './dividends.js';

const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = [
  { symbol: 'AAPL', date: '2026-02-09', amount: 0.24, adjustedAmount: 0.24, payDate: '2026-02-15', recordDate: '2026-02-12', declarationDate: '2026-01-30', currency: 'USD' },
  { symbol: 'AAPL', date: '2025-11-10', amount: 0.24, payDate: '2025-11-15', recordDate: '2025-11-12', declarationDate: '2025-10-30', currency: 'USD' },
  // Wrong symbol — must be filtered out.
  { symbol: 'MSFT', date: '2026-02-09', amount: 0.75 },
  // Junk: missing date.
  { symbol: 'AAPL', amount: 0.24 },
  // Junk: amount not finite.
  { symbol: 'AAPL', date: '2025-08-10', amount: 'n/a' },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchDividends', () => {
  it('hits /stock/dividend with the expected window (5 years back by default)', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchDividends('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/dividend');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('to=2026-05-09');
    expect(url).toContain('from=2021-05-10');
    expect(url).toContain('token=tok');
  });

  it('drops items without symbol match, date or finite amount', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchDividends('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      exDate: '2026-02-09',
      payDate: '2026-02-15',
      recordDate: '2026-02-12',
      declarationDate: '2026-01-30',
      amount: 0.24,
      adjustedAmount: 0.24,
      currency: 'USD',
    });
  });

  it('sorts dividends most-recent-first by ex-date', async () => {
    const fetcher = vi.fn(async () => okJson([RAW[1], RAW[0]]));
    const result = await fetchDividends('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.exDate)).toEqual(['2026-02-09', '2025-11-10']);
  });

  it('returns an empty list when Finnhub returns no payments', async () => {
    const fetcher = vi.fn(async () => okJson([]));
    const result = await fetchDividends('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(
      fetchDividends('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchDividends('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the API token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    try {
      await fetchDividends('AAPL', { finnhubApiKey: 'super-secret-token', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret-token');
    }
  });
});
