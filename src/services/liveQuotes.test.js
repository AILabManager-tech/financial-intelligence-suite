import { describe, expect, it } from 'vitest';
import { mergeQuotesIntoAssets, normalizeQuote } from './liveQuotes';

describe('normalizeQuote', () => {
  it('normalizes stockprices.dev quote payloads', () => {
    expect(normalizeQuote({
      Ticker: 'NVDA',
      Name: 'NVIDIA Corporation',
      Price: 214.98,
      ChangeAmount: 3.48,
      ChangePercentage: 1.65,
    })).toMatchObject({
      symbol: 'NVDA',
      name: 'NVIDIA Corporation',
      price: 214.98,
      change: 3.48,
      changePct: 1.65,
    });
  });

  it('rejects quotes without usable price', () => {
    expect(normalizeQuote({ Ticker: 'NVDA' })).toBeNull();
  });
});

describe('mergeQuotesIntoAssets', () => {
  it('updates prices and marks missing quotes as stale', () => {
    const result = mergeQuotesIntoAssets([
      { symbol: 'NVDA', name: 'Old NVIDIA', price: 100, change: 0, changePct: 0 },
      { symbol: 'AAPL', name: 'Apple Inc.', price: 200, change: 0, changePct: 0 },
    ], [
      { Ticker: 'NVDA', Name: 'NVIDIA Corporation', Price: 214.98, ChangeAmount: 3.48, ChangePercentage: 1.65 },
    ]);

    expect(result[0].price).toBe(214.98);
    expect(result[0].marketData.status).toBe('live');
    expect(result[1].price).toBe(200);
    expect(result[1].marketData.status).toBe('stale');
  });
});

