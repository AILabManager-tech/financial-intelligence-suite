import { describe, expect, it } from 'vitest';
import {
  describeFormType,
  formatFiledDate,
  resolveFilingUrl,
  groupByForm,
} from './secFilingsFormatters';

describe('describeFormType', () => {
  it('maps the most common forms to a French label', () => {
    expect(describeFormType('10-K')).toEqual({ key: '10-K', label: 'Rapport annuel', tone: 'violet' });
    expect(describeFormType('10-Q')).toEqual({ key: '10-Q', label: 'Rapport trimestriel', tone: 'sky' });
    expect(describeFormType('8-K')).toEqual({ key: '8-K', label: 'Événement matériel', tone: 'amber' });
    expect(describeFormType('4')).toEqual({ key: '4', label: 'Transaction insider', tone: 'rose' });
    expect(describeFormType('DEF 14A')).toEqual({ key: 'DEF 14A', label: 'Procuration (proxy)', tone: 'slate' });
    expect(describeFormType('S-1')).toEqual({ key: 'S-1', label: 'Inscription (IPO)', tone: 'emerald' });
    expect(describeFormType('13F-HR')).toEqual({ key: '13F-HR', label: 'Position institutionnelle', tone: 'indigo' });
  });

  it('falls back to a neutral label for unknown forms', () => {
    const result = describeFormType('CORRESP');
    expect(result.key).toBe('CORRESP');
    expect(result.label).toBe('CORRESP');
    expect(result.tone).toBe('slate');
  });

  it('returns null on empty input', () => {
    expect(describeFormType('')).toBeNull();
    expect(describeFormType(null)).toBeNull();
  });
});

describe('formatFiledDate', () => {
  it('formats an ISO date as a French short label in UTC', () => {
    expect(formatFiledDate('2026-04-12')).toMatch(/12 avr\.? 2026/);
  });

  it('returns null on missing or invalid input', () => {
    expect(formatFiledDate('')).toBeNull();
    expect(formatFiledDate('not-a-date')).toBeNull();
  });
});

describe('resolveFilingUrl', () => {
  it('prefers reportUrl when both are present', () => {
    expect(resolveFilingUrl({ reportUrl: 'https://r', filingUrl: 'https://f' })).toBe('https://r');
  });

  it('falls back to filingUrl when reportUrl is missing', () => {
    expect(resolveFilingUrl({ reportUrl: '', filingUrl: 'https://f' })).toBe('https://f');
    expect(resolveFilingUrl({ filingUrl: 'https://f' })).toBe('https://f');
  });

  it('returns null when neither is present', () => {
    expect(resolveFilingUrl({})).toBeNull();
    expect(resolveFilingUrl(null)).toBeNull();
  });
});

describe('groupByForm', () => {
  it('groups items by form, preserving the most-recent-first order', () => {
    const items = [
      { form: '10-K', filedDate: '2026-04-12' },
      { form: '10-Q', filedDate: '2026-02-08' },
      { form: '10-Q', filedDate: '2025-11-08' },
      { form: '8-K', filedDate: '2026-01-15' },
    ];
    const groups = groupByForm(items);
    expect(groups.map((g) => g.key)).toEqual(['10-K', '10-Q', '8-K']);
    expect(groups[1].items).toHaveLength(2);
    expect(groups[1].items[0].filedDate).toBe('2026-02-08');
  });

  it('returns an empty array when items are empty', () => {
    expect(groupByForm([])).toEqual([]);
    expect(groupByForm(null)).toEqual([]);
  });
});
