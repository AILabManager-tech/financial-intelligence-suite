import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ALERT_TYPES,
  addAlert,
  loadAlerts,
  markAlertTriggered,
  normalizeAlerts,
  removeAlert,
  saveAlerts,
  toggleAlertEnabled,
  updateAlert,
} from './alertStore';

describe('alertStore', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-09T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('exposes the supported alert types', () => {
    expect(ALERT_TYPES).toEqual([
      'price_above',
      'price_below',
      'change_pct_above',
      'change_pct_below',
      'drift_above',
    ]);
  });

  it('normalizes alerts: trims symbols, drops invalid records, coerces threshold to number', () => {
    expect(
      normalizeAlerts([
        { id: 'a', symbol: ' aapl ', type: 'price_above', threshold: '120.5', enabled: true },
        { id: 'b', symbol: 'NVDA', type: 'unknown_type', threshold: 1 },
        { symbol: 'MSFT', type: 'price_below', threshold: 100 },
        { id: 'c', symbol: '', type: 'drift_above', threshold: 5, enabled: false },
        { id: 'd', symbol: 'AAPL', type: 'change_pct_above', threshold: 'NaN', enabled: true },
      ]),
    ).toEqual([
      {
        id: 'a',
        symbol: 'AAPL',
        type: 'price_above',
        threshold: 120.5,
        enabled: true,
        createdAt: '2026-05-09T12:00:00.000Z',
        lastTriggeredAt: null,
        note: '',
      },
      {
        id: 'c',
        symbol: '',
        type: 'drift_above',
        threshold: 5,
        enabled: false,
        createdAt: '2026-05-09T12:00:00.000Z',
        lastTriggeredAt: null,
        note: '',
      },
    ]);
  });

  it('persists alerts to localStorage and reloads them', () => {
    saveAlerts([
      { id: 'a', symbol: 'aapl', type: 'price_above', threshold: 120, enabled: true },
    ]);

    const reloaded = loadAlerts();
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].symbol).toBe('AAPL');
    expect(reloaded[0].threshold).toBe(120);
  });

  it('addAlert assigns a stable id when missing and returns a new array', () => {
    const initial = [];
    const next = addAlert(initial, { symbol: 'AAPL', type: 'price_above', threshold: 150 });

    expect(next).not.toBe(initial);
    expect(next).toHaveLength(1);
    expect(next[0].id).toMatch(/^alert_/);
    expect(next[0].symbol).toBe('AAPL');
  });

  it('removeAlert filters by id', () => {
    const next = removeAlert(
      [
        { id: 'a', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: true },
        { id: 'b', symbol: 'NVDA', type: 'price_above', threshold: 200, enabled: true },
      ],
      'a',
    );

    expect(next.map((alert) => alert.id)).toEqual(['b']);
  });

  it('toggleAlertEnabled flips the enabled flag for a single alert', () => {
    const next = toggleAlertEnabled(
      [
        { id: 'a', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: true },
        { id: 'b', symbol: 'NVDA', type: 'price_above', threshold: 200, enabled: true },
      ],
      'a',
    );

    expect(next[0].enabled).toBe(false);
    expect(next[1].enabled).toBe(true);
  });

  it('updateAlert replaces fields by id, normalizing the result', () => {
    const next = updateAlert(
      [{ id: 'a', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: true }],
      'a',
      { threshold: '125', note: 'check' },
    );

    expect(next[0].threshold).toBe(125);
    expect(next[0].note).toBe('check');
  });

  it('markAlertTriggered stamps lastTriggeredAt without mutating untouched alerts', () => {
    const initial = [
      { id: 'a', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: true, lastTriggeredAt: null },
      { id: 'b', symbol: 'NVDA', type: 'price_above', threshold: 200, enabled: true, lastTriggeredAt: null },
    ];
    const next = markAlertTriggered(initial, 'a', '2026-05-09T12:00:00.000Z');

    expect(next[0].lastTriggeredAt).toBe('2026-05-09T12:00:00.000Z');
    expect(next[1]).toBe(initial[1]);
  });

  it('markAlertTriggered is idempotent when timestamp matches', () => {
    const initial = [
      { id: 'a', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: true, lastTriggeredAt: '2026-05-09T12:00:00.000Z' },
    ];
    const next = markAlertTriggered(initial, 'a', '2026-05-09T12:00:00.000Z');
    expect(next).toBe(initial);
  });
});
