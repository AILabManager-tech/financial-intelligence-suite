import { describe, expect, it } from 'vitest';
import { buildPortfolioCsv, buildPortfolioExportRows } from './portfolioExport';

const assets = [
  {
    symbol: 'AAPL',
    name: 'Apple, Inc.',
    sector: 'Technology',
    price: 293.32,
    position: { quantity: 2, averageCost: 250, targetWeight: 40 },
    marketData: { source: 'finnhub.io', asOf: '2026-05-08T20:00:00.000Z' },
  },
];

describe('portfolioExport', () => {
  it('builds normalized export rows with position metrics', () => {
    expect(buildPortfolioExportRows(assets)).toEqual([
      expect.objectContaining({
        symbol: 'AAPL',
        marketValue: 586.64,
        costValue: 500,
        unrealizedPnl: 86.63999999999999,
        source: 'finnhub.io',
      }),
    ]);
  });

  it('escapes csv cells', () => {
    const csv = buildPortfolioCsv(assets);

    expect(csv).toContain('symbol,name,sector');
    expect(csv).toContain('"Apple, Inc."');
    expect(csv).toContain('"finnhub.io"');
  });
});
