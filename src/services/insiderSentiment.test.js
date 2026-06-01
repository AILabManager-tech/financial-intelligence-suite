import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchInsiderSentiment } from './insiderSentiment';

const SAMPLE = { symbol: 'AAPL', source: 'finnhub.io', fetchedAt: '2026-05-09T12:00:00.000Z', items: [{ year: 2026, month: 3, mspr: 12.5, change: 5000 }] };

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) }));
});
afterEach(() => vi.restoreAllMocks());

describe('fetchInsiderSentiment (client)', () => {
  it('GET /api/insider-sentiment avec symbole majuscule', async () => {
    await fetchInsiderSentiment('aapl');
    expect(String(globalThis.fetch.mock.calls[0][0])).toContain('/api/insider-sentiment?symbol=AAPL');
  });

  it('retourne items + métadonnées', async () => {
    const r = await fetchInsiderSentiment('AAPL');
    expect(r.items[0].mspr).toBe(12.5);
  });

  it('throw sur symbole vide sans réseau', async () => {
    await expect(fetchInsiderSentiment('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('transmet le signal', async () => {
    const c = new AbortController();
    await fetchInsiderSentiment('AAPL', { signal: c.signal });
    expect(globalThis.fetch.mock.calls[0][1]?.signal).toBe(c.signal);
  });
});
