import { describe, expect, it } from 'vitest';
import { getQuoteFreshness, mergeQuotesIntoAssets, normalizeQuote } from './liveQuotes';

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

  it('marks quotes with old market timestamps as stale', () => {
    const result = mergeQuotesIntoAssets([
      { symbol: 'MSFT', name: 'Microsoft', price: 100, change: 0, changePct: 0 },
    ], [
      {
        symbol: 'MSFT',
        price: 250,
        change: 1,
        changePct: 0.4,
        source: 'finnhub.io',
        fetchedAt: '2026-05-08T12:00:00.000Z',
        asOf: '2026-05-01T20:00:00.000Z',
      },
    ]);

    expect(result[0].price).toBe(250);
    expect(result[0].marketData.status).toBe('stale');
    expect(result[0].marketData.message).toContain('trop ancien');
  });
});

describe('getQuoteFreshness', () => {
  it('allows normal weekend market age but flags older timestamps', () => {
    expect(getQuoteFreshness(
      '2026-05-08T20:00:00.000Z',
      new Date('2026-05-09T16:00:00.000Z'),
    ).isStale).toBe(false);

    expect(getQuoteFreshness(
      '2026-05-01T20:00:00.000Z',
      new Date('2026-05-09T16:00:00.000Z'),
    ).isStale).toBe(true);
  });

  it("propage une variation absente en null plutôt qu'en 0 fabriqué", () => {
    // Le serveur masque désormais une variation indéterminable ; la normaliser
    // en 0 ici rétablirait l'affirmation « stable aujourd'hui » qu'on vient
    // d'écarter (factualité stricte : champ absent => masqué).
    const quote = normalizeQuote({ symbol: "AAA", price: 100, change: null, changePct: null });
    expect(quote.change).toBeNull();
    expect(quote.changePct).toBeNull();
  });

  it("n'invente pas de source quand la cote n'en porte pas", () => {
    const quote = normalizeQuote({ symbol: "AAA", price: 100 });
    expect(quote.source).toBeNull();
  });
});
