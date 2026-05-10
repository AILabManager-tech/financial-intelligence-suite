import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSecFilings } from './secFilings';

const SAMPLE = {
  symbol: 'AAPL',
  source: 'finnhub.io',
  fetchedAt: '2026-05-10T12:00:00.000Z',
  items: [
    {
      accessNumber: '0000320193-26-000005',
      form: '10-K',
      filedDate: '2026-04-12',
      acceptedDate: '2026-04-12 18:00:00',
      reportUrl: 'https://www.sec.gov/...',
      filingUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?...',
      cik: '0000320193',
    },
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

describe('fetchSecFilings (client)', () => {
  it('issues a GET to /api/sec-filings with the symbol uppercased', async () => {
    await fetchSecFilings('aapl');
    const [url] = globalThis.fetch.mock.calls[0];
    expect(String(url)).toBe('/api/sec-filings?symbol=AAPL');
  });

  it('returns the items list', async () => {
    const result = await fetchSecFilings('AAPL');
    expect(result.items[0].form).toBe('10-K');
  });

  it('throws on non-OK response', async () => {
    globalThis.fetch.mockImplementationOnce(() => Promise.resolve({ ok: false, status: 502 }));
    await expect(fetchSecFilings('AAPL')).rejects.toThrow(/502/);
  });

  it('throws on missing symbol without hitting the network', async () => {
    await expect(fetchSecFilings('')).rejects.toThrow(/symbol/i);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('forwards the AbortSignal', async () => {
    const controller = new AbortController();
    await fetchSecFilings('AAPL', { signal: controller.signal });
    const [, init] = globalThis.fetch.mock.calls[0];
    expect(init?.signal).toBe(controller.signal);
  });
});
