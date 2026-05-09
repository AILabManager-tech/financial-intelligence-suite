import { describe, expect, it } from 'vitest';
import { validatePortfolioAssets, validatePortfolioSnapshot } from './portfolioValidation';

describe('portfolioValidation', () => {
  it('normalizes valid portfolio assets', () => {
    expect(validatePortfolioAssets([
      {
        symbol: 'nvda',
        name: 'NVIDIA Corporation',
        sector: 'Technology',
        position: { quantity: '2', averageCost: '180.5', targetWeight: '25' },
      },
    ])).toEqual([
      expect.objectContaining({
        symbol: 'NVDA',
        position: { quantity: 2, averageCost: 180.5, targetWeight: 25 },
      }),
    ]);
  });

  it('rejects duplicated or invalid symbols', () => {
    expect(() => validatePortfolioAssets([{ symbol: 'AAPL' }, { symbol: 'aapl' }]))
      .toThrow('duplicated');
    expect(() => validatePortfolioAssets([{ symbol: '../../../secret' }]))
      .toThrow('symbol is invalid');
  });

  it('rejects invalid position numbers', () => {
    expect(() => validatePortfolioAssets([
      { symbol: 'MSFT', position: { quantity: -1, averageCost: 10, targetWeight: 10 } },
    ])).toThrow('quantity');

    expect(() => validatePortfolioAssets([
      { symbol: 'MSFT', position: { quantity: 1, averageCost: 10, targetWeight: 120 } },
    ])).toThrow('targetWeight');
  });

  it('normalizes valid snapshots', () => {
    expect(validatePortfolioSnapshot({
      capturedAt: '2026-05-08T12:00:00.000Z',
      totalMarketValue: '1200.25',
      totalCost: '1000',
      unrealizedPnl: '200.25',
      unrealizedPnlPct: '20.025',
      positionsCount: '3.2',
      liveQuotesCount: '3',
    })).toEqual({
      capturedAt: '2026-05-08T12:00:00.000Z',
      totalMarketValue: 1200.25,
      totalCost: 1000,
      unrealizedPnl: 200.25,
      unrealizedPnlPct: 20.025,
      positionsCount: 3,
      liveQuotesCount: 3,
    });
  });

  it('rejects invalid snapshots', () => {
    expect(() => validatePortfolioSnapshot({ capturedAt: 'bad-date' })).toThrow('valid date');
    expect(() => validatePortfolioSnapshot({ totalMarketValue: -1 })).toThrow('totalMarketValue');
  });
});
