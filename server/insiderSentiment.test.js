import { describe, expect, it, vi } from 'vitest';
import { fetchInsiderSentiment } from './insiderSentiment.js';

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = {
  symbol: 'AAPL',
  data: [
    { symbol: 'AAPL', year: 2026, month: 3, change: 5000, mspr: 12.5 },
    { symbol: 'AAPL', year: 2026, month: 1, change: -2000, mspr: -8 },
    { symbol: 'AAPL', year: 2026, month: 2, change: 100, mspr: 'x' }, // mspr invalide → drop
  ],
};

describe('fetchInsiderSentiment', () => {
  it('hits /stock/insider-sentiment with symbol + token', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchInsiderSentiment('aapl', { finnhubApiKey: 'tok', fetcher });
    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/insider-sentiment');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('token=tok');
  });

  it('normalise, droppe les MSPR invalides et trie du plus récent', async () => {
    const result = await fetchInsiderSentiment('AAPL', { finnhubApiKey: 'tok', fetcher: vi.fn(async () => okJson(RAW)) });
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({ year: 2026, month: 3, mspr: 12.5, change: 5000 });
    expect(result.items[1].month).toBe(1);
  });

  it('rejette sans clé API', async () => {
    await expect(fetchInsiderSentiment('AAPL', { finnhubApiKey: '', fetcher: vi.fn() })).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('throw sur réponse non-OK et ne leak pas le token', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    try {
      await fetchInsiderSentiment('AAPL', { finnhubApiKey: 'super-secret', fetcher });
    } catch (error) {
      expect(error.message).toMatch(/AAPL/);
      expect(error.message).not.toContain('super-secret');
      return;
    }
    throw new Error('expected throw');
  });
});
