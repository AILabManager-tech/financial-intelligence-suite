import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchInsiderTransactions } from './insiderTransactions';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-09T12:00:00.000Z',
  items: [
    { name: 'COOK TIMOTHY', change: -240000, share: 3280000, transactionDate: '2026-04-02', filingDate: '2026-04-04', transactionCode: 'S', transactionPrice: 170.12 },
  ],
  cache: { status: 'miss', ttlMs: 21_600_000, expiresAt: '2026-05-09T18:00:00.000Z' },
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => (
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchInsiderTransactions (client)', () => {
  it('issues a GET to /api/insider-transactions with the symbol uppercased', async () => {
    await fetchInsiderTransactions('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('/api/insider-transactions?symbol=AAPL');
  });

  it('forwards a custom limit query param', async () => {
    await fetchInsiderTransactions('AAPL', { limit: 10 });
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toContain('limit=10');
  });

  it('returns the items list and metadata', async () => {
    const result = await fetchInsiderTransactions('AAPL');
    expect(result.symbol).toBe('AAPL');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('COOK TIMOTHY');
  });

  it('returns an empty items list when the API omits one', async () => {
    globalThis.fetch.mockImplementationOnce(() => (
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ symbol: 'X' }) })
    ));
    const result = await fetchInsiderTransactions('X');
    expect(result.items).toEqual([]);
  });

  it('throws on non-OK responses', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchInsiderTransactions('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchInsiderTransactions('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchInsiderTransactions('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
