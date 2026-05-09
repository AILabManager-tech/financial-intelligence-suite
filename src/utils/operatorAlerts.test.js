import { describe, expect, it } from 'vitest';
import { buildOperatorAlerts } from './operatorAlerts';

describe('buildOperatorAlerts', () => {
  it('creates alerts for stale sources, large variations and allocation drift', () => {
    const alerts = buildOperatorAlerts([
      {
        symbol: 'AAPL',
        price: 120,
        changePct: 6.5,
        position: { quantity: 10, averageCost: 100, targetWeight: 10 },
        marketData: { status: 'stale' },
      },
      {
        symbol: 'MSFT',
        price: 100,
        changePct: 1,
        position: { quantity: 1, averageCost: 100, targetWeight: 90 },
        marketData: { status: 'live' },
      },
    ]);

    expect(alerts.map((alert) => alert.type)).toEqual(expect.arrayContaining([
      'source_stale',
      'price_variation',
      'allocation_drift',
    ]));
    expect(alerts).toHaveLength(4);
  });

  it('returns no alerts when assets are inside thresholds', () => {
    expect(buildOperatorAlerts([
      {
        symbol: 'AAPL',
        price: 100,
        changePct: 1,
        position: { quantity: 1, averageCost: 100, targetWeight: 100 },
        marketData: { status: 'live' },
      },
    ])).toEqual([]);
  });
});
