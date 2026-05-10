import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchSecFilings } from './secFilings.js';

const FIXED_NOW = new Date('2026-05-10T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = [
  {
    accessNumber: '0000320193-26-000005',
    symbol: 'AAPL',
    cik: '0000320193',
    form: '10-K',
    filedDate: '2026-04-12',
    acceptedDate: '2026-04-12 18:00:00',
    reportUrl: 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000005/aapl-20260412.htm',
    filingUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&accession_number=0000320193-26-000005',
  },
  {
    accessNumber: '0000320193-26-000004',
    symbol: 'AAPL',
    cik: '0000320193',
    form: '10-Q',
    filedDate: '2026-02-08',
    acceptedDate: '2026-02-08 16:30:00',
    reportUrl: 'https://www.sec.gov/Archives/.../10q.htm',
    filingUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?...',
  },
  {
    accessNumber: '0000320193-26-000003',
    symbol: 'AAPL',
    cik: '0000320193',
    form: '8-K',
    filedDate: '2026-01-15',
    acceptedDate: '2026-01-15 09:00:00',
    reportUrl: 'https://www.sec.gov/Archives/.../8k.htm',
    filingUrl: '',
  },
  // Junk: missing form
  { accessNumber: 'X', symbol: 'AAPL', filedDate: '2026-01-01' },
  // Junk: missing filedDate
  { accessNumber: 'Y', symbol: 'AAPL', form: '10-Q' },
  // Junk: no URL at all
  { accessNumber: 'Z', symbol: 'AAPL', form: '10-Q', filedDate: '2025-12-01' },
];

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchSecFilings', () => {
  it('hits /stock/filings with the uppercased symbol and the API token', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchSecFilings('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/stock/filings');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('token=tok');
  });

  it('keeps only items with form, filedDate and at least one URL', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.items).toHaveLength(3);
    expect(result.items[0]).toEqual({
      accessNumber: '0000320193-26-000005',
      form: '10-K',
      filedDate: '2026-04-12',
      acceptedDate: '2026-04-12 18:00:00',
      reportUrl: 'https://www.sec.gov/Archives/edgar/data/320193/000032019326000005/aapl-20260412.htm',
      filingUrl: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&accession_number=0000320193-26-000005',
      cik: '0000320193',
    });
  });

  it('keeps an item that has only a filingUrl', async () => {
    const fetcher = vi.fn(async () => okJson([{
      accessNumber: 'A',
      symbol: 'AAPL',
      form: '4',
      filedDate: '2026-04-01',
      reportUrl: '',
      filingUrl: 'https://www.sec.gov/foo',
    }]));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toHaveLength(1);
  });

  it('sorts items most-recent-first by filedDate', async () => {
    const fetcher = vi.fn(async () => okJson([RAW[2], RAW[0], RAW[1]]));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.filedDate)).toEqual(['2026-04-12', '2026-02-08', '2026-01-15']);
  });

  it('caps the result list to the limit option (default 15)', async () => {
    const huge = Array.from({ length: 30 }, (_, i) => ({
      accessNumber: `A-${i}`,
      symbol: 'AAPL',
      form: '10-Q',
      filedDate: `2026-04-${String(28 - i).padStart(2, '0')}`,
      reportUrl: `https://www.sec.gov/${i}.htm`,
    }));
    const fetcher = vi.fn(async () => okJson(huge));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toHaveLength(15);
  });

  it('honors a custom limit between 1 and 25', async () => {
    const huge = Array.from({ length: 30 }, (_, i) => ({
      accessNumber: `A-${i}`,
      symbol: 'AAPL',
      form: '10-Q',
      filedDate: `2026-04-${String(28 - i).padStart(2, '0')}`,
      reportUrl: `https://www.sec.gov/${i}.htm`,
    }));
    const fetcher = vi.fn(async () => okJson(huge));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher, limit: 5 });
    expect(result.items).toHaveLength(5);
  });

  it('returns an empty list when Finnhub returns no filings', async () => {
    const fetcher = vi.fn(async () => okJson([]));
    const result = await fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(
      fetchSecFilings('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchSecFilings('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });

  it('does not leak the API token in error messages', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) }));
    try {
      await fetchSecFilings('AAPL', { finnhubApiKey: 'super-secret-token', fetcher });
    } catch (error) {
      expect(error.message).not.toContain('super-secret-token');
    }
  });
});
