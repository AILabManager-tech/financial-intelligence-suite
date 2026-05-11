import { describe, expect, it } from 'vitest';
import {
  calculatePortfolioAnalytics,
  enrichAssetsWithPositionMetrics,
  getSectorFamily,
} from './portfolioAnalytics';

const assets = [
  {
    symbol: 'AAA',
    sector: 'Technologie — Logiciels',
    price: 100,
    position: { quantity: 2, averageCost: 80, targetWeight: 40 },
  },
  {
    symbol: 'BBB',
    sector: 'Technologie — Semi-conducteurs',
    price: 50,
    position: { quantity: 2, averageCost: 60, targetWeight: 25 },
  },
  {
    symbol: 'CCC',
    sector: 'Finance — Banque',
    price: 100,
    position: { quantity: 1, averageCost: 90, targetWeight: 35 },
  },
];

describe('getSectorFamily', () => {
  it('extracts the top-level sector', () => {
    expect(getSectorFamily('Technologie — Logiciels')).toBe('Technologie');
  });

  it('falls back to "Non classé" on empty input', () => {
    expect(getSectorFamily('')).toBe('Non classé');
    expect(getSectorFamily()).toBe('Non classé');
  });
});

describe('enrichAssetsWithPositionMetrics', () => {
  it('adds market value, P&L and target drift', () => {
    const [first] = enrichAssetsWithPositionMetrics(assets);

    expect(first.positionMetrics.marketValue).toBe(200);
    expect(first.positionMetrics.unrealizedPnl).toBe(40);
    expect(first.positionMetrics.unrealizedPnlPct).toBe(25);
    expect(first.positionMetrics.weight).toBe(50);
    expect(first.positionMetrics.targetDrift).toBe(10);
  });

  it('returns an empty array when given no assets', () => {
    expect(enrichAssetsWithPositionMetrics([])).toEqual([]);
  });
});

describe('calculatePortfolioAnalytics', () => {
  it('computes market value, P&L, sector exposure and rebalance actions', () => {
    const result = calculatePortfolioAnalytics(assets);

    expect(result.totalMarketValue).toBe(400);
    expect(result.totalCost).toBe(370);
    expect(result.unrealizedPnl).toBe(30);
    expect(result.unrealizedPnlPct).toBeCloseTo(8.11, 1);
    expect(result.topSector.sector).toBe('Technologie');
    expect(result.topSector.weight).toBe(75);
    expect(result.sectorExposure).toHaveLength(2);
    expect(result.rebalanceActions[0]).toMatchObject({ symbol: 'AAA', action: 'Vendre' });
  });

  it('handles an empty portfolio without crashing', () => {
    const result = calculatePortfolioAnalytics([]);
    expect(result.totalMarketValue).toBe(0);
    expect(result.totalCost).toBe(0);
    expect(result.unrealizedPnl).toBe(0);
    expect(result.unrealizedPnlPct).toBe(0);
    expect(result.sectorExposure).toEqual([]);
    expect(result.topSector).toEqual({ sector: 'Non classé', count: 0, marketValue: 0, weight: 0 });
    expect(result.rebalanceActions).toEqual([]);
  });
});
