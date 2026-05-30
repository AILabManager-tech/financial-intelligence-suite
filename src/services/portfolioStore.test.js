import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { normalizePortfolioAsset, removePortfolioAsset, upsertPortfolioAsset, loadPortfolioAssets, savePortfolioAssets } from './portfolioStore';

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

describe('positions scopées par mandat (P3.2)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('isole les positions de chaque mandat (clé namespacée), default = clé legacy', () => {
    savePortfolioAssets([{ symbol: 'AAPL', name: 'Apple', price: 200, position: { quantity: 1, averageCost: 100, targetWeight: 0 } }], 'default');
    savePortfolioAssets([{ symbol: 'MSFT', name: 'Microsoft', price: 300, position: { quantity: 2, averageCost: 150, targetWeight: 0 } }], 'client-a');

    expect(loadPortfolioAssets([], 'default').map((a) => a.symbol)).toEqual(['AAPL']);
    expect(loadPortfolioAssets([], 'client-a').map((a) => a.symbol)).toEqual(['MSFT']);
    // le mandat 'default' utilise la clé legacy (rétro-compat)
    expect(localStorage.getItem('financial-intelligence-suite.portfolio.v1')).not.toBeNull();
    expect(localStorage.getItem('financial-intelligence-suite.portfolio.v1::client-a')).not.toBeNull();
  });

  it("un mandat sans positions stockées retombe sur le défaut fourni", () => {
    expect(loadPortfolioAssets([], 'vide')).toEqual([]);
  });
});

