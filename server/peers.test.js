import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPeers } from './peers.js';

const FIXED_NOW = new Date('2026-05-10T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchPeers', () => {
  it('hits /stock/peers with the uppercased symbol and the API token', async () => {
    const fetcher = vi.fn(async () => okJson(['AAPL', 'MSFT', 'GOOGL']));
    await fetchPeers('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/peers');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('token=tok');
  });

  it('removes the requested symbol from the peer list (case-insensitive)', async () => {
    const fetcher = vi.fn(async () => okJson(['aapl', 'MSFT', 'GOOGL', 'META']));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.peers).toEqual(['MSFT', 'GOOGL', 'META']);
  });

  it('uppercases peer symbols and de-duplicates them', async () => {
    const fetcher = vi.fn(async () => okJson(['MSFT', 'msft', 'GOOGL', '  meta  ', 'GOOGL']));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.peers).toEqual(['MSFT', 'GOOGL', 'META']);
  });

  it('drops empty, non-string and obviously invalid entries', async () => {
    const fetcher = vi.fn(async () => okJson(['MSFT', '', null, 42, '   ', 'GOOGL']));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.peers).toEqual(['MSFT', 'GOOGL']);
  });

  it('caps the result list to the limit option (default 10)', async () => {
    const huge = Array.from({ length: 20 }, (_, i) => `P${String(i).padStart(2, '0')}`);
    const fetcher = vi.fn(async () => okJson(huge));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.peers).toHaveLength(10);
    expect(result.peers[0]).toBe('P00');
  });

  it('honors a custom limit between 1 and 25', async () => {
    const huge = Array.from({ length: 20 }, (_, i) => `P${String(i).padStart(2, '0')}`);
    const fetcher = vi.fn(async () => okJson(huge));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher, limit: 5 });
    expect(result.peers).toHaveLength(5);
  });

  it('returns an empty list when Finnhub returns no peers', async () => {
    const fetcher = vi.fn(async () => okJson([]));
    const result = await fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.peers).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(
      fetchPeers('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchPeers('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the API token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    try {
      await fetchPeers('AAPL', { finnhubApiKey: 'super-secret-token', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret-token');
    }
  });
});
