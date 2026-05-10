import { describe, expect, it } from 'vitest';
import {
  FUNDAMENTALS_DEFINITIONS,
  formatFundamentalValue,
  formatLargeUsd,
} from './fundamentalsFormatters';

describe('formatLargeUsd', () => {
  it('uses T above one trillion', () => {
    expect(formatLargeUsd(3_400_000_000_000)).toBe('$3.40T');
  });

  it('uses Mds between one billion and one trillion', () => {
    expect(formatLargeUsd(850_000_000_000)).toBe('$850.0Mds');
  });

  it('uses M between one million and one billion', () => {
    expect(formatLargeUsd(540_000_000)).toBe('$540.0M');
  });

  it('falls back to a plain dollar amount under one million', () => {
    expect(formatLargeUsd(125_000)).toBe('$125,000');
  });

  it('returns null for non-finite input', () => {
    expect(formatLargeUsd(Number.NaN)).toBeNull();
    expect(formatLargeUsd(undefined)).toBeNull();
  });
});

describe('formatFundamentalValue', () => {
  it('formats marketCap and revenueTtm as scaled USD', () => {
    expect(formatFundamentalValue('marketCap', 3_400_000_000_000)).toBe('$3.40T');
    expect(formatFundamentalValue('revenueTtm', 380_000_000_000)).toBe('$380.0Mds');
  });

  it('formats peRatio with a multiplier suffix', () => {
    expect(formatFundamentalValue('peRatio', 32.5)).toBe('32.5x');
  });

  it('formats epsTtm in USD with two decimals', () => {
    expect(formatFundamentalValue('epsTtm', 6.42)).toBe('$6.42');
  });

  it('formats margins and dividend yield as percentages without a sign', () => {
    expect(formatFundamentalValue('grossMargin', 45.2)).toBe('45.2%');
    expect(formatFundamentalValue('netMargin', 0)).toBe('0.0%');
    expect(formatFundamentalValue('dividendYield', 0.51)).toBe('0.51%');
  });

  it('formats beta with two decimals and no unit', () => {
    expect(formatFundamentalValue('beta', 1.273)).toBe('1.27');
  });

  it('returns string fields verbatim', () => {
    expect(formatFundamentalValue('country', 'US')).toBe('US');
    expect(formatFundamentalValue('industry', 'Technology')).toBe('Technology');
  });

  it('returns null for unknown keys or non-finite numeric values', () => {
    expect(formatFundamentalValue('unknown', 5)).toBeNull();
    expect(formatFundamentalValue('peRatio', Number.NaN)).toBeNull();
    expect(formatFundamentalValue('country', '')).toBeNull();
  });
});

describe('FUNDAMENTALS_DEFINITIONS', () => {
  it('lists every field with a stable label and order', () => {
    const keys = FUNDAMENTALS_DEFINITIONS.map((definition) => definition.key);
    expect(keys).toEqual([
      'marketCap',
      'revenueTtm',
      'peRatio',
      'epsTtm',
      'grossMargin',
      'operatingMargin',
      'netMargin',
      'dividendYield',
      'beta',
      'country',
      'industry',
    ]);
    FUNDAMENTALS_DEFINITIONS.forEach((definition) => {
      expect(definition.label).toMatch(/[A-Za-zÀ-ÿ]/);
    });
  });
});
