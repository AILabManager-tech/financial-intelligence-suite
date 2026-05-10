import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchEarningsCalendar } from './earningsCalendar.js';

const FIXED_NOW = new Date('2026-05-09T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

const RAW = {
  earningsCalendar: [
    {
      date: '2026-01-30',
      hour: 'amc',
      symbol: 'AAPL',
      year: 2026,
      quarter: 1,
      epsActual: 2.18,
      epsEstimate: 2.10,
      revenueActual: 119_575_000_000,
      revenueEstimate: 117_910_000_000,
    },
    {
      date: '2026-04-30',
      hour: 'amc',
      symbol: 'AAPL',
      year: 2026,
      quarter: 2,
      epsActual: 1.65,
      epsEstimate: 1.50,
      revenueActual: null,
      revenueEstimate: 94_000_000_000,
    },
    {
      date: '2026-07-30',
      hour: 'amc',
      symbol: 'AAPL',
      year: 2026,
      quarter: 3,
      epsActual: null,
      epsEstimate: 1.40,
      revenueActual: null,
      revenueEstimate: 89_000_000_000,
    },
    // Wrong symbol — should be filtered out.
    { date: '2026-04-30', symbol: 'MSFT', year: 2026, quarter: 2, epsEstimate: 3 },
  ],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('fetchEarningsCalendar', () => {
  it('hits /calendar/earnings with the expected from/to window', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    await fetchEarningsCalendar('aapl', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/calendar/earnings');
    expect(url).toContain('symbol=AAPL');
    expect(url).toContain('from=2025-05-09');
    expect(url).toContain('to=2026-08-07');
    expect(url).toContain('token=tok');
  });

  it('filters items to the requested symbol and tags past vs upcoming', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher });

    expect(result.symbol).toBe('AAPL');
    expect(result.source).toBe('finnhub.io');
    expect(result.items).toHaveLength(3);

    const past = result.items.filter((i) => i.when === 'past');
    const upcoming = result.items.filter((i) => i.when === 'upcoming');
    expect(past).toHaveLength(2);
    expect(upcoming).toHaveLength(1);
  });

  it('computes EPS surprise percentage when both actual and estimate are present', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher });
    const q1 = result.items.find((i) => i.period === 'Q1 2026');
    expect(q1.surprisePct).toBeCloseTo(((2.18 - 2.10) / 2.10) * 100, 4);
    const upcoming = result.items.find((i) => i.when === 'upcoming');
    expect(upcoming.surprisePct).toBeNull();
  });

  it('formats the period label as "Q<n> <year>"', async () => {
    const fetcher = vi.fn(async () => okJson(RAW));
    const result = await fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.period)).toEqual(['Q3 2026', 'Q2 2026', 'Q1 2026']);
  });

  it('sorts items most-recent-first regardless of upstream order', async () => {
    const reversed = { earningsCalendar: [...RAW.earningsCalendar].reverse() };
    const fetcher = vi.fn(async () => okJson(reversed));
    const result = await fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items.map((i) => i.date)).toEqual(['2026-07-30', '2026-04-30', '2026-01-30']);
  });

  it('returns an empty list when Finnhub returns no calendar', async () => {
    const fetcher = vi.fn(async () => okJson({ earningsCalendar: null }));
    const result = await fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher });
    expect(result.items).toEqual([]);
  });

  it('throws when Finnhub returns a non-OK response', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 503, json: async () => ({}) }));
    await expect(
      fetchEarningsCalendar('AAPL', { finnhubApiKey: 'tok', fetcher }),
    ).rejects.toThrow(/AAPL/);
  });

  it('rejects when no Finnhub API key is configured', async () => {
    await expect(
      fetchEarningsCalendar('AAPL', { finnhubApiKey: '', fetcher: vi.fn() }),
    ).rejects.toThrow(/FINNHUB_API_KEY/);
  });
});
