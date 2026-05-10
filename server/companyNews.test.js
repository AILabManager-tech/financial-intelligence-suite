import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCompanyNews } from './companyNews.js';

const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = [
  {
    id: 1,
    datetime: 1746704400, // 2026-05-08 13:00 UTC
    headline: 'Apple beats revenue estimate',
    source: 'Reuters',
    url: 'https://example.com/1',
    summary: 'Apple reported quarterly revenue above consensus.',
    category: 'company',
    image: 'https://img/1',
  },
  {
    id: 2,
    datetime: 1746618000, // 2026-05-07 13:00 UTC
    headline: 'Apple announces buyback',
    source: 'Bloomberg',
    url: 'https://example.com/2',
    summary: 'Board authorizes $90B buyback.',
    category: 'company',
  },
  // Junk: missing headline + url — must be dropped.
  { id: 3, datetime: 1746531600, headline: '', url: '', source: 'Junk' },
  // Junk: no datetime.
  { id: 4, headline: 'Stale item', url: 'https://example.com/4', source: 'X' },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchCompanyNews', () => {
  it('hits /company-news with the expected from/to date window', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchCompanyNews('aapl', { finnhubApiKey: 'tok', fetcher, daysBack: 14 });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/company-news');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('to=2026-05-09');
    expect(url).toContain('from=2026-04-25');
    expect(url).toContain('token=tok');
  });

  it('normalizes datetime to ISO and drops items without headline/url/datetime', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.fetchedAt).toBe(FIXED_NOW.toISOString());
    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toEqual({
      id: 1,
      date: new Date(1746704400 * 1000).toISOString(),
      headline: 'Apple beats revenue estimate',
      source: 'Reuters',
      url: 'https://example.com/1',
      summary: 'Apple reported quarterly revenue above consensus.',
      category: 'company',
      image: 'https://img/1',
    });
  });

  it('sorts items most-recent-first', async () => {
    const fetcher = vi.fn(async () => okJson([RAW[1], RAW[0]]));
    const result = await fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.id)).toEqual([1, 2]);
  });

  it('caps the number of items to limit (default 10)', async () => {
    const many = Array.from({ length: 25 }, (_, i) => ({
      id: i,
      datetime: 1746704400 - i * 3600,
      headline: `News ${i}`,
      source: 'X',
      url: `https://x/${i}`,
      summary: '',
      category: 'company',
    }));
    const fetcher = vi.fn(async () => okJson(many));
    const result = await fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toHaveLength(10);
  });

  it('honors a custom limit', async () => {
    const many = Array.from({ length: 5 }, (_, i) => ({
      id: i,
      datetime: 1746704400 - i * 3600,
      headline: `News ${i}`,
      source: 'X',
      url: `https://x/${i}`,
      summary: '',
    }));
    const fetcher = vi.fn(async () => okJson(many));
    const result = await fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher, limit: 3 });
    expect(result.items).toHaveLength(3);
  });

  it('returns an empty list when Finnhub returns no items', async () => {
    const fetcher = vi.fn(async () => okJson([]));
    const result = await fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 502, json: async () => ({}) }));
    await expect(
      fetchCompanyNews('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchCompanyNews('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    try {
      await fetchCompanyNews('AAPL', { finnhubApiKey: 'super-secret', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret');
      return;
    }
    throw new Error('expected throw');
  });
});
