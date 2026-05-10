import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchPeers, fetchPeerQuotes } from './peers';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-10T12:00:00.000Z',
  peers: ['MSFT', 'GOOGL', 'META', 'AMZN'],
};

beforeEach(() => {
  vi.spyOn(globalThis, 'fetch').mockImplementation(() => (
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(SAMPLE) })
  ));
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchPeers (client)', () => {
  it('issues a GET to /api/peers with the symbol uppercased', async () => {
    await fetchPeers('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/peers?symbol=AAPL');
  });

  it('returns the peers list', async () => {
    const result = await fetchPeers('AAPL');
    expect(result.peers).toEqual(['MSFT', 'GOOGL', 'META', 'AMZN']);
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchPeers('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchPeers('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchPeers('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});

describe('fetchPeerQuotes (client)', () => {
  it('returns an empty payload without hitting the network when symbols are empty', async () => {
    const result = await fetchPeerQuotes([]);
    expect(result.quotes).toEqual([]);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('issues a GET to /api/quotes with comma-separated uppercased symbols', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve({ quotes: [], errors: [] }),
    }));
    await fetchPeerQuotes(['msft', ' GOOGL ', 'meta']);
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/quotes?symbols=MSFT%2CGOOGL%2CMETA');
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchPeerQuotes(['MSFT'])).rejects.toThrow(/502/);
  });

  it('forwards the AbortSignal', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({
      ok: true, status: 200, json: () => Promise.resolve({ quotes: [], errors: [] }),
    }));
    const controller = new AbortController();
    await fetchPeerQuotes(['MSFT'], { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
