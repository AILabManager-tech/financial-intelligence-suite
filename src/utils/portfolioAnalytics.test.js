import { describe, expect, it } from 'vitest';
import {
  buildStressScenarios,
  calculatePortfolioAnalytics,
  enrichAssetsWithPositionMetrics,
  getSectorFamily,
} from './portfolioAnalytics';

const assets = [
  {
    symbol: 'AAA',
    sector: 'Technologie — Logiciels',
    price: 100,
    score: 90,
    position: { quantity: 2, averageCost: 80, targetWeight: 40 },
    history: [80, 84, 88, 90],
    integrity: { verified: true },
  },
  {
    symbol: 'BBB',
    sector: 'Technologie — Semi-conducteurs',
    price: 50,
    score: 68,
    position: { quantity: 2, averageCost: 60, targetWeight: 25 },
    history: [76, 72, 70, 68],
    integrity: { verified: true },
  },
  {
    symbol: 'CCC',
    sector: 'Finance — Banque',
    price: 100,
    score: 76,
    position: { quantity: 1, averageCost: 90, targetWeight: 35 },
    history: [74, 75, 76, 76],
    integrity: { verified: false },
  },
];

describe('getSectorFamily', () => {
  it('extracts the top-level sector', () => {
    expect(getSectorFamily('Technologie — Logiciels')).toBe('Technologie');
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
});

describe('calculatePortfolioAnalytics', () => {
  it('computes portfolio-level risk and exposure', () => {
    const result = calculatePortfolioAnalytics(assets);

    expect(result.methodology).toBe('market-value-weighted');
    expect(result.totalMarketValue).toBe(400);
    expect(result.unrealizedPnl).toBe(30);
    expect(result.unrealizedPnlPct).toBeCloseTo(8.11, 1);
    expect(result.avgScore).toBe(81);
    expect(result.topSector.sector).toBe('Technologie');
    expect(result.topSector.weight).toBe(75);
    expect(result.weakAssets).toHaveLength(1);
    expect(result.highConviction).toHaveLength(1);
    expect(result.driftedAssets).toHaveLength(2);
    expect(result.rebalanceActions[0]).toMatchObject({ symbol: 'AAA', action: 'Vendre' });
    expect(result.alerts.some((alert) => alert.title === 'Concentration sectorielle')).toBe(true);
  });
});

describe('buildStressScenarios', () => {
  it('builds actionable downside scenarios', () => {
    const analytics = calculatePortfolioAnalytics(assets);
    const scenarios = buildStressScenarios(analytics);

    expect(scenarios).toHaveLength(3);
    expect(scenarios[0].impact).toBeLessThan(0);
    expect(scenarios.map((scenario) => scenario.name)).toContain('Correction tech -12%');
  });
});
