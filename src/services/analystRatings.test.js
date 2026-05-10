import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAnalystRatings } from './analystRatings';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-10T12:00:00.000Z',
  items: [
    { period: '2026-04-01', strongBuy: 12, buy: 18, hold: 7, sell: 1, strongSell: 0, total: 38 },
  ],
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => (
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchAnalystRatings (client)', () => {
  it('issues a GET to /api/analyst-ratings with the symbol uppercased', async () => {
    await fetchAnalystRatings('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/analyst-ratings?symbol=AAPL');
  });

  it('returns the items list', async () => {
    const result = await fetchAnalystRatings('AAPL');
    expect(result.items[0].total).toBe(38);
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchAnalystRatings('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchAnalystRatings('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchAnalystRatings('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
