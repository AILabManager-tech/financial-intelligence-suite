import { describe, expect, it } from 'vitest';
import { evaluateAlerts } from './alertEvaluator';

const baseAsset = {
  symbol: 'AAPL',
  price: 120,
  changePct: 4,
  position: { quantity: 10, averageCost: 100, targetWeight: 50 },
  marketData: { status: 'live' },
};

const otherAsset = {
  symbol: 'NVDA',
  price: 800,
  changePct: -2,
  position: { quantity: 1, averageCost: 800, targetWeight: 50 },
  marketData: { status: 'live' },
};

describe('evaluateAlerts', () => {
  it('returns no triggers when alerts are disabled or thresholds are not met', () => {
    expect(
      evaluateAlerts(
        [
          { id: 'x', symbol: 'AAPL', type: 'price_above', threshold: 200, enabled: true },
          { id: 'y', symbol: 'AAPL', type: 'price_above', threshold: 100, enabled: false },
        ],
        [baseAsset, otherAsset],
        '2026-05-09T12:00:00.000Z',
      ),
    ).toEqual([]);
  });

  it('triggers price_above when current price >= threshold', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a1', symbol: 'AAPL', type: 'price_above', threshold: 110, enabled: true }],
      [baseAsset],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toEqual([
      {
        alertId: 'a1',
        symbol: 'AAPL',
        type: 'price_above',
        level: 'medium',
        title: 'Alerte prix',
        detail: 'AAPL à 120.00 USD ≥ seuil 110',
        threshold: 110,
        observedValue: 120,
        triggeredAt: '2026-05-09T12:00:00.000Z',
      },
    ]);
  });

  it('triggers price_below when current price <= threshold', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a2', symbol: 'NVDA', type: 'price_below', threshold: 800, enabled: true }],
      [baseAsset, otherAsset],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toHaveLength(1);
    expect(triggers[0].alertId).toBe('a2');
    expect(triggers[0].observedValue).toBe(800);
  });

  it('triggers change_pct_above on a positive variation reaching the threshold', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a3', symbol: 'AAPL', type: 'change_pct_above', threshold: 3, enabled: true }],
      [baseAsset],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toHaveLength(1);
    expect(triggers[0].type).toBe('change_pct_above');
    expect(triggers[0].observedValue).toBe(4);
  });

  it('triggers change_pct_below on a negative variation reaching the threshold', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a4', symbol: 'NVDA', type: 'change_pct_below', threshold: -2, enabled: true }],
      [otherAsset],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toHaveLength(1);
    expect(triggers[0].observedValue).toBe(-2);
  });

  it('triggers drift_above on the most drifted asset when symbol is empty (portfolio-wide)', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a5', symbol: '', type: 'drift_above', threshold: 5, enabled: true }],
      [
        { ...baseAsset, position: { ...baseAsset.position, targetWeight: 30 } },
        otherAsset,
      ],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toHaveLength(1);
    expect(triggers[0].type).toBe('drift_above');
    expect(Math.abs(triggers[0].observedValue)).toBeGreaterThanOrEqual(5);
  });

  it('triggers drift_above on a specific symbol when symbol is set', () => {
    const triggers = evaluateAlerts(
      [{ id: 'a6', symbol: 'AAPL', type: 'drift_above', threshold: 5, enabled: true }],
      [
        { ...baseAsset, position: { ...baseAsset.position, targetWeight: 30 } },
        otherAsset,
      ],
      '2026-05-09T12:00:00.000Z',
    );

    expect(triggers).toHaveLength(1);
    expect(triggers[0].symbol).toBe('AAPL');
  });

  it('ignores alerts on unknown symbols (no asset match)', () => {
    expect(
      evaluateAlerts(
        [{ id: 'a7', symbol: 'TSLA', type: 'price_above', threshold: 1, enabled: true }],
        [baseAsset],
        '2026-05-09T12:00:00.000Z',
      ),
    ).toEqual([]);
  });
});
