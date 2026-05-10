import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchFundamentals } from './fundamentals';

const ASOF = '2026-05-09T12:00:00.000Z';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: ASOF,
  fields: {
    marketCap: { value: 3_400_000_000_000, source: 'finnhub.io', asOf: ASOF },
    peRatio: { value: 32.5, source: 'finnhub.io', asOf: ASOF },
  },
  upstream: { profile: 'fulfilled', metric: 'fulfilled' },
  cache: { status: 'miss', ttlMs: 21_600_000, expiresAt: ASOF },
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => (
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchFundamentals (client)', () => {
  it('issues a GET to /api/fundamentals with the symbol query param', async () => {
    await fetchFundamentals('aapl');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/fundamentals?symbol=AAPL');
  });

  it('returns the symbol, source, fetchedAt and fields payload', async () => {
    const result = await fetchFundamentals('AAPL');
    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.fetchedAt).toBe(ASOF);
    expect(result.fields.marketCap.value).toBe(3_400_000_000_000);
    expect(result.fields.peRatio.value).toBe(32.5);
  });

  it('returns an empty fields map when the API omits it', async () => {
    globalThis.fetch.mockImplementationOnce(() => (
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ symbol: 'X', source: 'finnhub.io', fetchedAt: ASOF }) })
    ));
    const result = await fetchFundamentals('X');
    expect(result.fields).toEqual({});
  });

  it('throws when the API responds with a non-OK status', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchFundamentals('AAPL')).rejects.toThrow(/502/);
  });

  it('throws when called without a symbol rather than hitting the API', async () => {
    await expect(fetchFundamentals('')).rejects.toThrow(/symbol/i);
    await expect(fetchFundamentals('   ')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards an AbortSignal so callers can cancel in-flight requests', async () => {
    const controller = new AbortController();
    await fetchFundamentals('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
