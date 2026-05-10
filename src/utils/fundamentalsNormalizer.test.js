import { describe, expect, it } from 'vitest';
import { normalizeFundamentals } from './fundamentalsNormalizer';

const ASOF = '2026-05-09T12:00:00.000Z';

const fullProfile = {
  country: 'US',
  finnhubIndustry: 'Technology',
  marketCapitalization: 3_400_000, // millions USD → 3.4T USD bruts
  shareOutstanding: 15_000, // millions
  ticker: 'AAPL',
};

const fullMetric = {
  metric: {
    peTTM: 32.5,
    epsTTM: 6.42,
    revenuePerShareTTM: 25.7,
    grossMarginTTM: 45.2,
    operatingMarginTTM: 30.1,
    netProfitMarginTTM: 25.8,
    dividendYieldIndicatedAnnual: 0.51,
    beta: 1.27,
  },
};

describe('normalizeFundamentals', () => {
  it('extracts every documented field from a complete Finnhub payload', () => {
    const result = normalizeFundamentals({
      profile: fullProfile,
      metric: fullMetric,
      asOf: ASOF,
    });

    expect(result).toEqual({
      marketCap: { value: 3_400_000_000_000, source: 'finnhub.io', asOf: ASOF },
      peRatio: { value: 32.5, source: 'finnhub.io', asOf: ASOF },
      epsTtm: { value: 6.42, source: 'finnhub.io', asOf: ASOF },
      revenueTtm: { value: 25.7 * 15_000 * 1_000_000, source: 'finnhub.io', asOf: ASOF },
      grossMargin: { value: 45.2, source: 'finnhub.io', asOf: ASOF },
      operatingMargin: { value: 30.1, source: 'finnhub.io', asOf: ASOF },
      netMargin: { value: 25.8, source: 'finnhub.io', asOf: ASOF },
      dividendYield: { value: 0.51, source: 'finnhub.io', asOf: ASOF },
      beta: { value: 1.27, source: 'finnhub.io', asOf: ASOF },
      country: { value: 'US', source: 'finnhub.io', asOf: ASOF },
      industry: { value: 'Technology', source: 'finnhub.io', asOf: ASOF },
    });
  });

  it('omits fields that are absent rather than emitting null placeholders', () => {
    const result = normalizeFundamentals({
      profile: { country: 'US' },
      metric: { metric: { peTTM: 18.3 } },
      asOf: ASOF,
    });

    expect(result).toEqual({
      peRatio: { value: 18.3, source: 'finnhub.io', asOf: ASOF },
      country: { value: 'US', source: 'finnhub.io', asOf: ASOF },
    });
    expect(result).not.toHaveProperty('marketCap');
    expect(result).not.toHaveProperty('revenueTtm');
    expect(result).not.toHaveProperty('industry');
  });

  it('omits revenueTtm when only one of the two factors is available', () => {
    const onlyShares = normalizeFundamentals({
      profile: { shareOutstanding: 15_000 },
      metric: { metric: {} },
      asOf: ASOF,
    });
    expect(onlyShares).not.toHaveProperty('revenueTtm');

    const onlyRevenuePerShare = normalizeFundamentals({
      profile: {},
      metric: { metric: { revenuePerShareTTM: 25.7 } },
      asOf: ASOF,
    });
    expect(onlyRevenuePerShare).not.toHaveProperty('revenueTtm');
  });

  it('drops non-finite numeric values (NaN, Infinity, strings) without crashing', () => {
    const result = normalizeFundamentals({
      profile: { marketCapitalization: 'n/a', shareOutstanding: 0 },
      metric: { metric: { peTTM: 'NA', epsTTM: Infinity, beta: NaN, grossMarginTTM: 0 } },
      asOf: ASOF,
    });

    expect(result).not.toHaveProperty('marketCap');
    expect(result).not.toHaveProperty('peRatio');
    expect(result).not.toHaveProperty('epsTtm');
    expect(result).not.toHaveProperty('beta');
    // 0 is a valid measurement (e.g. non-dividend payer) — keep it.
    expect(result.grossMargin).toEqual({ value: 0, source: 'finnhub.io', asOf: ASOF });
  });

  it('returns an empty object when both payloads are empty or missing', () => {
    expect(normalizeFundamentals({ profile: {}, metric: {}, asOf: ASOF })).toEqual({});
    expect(normalizeFundamentals({ asOf: ASOF })).toEqual({});
    expect(normalizeFundamentals({})).toEqual({});
  });

  it('rejects empty string country/industry rather than emitting hollow chips', () => {
    const result = normalizeFundamentals({
      profile: { country: '', finnhubIndustry: '   ' },
      metric: {},
      asOf: ASOF,
    });
    expect(result).toEqual({});
  });

  it('uses the caller-supplied asOf on every emitted field for audit traceability', () => {
    const result = normalizeFundamentals({
      profile: { country: 'CA' },
      metric: { metric: { beta: 1.1 } },
      asOf: '2025-01-01T00:00:00.000Z',
    });
    expect(result.country.asOf).toBe('2025-01-01T00:00:00.000Z');
    expect(result.beta.asOf).toBe('2025-01-01T00:00:00.000Z');
  });

  it('emits Buffett-analysis fields when present (raw Finnhub values)', () => {
    const result = normalizeFundamentals({
      profile: { country: 'US' },
      metric: {
        metric: {
          roeTTM: 43.62,
          epsGrowth5Y: 11.14,
          'totalDebt/totalEquityAnnual': 1.4142,
          pfcfShareTTM: 26.86,
        },
      },
      asOf: ASOF,
    });
    expect(result.roeTtm).toEqual({ value: 43.62, source: 'finnhub.io', asOf: ASOF });
    expect(result.epsGrowth5y).toEqual({ value: 11.14, source: 'finnhub.io', asOf: ASOF });
    expect(result.debtEquityAnnual).toEqual({ value: 1.4142, source: 'finnhub.io', asOf: ASOF });
    expect(result.pfcfShareTtm).toEqual({ value: 26.86, source: 'finnhub.io', asOf: ASOF });
  });

  it('omits each Buffett field independently when its source value is absent', () => {
    const result = normalizeFundamentals({
      profile: {},
      metric: { metric: { roeTTM: 12.5 } },
      asOf: ASOF,
    });
    expect(result).toHaveProperty('roeTtm');
    expect(result).not.toHaveProperty('epsGrowth5y');
    expect(result).not.toHaveProperty('debtEquityAnnual');
    expect(result).not.toHaveProperty('pfcfShareTtm');
  });
});
