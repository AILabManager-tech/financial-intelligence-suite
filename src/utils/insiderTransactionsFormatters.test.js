import { describe, expect, it } from 'vitest';
import {
  describeTransactionCode,
  transactionDirection,
  directionTone,
  formatShareChange,
  formatInsiderDate,
  formatTransactionValue,
  summarizeInsiderActivity,
} from './insiderTransactionsFormatters';

describe('describeTransactionCode', () => {
  it('maps known SEC codes to French labels', () => {
    expect(describeTransactionCode('P').label).toBe('Achat (marché)');
    expect(describeTransactionCode('s').label).toBe('Vente (marché)');
    expect(describeTransactionCode('M').label).toBe('Exercice de dérivés');
  });

  it('falls back to the raw code for unknown codes', () => {
    expect(describeTransactionCode('Z')).toEqual({ code: 'Z', label: 'Z' });
  });

  it('handles empty/invalid input', () => {
    expect(describeTransactionCode('')).toEqual({ code: '', label: 'Non précisé' });
    expect(describeTransactionCode(null)).toEqual({ code: '', label: 'Non précisé' });
  });
});

describe('transactionDirection / directionTone', () => {
  it('derives direction from the share-change sign', () => {
    expect(transactionDirection(5000)).toBe('acquired');
    expect(transactionDirection(-240000)).toBe('disposed');
  });

  it('returns null for zero or invalid change', () => {
    expect(transactionDirection(0)).toBeNull();
    expect(transactionDirection('x')).toBeNull();
  });

  it('maps direction to palette tone', () => {
    expect(directionTone('acquired')).toBe('emerald');
    expect(directionTone('disposed')).toBe('rose');
    expect(directionTone(null)).toBe('slate');
  });
});

describe('formatShareChange', () => {
  it('formats with a sign and thousands separator', () => {
    const positive = formatShareChange(5000);
    expect(positive.startsWith('+')).toBe(true);
    expect(positive.replace(/\D/g, '')).toBe('5000');

    const negative = formatShareChange(-240000);
    expect(negative.startsWith('+')).toBe(false);
    expect(negative.replace(/\D/g, '')).toBe('240000');
  });

  it('returns null for zero or invalid', () => {
    expect(formatShareChange(0)).toBeNull();
    expect(formatShareChange('x')).toBeNull();
  });
});

describe('formatInsiderDate', () => {
  it('formats an ISO date in fr-CA UTC', () => {
    expect(formatInsiderDate('2026-04-02')).toMatch(/2026/);
  });

  it('returns null for invalid input', () => {
    expect(formatInsiderDate('')).toBeNull();
    expect(formatInsiderDate('not-a-date')).toBeNull();
  });
});

describe('formatTransactionValue', () => {
  it('multiplies absolute shares by price as USD', () => {
    expect(formatTransactionValue(-100, 170)).toMatch(/17\D?000/);
  });

  it('returns null when price or change is missing/non-positive', () => {
    expect(formatTransactionValue(100, null)).toBeNull();
    expect(formatTransactionValue(100, 0)).toBeNull();
    expect(formatTransactionValue(0, 170)).toBeNull();
  });
});

describe('summarizeInsiderActivity', () => {
  const items = [
    { name: 'COOK TIMOTHY', change: -240000, transactionDate: '2026-04-02' },
    { name: 'MAESTRI LUCA', change: 5000, transactionDate: '2026-03-10' },
    { name: 'COOK TIMOTHY', change: 1000, transactionDate: '2026-02-01' },
    { name: 'ZERO', change: 0, transactionDate: '2026-01-01' },
  ];

  it('aggregates buys, sells, net shares and unique insiders', () => {
    const summary = summarizeInsiderActivity(items);
    expect(summary.hasData).toBe(true);
    expect(summary.buyCount).toBe(2);
    expect(summary.sellCount).toBe(1);
    expect(summary.acquiredShares).toBe(6000);
    expect(summary.disposedShares).toBe(240000);
    expect(summary.netShares).toBe(-234000);
    expect(summary.netDirection).toBe('disposed');
    expect(summary.uniqueInsiders).toBe(2);
    expect(summary.lastTransactionDate).toBe('2026-04-02');
  });

  it('returns hasData false for empty or all-zero input', () => {
    expect(summarizeInsiderActivity([])).toEqual({ hasData: false });
    expect(summarizeInsiderActivity([{ name: 'X', change: 0 }])).toEqual({ hasData: false });
    expect(summarizeInsiderActivity(null)).toEqual({ hasData: false });
  });
});
