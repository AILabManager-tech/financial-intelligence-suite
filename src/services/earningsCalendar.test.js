import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEarningsCalendar } from './earningsCalendar';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-09T12:00:00.000Z',
  window: { from: '2025-05-09', to: '2026-08-07' },
  items: [
    { date: '2026-04-30', period: 'Q2 2026', when: 'past', epsActual: 1.65, epsEstimate: 1.50, surprisePct: 10, revenueActual: null, revenueEstimate: 94_000_000_000 },
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

describe('fetchEarningsCalendar (client)', () => {
  it('issues a GET to /api/earnings with the symbol uppercased', async () => {
    await fetchEarningsCalendar('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/earnings?symbol=AAPL');
  });

  it('returns the items list', async () => {
    const result = await fetchEarningsCalendar('AAPL');
    expect(result.items).toHaveLength(1);
    expect(result.items[0].period).toBe('Q2 2026');
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchEarningsCalendar('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchEarningsCalendar('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchEarningsCalendar('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
