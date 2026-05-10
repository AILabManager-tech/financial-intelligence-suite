import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPriceHistory } from './priceHistory';

describe('fetchPriceHistory', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const search = new URL(url, 'http://test').searchParams;
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            symbol: search.get('symbol'),
            source: 'twelvedata.com',
            fetchedAt: '2026-05-09T12:00:00.000Z',
            period: search.get('period'),
            interval: search.get('period') ? 'mocked' : '1day',
            timeUnit: 'daily',
            points: [{ date: '2026-01-01', close: 100 }],
          }),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('forwards a valid period as a query parameter', async () => {
    await fetchPriceHistory('AAPL', { period: '1Y' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('period=1Y');
    expect(url).not.toContain('days=');
  });

  it('falls back to days when no period is given', async () => {
    await fetchPriceHistory('AAPL', { days: 60 });
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain('days=60');
    expect(url).not.toContain('period=');
  });

  it('keeps backward compatibility when called with a positional days number', async () => {
    await fetchPriceHistory('AAPL', 90);
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain('days=90');
  });

  it('drops invalid period values rather than letting them reach the API', async () => {
    await fetchPriceHistory('AAPL', { period: 'INVALID' });
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).not.toContain('period=');
    expect(url).not.toContain('days=');
  });

  it('throws on non-OK responses', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 503 }));
    await expect(fetchPriceHistory('AAPL', { period: '1M' })).rejects.toThrow(/503/);
  });
});
