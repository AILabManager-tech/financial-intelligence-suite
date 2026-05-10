import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  PERIOD_KEYS,
  PERIOD_OPTIONS,
  isValidPeriod,
  mapPeriodToTwelveData,
} from './priceHistoryPeriods';

describe('priceHistoryPeriods', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the seven supported periods', () => {
    expect(PERIOD_KEYS).toEqual(['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y']);
  });

  it('every option carries a label and a default selector flag is set on 1M', () => {
    expect(PERIOD_OPTIONS.find((option) => option.key === '1M').isDefault).toBe(true);
    PERIOD_OPTIONS.forEach((option) => {
      expect(typeof option.label).toBe('string');
      expect(option.label.length).toBeGreaterThan(0);
    });
  });

  it('isValidPeriod accepts known keys and rejects others', () => {
    expect(isValidPeriod('1D')).toBe(true);
    expect(isValidPeriod('5y')).toBe(false);
    expect(isValidPeriod('')).toBe(false);
    expect(isValidPeriod(null)).toBe(false);
  });

  it('maps 1D to intraday hourly with 8 points', () => {
    expect(mapPeriodToTwelveData('1D')).toEqual({
      interval: '1h',
      outputsize: 8,
      timeUnit: 'intraday',
    });
  });

  it('maps 5D to 30-minute interval', () => {
    expect(mapPeriodToTwelveData('5D')).toEqual({
      interval: '30min',
      outputsize: 65,
      timeUnit: 'intraday',
    });
  });

  it('maps 1M to daily 22-point series', () => {
    expect(mapPeriodToTwelveData('1M')).toEqual({
      interval: '1day',
      outputsize: 22,
      timeUnit: 'daily',
    });
  });

  it('maps 6M to daily 130-point series', () => {
    expect(mapPeriodToTwelveData('6M')).toEqual({
      interval: '1day',
      outputsize: 130,
      timeUnit: 'daily',
    });
  });

  it('maps 1Y to daily 260-point series', () => {
    expect(mapPeriodToTwelveData('1Y')).toEqual({
      interval: '1day',
      outputsize: 260,
      timeUnit: 'daily',
    });
  });

  it('maps 5Y to weekly 260-point series', () => {
    expect(mapPeriodToTwelveData('5Y')).toEqual({
      interval: '1week',
      outputsize: 260,
      timeUnit: 'weekly',
    });
  });

  it('maps YTD to a daily window matching the elapsed year-to-date business days', () => {
    vi.setSystemTime(new Date('2026-03-15T12:00:00Z'));
    const result = mapPeriodToTwelveData('YTD');

    expect(result.interval).toBe('1day');
    expect(result.timeUnit).toBe('daily');
    // Jan 1 → Mar 15 = 73 calendar days, ~52 business days
    expect(result.outputsize).toBeGreaterThanOrEqual(45);
    expect(result.outputsize).toBeLessThanOrEqual(60);
  });

  it('YTD on Jan 1 returns at least one point so the chart is never empty', () => {
    vi.setSystemTime(new Date('2026-01-01T12:00:00Z'));
    expect(mapPeriodToTwelveData('YTD').outputsize).toBeGreaterThanOrEqual(1);
  });

  it('throws on invalid period rather than returning a silent default', () => {
    expect(() => mapPeriodToTwelveData('UNKNOWN')).toThrow(/period/i);
  });
});
