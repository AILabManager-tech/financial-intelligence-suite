import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchCompanyNews } from './companyNews';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-09T12:00:00.000Z',
  window: { from: '2026-04-25', to: '2026-05-09' },
  items: [
    { id: 1, date: '2026-05-08T13:00:00.000Z', headline: 'Headline 1', source: 'Reuters', url: 'https://x/1', summary: '', category: 'company' },
  ],
  cache: { status: 'miss', ttlMs: 1_800_000, expiresAt: '2026-05-09T12:30:00.000Z' },
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => (
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchCompanyNews (client)', () => {
  it('issues a GET to /api/company-news with the symbol uppercased', async () => {
    await fetchCompanyNews('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('/api/company-news?symbol=AAPL');
  });

  it('forwards a custom limit query param', async () => {
    await fetchCompanyNews('AAPL', { limit: 5 });
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('limit=5');
  });

  it('returns the items list and metadata', async () => {
    const result = await fetchCompanyNews('AAPL');
    expect(result.symbol).toBe('AAPL');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].headline).toBe('Headline 1');
  });

  it('returns an empty items list when the API omits one', async () => {
    globalThis.fetch.mockImplementationOnce(() => (
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ symbol: 'X' }) })
    ));
    const result = await fetchCompanyNews('X');
    expect(result.items).toEqual([]);
  });

  it('throws on non-OK responses', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchCompanyNews('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchCompanyNews('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchCompanyNews('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
