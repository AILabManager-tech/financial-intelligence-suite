import { describe, it, expect } from 'vitest';
import {
  extractBuffettInputs,
  formatPercent,
  formatRatio,
  formatCurrency,
  formatActionLabel,
} from './buffettFormatters';

const ASOF = '2026-05-09T12:00:00.000Z';
const SRC = 'finnhub.io';

const fields = {
  roeTtm: { value: 43.62, source: SRC, asOf: ASOF },
  epsGrowth5y: { value: 11.14, source: SRC, asOf: ASOF },
  debtEquityAnnual: { value: 1.4142, source: SRC, asOf: ASOF },
  pfcfShareTtm: { value: 26.86, source: SRC, asOf: ASOF },
};

describe('extractBuffettInputs', () => {
  it('returns null when any required field is missing', () => {
    expect(extractBuffettInputs({ ticker: 'KO', price: 62.10, fields: {} })).toBeNull();
    expect(
      extractBuffettInputs({
        ticker: 'KO',
        price: 62.10,
        fields: { ...fields, roeTtm: undefined },
      }),
    ).toBeNull();
  });

  it('returns null when price is missing or non-finite', () => {
    expect(extractBuffettInputs({ ticker: 'KO', price: 0, fields })).toBeNull();
    expect(extractBuffettInputs({ ticker: 'KO', price: null, fields })).toBeNull();
    expect(extractBuffettInputs({ ticker: 'KO', price: NaN, fields })).toBeNull();
  });

  it('converts Finnhub raw values into ratios consumed by the calculator', () => {
    const result = extractBuffettInputs({ ticker: 'KO', price: 62.10, fields });
    expect(result.roe).toBeCloseTo(0.4362, 4);
    expect(result.earningsGrowth5y).toBeCloseTo(0.1114, 4);
    expect(result.debtEquity).toBeCloseTo(1.4142, 4);
  });

  it('derives FCF per share from price / pfcfShareTtm', () => {
    const result = extractBuffettInputs({ ticker: 'KO', price: 62.10, fields });
    // 62.10 / 26.86 ≈ 2.31
    expect(result.fcf).toBeCloseTo(62.10 / 26.86, 4);
  });

  it('returns null when pfcfShareTtm is zero or negative (avoids divide-by-zero)', () => {
    const broken = { ...fields, pfcfShareTtm: { value: 0, source: SRC, asOf: ASOF } };
    expect(extractBuffettInputs({ ticker: 'KO', price: 62.10, fields: broken })).toBeNull();
    const negative = { ...fields, pfcfShareTtm: { value: -5, source: SRC, asOf: ASOF } };
    expect(extractBuffettInputs({ ticker: 'KO', price: 62.10, fields: negative })).toBeNull();
  });

  it('exposes the upstream source and the most recent asOf for audit traceability', () => {
    const result = extractBuffettInputs({ ticker: 'KO', price: 62.10, fields });
    expect(result.source).toBe('finnhub.io');
    expect(result.asOf).toBe(ASOF);
  });

  it('passes the ticker through verbatim for moat-override resolution', () => {
    const result = extractBuffettInputs({ ticker: 'BRK.B', price: 412.30, fields });
    expect(result.ticker).toBe('BRK.B');
  });
});

describe('formatters', () => {
  it('formatPercent renders a signed percentage with two decimals', () => {
    expect(formatPercent(0.5881)).toBe('+58.81%');
    expect(formatPercent(-0.5881)).toBe('-58.81%');
    expect(formatPercent(0)).toBe('+0.00%');
  });

  it('formatPercent returns null on non-finite input', () => {
    expect(formatPercent(NaN)).toBeNull();
    expect(formatPercent(Infinity)).toBeNull();
    expect(formatPercent(null)).toBeNull();
  });

  it('formatRatio renders a fixed-decimal ratio', () => {
    expect(formatRatio(1.4142)).toBe('1.41');
    expect(formatRatio(0)).toBe('0.00');
  });

  it('formatCurrency renders USD with two decimals', () => {
    expect(formatCurrency(184.69)).toBe('$184.69');
    expect(formatCurrency(0)).toBe('$0.00');
  });

  it('formatCurrency renders ∞ when intrinsic value diverges (r ≤ g)', () => {
    expect(formatCurrency(Infinity)).toBe('∞');
  });

  it('formatActionLabel maps engine actions to French UI labels', () => {
    expect(formatActionLabel('BUY')).toBe('Acheter');
    expect(formatActionLabel('SELL')).toBe('Vendre');
    expect(formatActionLabel('HOLD')).toBe('Conserver');
    expect(formatActionLabel('UNKNOWN')).toBeNull();
  });
});
