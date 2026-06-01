import { describe, expect, it, vi } from 'vitest';
import { fetchInsiderTransactions } from './insiderTransactions.js';

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = {
  symbol: 'AAPL',
  data: [
    { name: 'COOK TIMOTHY', share: 3280000, change: -240000, filingDate: '2026-04-04', transactionDate: '2026-04-02', transactionCode: 'S', transactionPrice: 170.12 },
    { name: 'MAESTRI LUCA', share: 110000, change: 5000, filingDate: '2026-03-12', transactionDate: '2026-03-10', transactionCode: 'P', transactionPrice: 165.4 },
    // Junk: no name — must be dropped.
    { name: '', change: 100, transactionDate: '2026-03-01', transactionCode: 'A' },
    // Junk: non-finite change.
    { name: 'GHOST', change: 'n/a', transactionDate: '2026-02-01' },
    // Junk: no transaction date.
    { name: 'NODATE', change: 50, transactionCode: 'P' },
  ],
};

describe('fetchInsiderTransactions', () => {
  it('hits /stock/insider-transactions with the uppercased symbol and token', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchInsiderTransactions('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/insider-transactions');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('token=tok');
  });

  it('normalizes rows and drops items without name/date/finite change', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchInsiderTransactions('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      name: 'COOK TIMOTHY',
      change: -240000,
      share: 3280000,
      transactionDate: '2026-04-02',
      filingDate: '2026-04-04',
      transactionCode: 'S',
      transactionPrice: 170.12,
    });
  });

  it('sorts items most-recent-first by transaction date', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchInsiderTransactions('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.transactionDate)).toEqual(['2026-04-02', '2026-03-10']);
  });

  it('nulls out non-positive transaction price and non-finite share', async () => {
    const fetcher = vi.fn(async () => okJson({
      data: [{ name: 'X', change: 10, share: 'bad', transactionDate: '2026-01-01', transactionPrice: 0 }],
    }));
    const result = await fetchInsiderTransactions('X', { finnhubApiKey: 'tok', fetcher });
    expect(result.items[0].share).toBeNull();
    expect(result.items[0].transactionPrice).toBeNull();
  });

  it('caps the number of items to limit', async () => {
    const many = { data: Array.from({ length: 30 }, (_, i) => ({
      name: `Insider ${i}`, change: i + 1, transactionDate: `2026-01-${String((i % 28) + 1).padStart(2, '0')}`, transactionCode: 'P',
    })) };
    const fetcher = vi.fn(async () => okJson(many));
    const result = await fetchInsiderTransactions('X', { finnhubApiKey: 'tok', fetcher, limit: 5 });
    expect(result.items).toHaveLength(5);
  });

  it('returns an empty list when Finnhub returns no data', async () => {
    const fetcher = vi.fn(async () => okJson({ data: [] }));
    const result = await fetchInsiderTransactions('X', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws on a non-OK upstream response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    await expect(
      fetchInsiderTransactions('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchInsiderTransactions('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    try {
      await fetchInsiderTransactions('AAPL', { finnhubApiKey: 'super-secret', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret');
      return;
    }
    throw new Error('expected throw');
  });
});
