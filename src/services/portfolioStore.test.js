import { describe, expect, it } from 'vitest';
import { normalizePortfolioAsset, removePortfolioAsset, upsertPortfolioAsset } from './portfolioStore';

describe('normalizePortfolioAsset', () => {
  it('normalizes position fields', () => {
    expect(normalizePortfolioAsset({
      symbol: 'nvda',
      name: 'NVIDIA',
      price: '215.2',
      position: { quantity: '2', averageCost: '200', targetWeight: '10' },
    })).toMatchObject({
      symbol: 'NVDA',
      price: 215.2,
      position: { quantity: 2, averageCost: 200, targetWeight: 10 },
    });
  });
});

describe('portfolio updates', () => {
  it('upserts and removes assets', () => {
    const added = upsertPortfolioAsset([], { symbol: 'AAPL', name: 'Apple Inc.', price: 293 }, {
      quantity: 4,
      averageCost: 250,
      targetWeight: 12,
    });

    expect(added).toHaveLength(1);
    expect(added[0].position.quantity).toBe(4);
    expect(removePortfolioAsset(added, 'AAPL')).toHaveLength(0);
  });
});

