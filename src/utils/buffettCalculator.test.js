import { describe, it, expect } from 'vitest';
import {
  calcIntrinsicValue,
  evaluateCriteria,
  decideAction,
  inferMoat,
  resolveMoat,
  MOAT_OVERRIDES,
} from './buffettCalculator';

const baseStock = {
  ticker: 'TEST',
  price: 100,
  fcf: 5,
  roe: 0.20,
  debtEquity: 0.30,
  earningsGrowth5y: 0.10,
  hasMoat: true,
};

describe('calcIntrinsicValue — DCF formula', () => {
  it('produces a finite positive value when r > g', () => {
    const iv = calcIntrinsicValue(5, 0.05, 0.10);
    expect(iv).toBeGreaterThan(0);
    expect(Number.isFinite(iv)).toBe(true);
  });

  it('returns Infinity when r === g (Gordon divergence)', () => {
    expect(calcIntrinsicValue(5, 0.10, 0.10)).toBe(Infinity);
  });

  it('returns Infinity when r < g (impossible config)', () => {
    expect(calcIntrinsicValue(5, 0.15, 0.10)).toBe(Infinity);
  });

  it('scales linearly with FCF (homogeneity)', () => {
    const iv1 = calcIntrinsicValue(5, 0.05, 0.10);
    const iv2 = calcIntrinsicValue(10, 0.05, 0.10);
    expect(iv2 / iv1).toBeCloseTo(2, 6);
  });

  it('increases when growth rate increases (g↑ ⇒ IV↑)', () => {
    const ivLow = calcIntrinsicValue(5, 0.03, 0.10);
    const ivHigh = calcIntrinsicValue(5, 0.07, 0.10);
    expect(ivHigh).toBeGreaterThan(ivLow);
  });

  it('decreases when discount rate increases (r↑ ⇒ IV↓)', () => {
    const ivLowR = calcIntrinsicValue(5, 0.05, 0.08);
    const ivHighR = calcIntrinsicValue(5, 0.05, 0.15);
    expect(ivLowR).toBeGreaterThan(ivHighR);
  });

  it('returns 0 when FCF is 0', () => {
    expect(calcIntrinsicValue(0, 0.05, 0.10)).toBe(0);
  });

  it('respects custom horizon N', () => {
    const iv5 = calcIntrinsicValue(5, 0.05, 0.10, 5);
    const iv10 = calcIntrinsicValue(5, 0.05, 0.10, 10);
    expect(iv5).toBeGreaterThan(0);
    expect(iv10).toBeGreaterThan(0);
    expect(Math.abs(iv5 - iv10)).toBeLessThan(iv10);
  });

  it('matches a hand-computed reference (FCF=10, g=4%, r=10%, N=10)', () => {
    let pv = 0;
    for (let t = 1; t <= 10; t++) pv += (10 * Math.pow(1.04, t)) / Math.pow(1.10, t);
    const tv = (10 * Math.pow(1.04, 10) * 1.04) / 0.06;
    const expected = pv + tv / Math.pow(1.10, 10);
    expect(calcIntrinsicValue(10, 0.04, 0.10)).toBeCloseTo(expected, 6);
  });
});

describe('evaluateCriteria — Buffett 5-gate checklist', () => {
  it('all 5 PASS for the canonical fortress stock', () => {
    const c = evaluateCriteria(baseStock, 0.30);
    expect(c).toHaveLength(5);
    expect(c.every((x) => x.status === 'PASS')).toBe(true);
  });

  it('FAILS ROE when below 15%', () => {
    const c = evaluateCriteria({ ...baseStock, roe: 0.14 }, 0.30);
    expect(c.find((x) => x.label === 'ROE > 15%')?.status).toBe('FAIL');
  });

  it('FAILS Debt/Equity when ≥ 0.5', () => {
    const c = evaluateCriteria({ ...baseStock, debtEquity: 0.5 }, 0.30);
    expect(c.find((x) => x.label === 'Debt/Equity < 0.5')?.status).toBe('FAIL');
  });

  // « FCF > 0 » ne fait plus partie du score : le pipeline refuse pfcf <= 0 en
  // amont, donc le critère ne pouvait jamais échouer pour un titre analysé.
  // L'ancien test passait uniquement parce qu'il appelait cette fonction pure
  // avec fcf: 0 — une entrée que la production ne produit jamais.
  it('ne compte plus « FCF > 0 » (critère inatteignable via le pipeline réel)', () => {
    const c = evaluateCriteria({ ...baseStock, fcf: 0 }, 0.30);
    expect(c.find((x) => x.label === 'FCF > 0')).toBeUndefined();
  });

  it('FAILS earnings growth when ≤ 5%', () => {
    const c = evaluateCriteria({ ...baseStock, earningsGrowth5y: 0.05 }, 0.30);
    expect(c.find((x) => x.label === 'EPS growth 5y > 5%')?.status).toBe('FAIL');
  });

  it('FAILS moat when hasMoat=false', () => {
    const c = evaluateCriteria({ ...baseStock, hasMoat: false }, 0.30);
    expect(c.find((x) => x.label === 'Economic moat')?.status).toBe('FAIL');
  });

  it('FAILS MoS when ≤ 25%', () => {
    const c = evaluateCriteria(baseStock, 0.25);
    expect(c.find((x) => x.label === 'Margin of Safety > 25%')?.status).toBe('FAIL');
  });

  it('preserves the canonical order of criteria', () => {
    const c = evaluateCriteria(baseStock, 0.30);
    expect(c.map((x) => x.label)).toEqual([
      'ROE > 15%',
      'Debt/Equity < 0.5',
      'EPS growth 5y > 5%',
      'Economic moat',
      'Margin of Safety > 25%',
    ]);
  });
});

describe('decideAction — strategy decision', () => {
  it('returns BUY when all criteria pass, regardless of MoS sign', () => {
    expect(decideAction(true, 0.30)).toBe('BUY');
    expect(decideAction(true, 0.50)).toBe('BUY');
  });

  it('returns SELL when MoS < -10% (material overvaluation)', () => {
    expect(decideAction(false, -0.11)).toBe('SELL');
    expect(decideAction(false, -0.50)).toBe('SELL');
  });

  it('returns HOLD when criteria fail but MoS is not deeply negative', () => {
    expect(decideAction(false, 0.20)).toBe('HOLD');
    expect(decideAction(false, 0)).toBe('HOLD');
    expect(decideAction(false, -0.10)).toBe('HOLD');
    expect(decideAction(false, -0.05)).toBe('HOLD');
  });

  it('BUY takes precedence over SELL even if MoS is negative', () => {
    expect(decideAction(true, -0.50)).toBe('BUY');
  });
});

describe('inferMoat — heuristic moat detection', () => {
  const moatyInputs = { roe: 0.20, earningsGrowth5y: 0.10, fcf: 5, debtEquity: 0.30 };

  it('returns true when all four conditions hold', () => {
    expect(inferMoat(moatyInputs)).toBe(true);
  });

  it('returns false when ROE < 15%', () => {
    expect(inferMoat({ ...moatyInputs, roe: 0.14 })).toBe(false);
  });

  it('accepts ROE === 15% exactly (≥ threshold)', () => {
    expect(inferMoat({ ...moatyInputs, roe: 0.15 })).toBe(true);
  });

  it('returns false when EPS growth 5y < 5%', () => {
    expect(inferMoat({ ...moatyInputs, earningsGrowth5y: 0.04 })).toBe(false);
  });

  it('returns false when FCF ≤ 0', () => {
    expect(inferMoat({ ...moatyInputs, fcf: 0 })).toBe(false);
    expect(inferMoat({ ...moatyInputs, fcf: -1 })).toBe(false);
  });

  it('returns false when D/E ≥ 1.5', () => {
    expect(inferMoat({ ...moatyInputs, debtEquity: 1.5 })).toBe(false);
    expect(inferMoat({ ...moatyInputs, debtEquity: 2.0 })).toBe(false);
  });
});

describe('resolveMoat — heuristic with curated overrides', () => {
  it('honours explicit overrides over the heuristic', () => {
    expect(MOAT_OVERRIDES['BRK.B']).toBe(true);
    expect(
      resolveMoat('BRK.B', { roe: 0.092, earningsGrowth5y: 0.08, fcf: 18.5, debtEquity: 0.22 }),
    ).toBe(true);
  });

  it('falls through to inferMoat for unknown tickers', () => {
    expect(
      resolveMoat('UNKNOWN', { roe: 0.20, earningsGrowth5y: 0.10, fcf: 5, debtEquity: 0.30 }),
    ).toBe(true);
    expect(
      resolveMoat('UNKNOWN', { roe: 0.05, earningsGrowth5y: 0.10, fcf: 5, debtEquity: 0.30 }),
    ).toBe(false);
  });
});
