import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchDividends } from './dividends';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-09T12:00:00.000Z',
  window: { from: '2021-05-10', to: '2026-05-09' },
  items: [
    { exDate: '2026-02-09', payDate: '2026-02-15', amount: 0.24, currency: 'USD' },
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

describe('fetchDividends (client)', () => {
  it('issues a GET to /api/dividends with the symbol uppercased', async () => {
    await fetchDividends('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/dividends?symbol=AAPL');
  });

  it('returns the items list', async () => {
    const result = await fetchDividends('AAPL');
    expect(result.items[0].amount).toBe(0.24);
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchDividends('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchDividends('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchDividends('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
