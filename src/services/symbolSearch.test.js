import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { searchSymbols } from './symbolSearch';

describe('searchSymbols', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        source: 'finnhub.io',
        fetchedAt: '2026-05-09T12:00:00.000Z',
        results: [
          { symbol: 'AAPL', description: 'APPLE INC', type: 'Common Stock' },
          { symbol: 'AAPL.MI', description: 'APPLE INC', type: 'Common Stock' },
          { symbol: 'AIR.PA', description: 'AIRBUS SE', type: 'Common Stock' },
        ],
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('enriches each result with exchange/country metadata', async () => {
    const payload = await searchSymbols('apple');

    expect(payload.results[0]).toMatchObject({
      symbol: 'AAPL',
      country: 'US',
      exchange: 'NASDAQ/NYSE',
      base: 'AAPL',
      suffix: '',
    });
    expect(payload.results[1]).toMatchObject({
      symbol: 'AAPL.MI',
      country: 'IT',
      exchange: 'Borsa Italiana',
      base: 'AAPL',
      suffix: '.MI',
    });
    expect(payload.results[2]).toMatchObject({
      symbol: 'AIR.PA',
      country: 'FR',
      exchange: 'Euronext Paris',
    });
  });

  it('throws on non-OK responses', async () => {
    globalThis.fetch.mockResolvedValueOnce({ ok: false, status: 503 });
    await expect(searchSymbols('apple')).rejects.toThrow(/503/);
  });
});
