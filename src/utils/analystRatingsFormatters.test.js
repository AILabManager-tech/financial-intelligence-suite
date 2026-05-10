import { describe, expect, it } from 'vitest';
import {
  RATING_BUCKETS,
  buildHistorySeries,
  computeConsensus,
  formatBreakdown,
  formatPeriod,
} from './analystRatingsFormatters';

describe('computeConsensus', () => {
  it('returns null on items with no votes', () => {
    expect(computeConsensus(null)).toBeNull();
    expect(computeConsensus({ total: 0 })).toBeNull();
  });

  it('classifies a strong-buy distribution', () => {
    const result = computeConsensus({ strongBuy: 10, buy: 0, hold: 0, sell: 0, strongSell: 0, total: 10 });
    expect(result).toMatchObject({ key: 'strong-buy', label: 'Achat fort', tone: 'emerald', mean: 5 });
  });

  it('classifies a buy distribution', () => {
    const result = computeConsensus({ strongBuy: 12, buy: 18, hold: 7, sell: 1, strongSell: 0, total: 38 });
    expect(result.key).toBe('buy');
    expect(result.tone).toBe('emerald');
    expect(result.mean).toBeCloseTo(4.08, 1);
  });

  it('classifies a hold distribution', () => {
    const result = computeConsensus({ strongBuy: 1, buy: 4, hold: 10, sell: 4, strongSell: 1, total: 20 });
    expect(result.key).toBe('hold');
    expect(result.tone).toBe('amber');
  });

  it('classifies a sell distribution', () => {
    const result = computeConsensus({ strongBuy: 0, buy: 0, hold: 5, sell: 10, strongSell: 5, total: 20 });
    expect(result.key).toBe('sell');
    expect(result.tone).toBe('rose');
  });

  it('classifies a strong-sell distribution', () => {
    const result = computeConsensus({ strongBuy: 0, buy: 0, hold: 0, sell: 0, strongSell: 8, total: 8 });
    expect(result).toMatchObject({ key: 'strong-sell', label: 'Vendre fort', mean: 1 });
  });
});

describe('formatBreakdown', () => {
  it('returns count + percentage per bucket using the latest item total', () => {
    const breakdown = formatBreakdown({ strongBuy: 10, buy: 5, hold: 3, sell: 1, strongSell: 1, total: 20 });
    expect(breakdown).toHaveLength(RATING_BUCKETS.length);
    expect(breakdown[0]).toMatchObject({ key: 'strongBuy', count: 10, pct: 50, tone: 'emerald' });
    expect(breakdown[2]).toMatchObject({ key: 'hold', count: 3, pct: 15 });
  });

  it('returns an empty array for items with no votes', () => {
    expect(formatBreakdown({ total: 0 })).toEqual([]);
    expect(formatBreakdown(null)).toEqual([]);
  });
});

describe('formatPeriod', () => {
  it('formats a YYYY-MM-DD period as French short month', () => {
    const formatted = formatPeriod('2026-04-01');
    expect(formatted).toMatch(/avr/);
    expect(formatted).toContain('2026');
  });

  it('returns null for an empty period', () => {
    expect(formatPeriod('')).toBeNull();
  });
});

describe('buildHistorySeries', () => {
  it('limits to the most-recent N items and projects period + mean', () => {
    const items = [
      { period: '2026-04-01', strongBuy: 10, buy: 5, hold: 0, sell: 0, strongSell: 0, total: 15 },
      { period: '2026-03-01', strongBuy: 5, buy: 5, hold: 5, sell: 0, strongSell: 0, total: 15 },
      { period: '2026-02-01', strongBuy: 0, buy: 0, hold: 0, sell: 5, strongSell: 5, total: 10 },
    ];
    const series = buildHistorySeries(items, { limit: 2 });
    expect(series).toHaveLength(2);
    expect(series[0].period).toBe('2026-04-01');
    expect(series[0].label).toMatch(/Achat/);
    expect(series[1].mean).toBeCloseTo(4, 1);
  });

  it('returns empty array on non-array input', () => {
    expect(buildHistorySeries(null)).toEqual([]);
  });
});
