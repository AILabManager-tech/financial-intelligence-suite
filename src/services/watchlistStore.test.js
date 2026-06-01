import { afterEach, describe, expect, it } from 'vitest';
import {
  isWatchlisted,
  loadWatchlistAssets,
  normalizeWatchlistAsset,
  removeWatchlistAsset,
  saveWatchlistAssets,
  upsertWatchlistAsset,
} from './watchlistStore';

describe('watchlistStore', () => {
  it('normalizes watchlist assets', () => {
    expect(normalizeWatchlistAsset({
      symbol: 'nvda',
      name: 'NVIDIA Corporation',
      price: '293.32',
      change: '5.88',
      changePct: '2.04',
    })).toEqual(expect.objectContaining({
      symbol: 'NVDA',
      price: 293.32,
      change: 5.88,
      changePct: 2.04,
    }));
  });

  it('upserts and removes watchlist assets', () => {
    const inserted = upsertWatchlistAsset([], { symbol: 'AAPL', name: 'Apple' });
    const updated = upsertWatchlistAsset(inserted, { symbol: 'AAPL', name: 'Apple Inc.' });

    expect(updated).toHaveLength(1);
    expect(updated[0].name).toBe('Apple Inc.');
    expect(isWatchlisted(updated, 'aapl')).toBe(true);
    expect(removeWatchlistAsset(updated, 'AAPL')).toEqual([]);
  });

  describe('namespacing by thematic list (P5.4)', () => {
    afterEach(() => {
      localStorage.clear();
    });

    it('isolates assets per list id and keeps the default list on the legacy key', () => {
      saveWatchlistAssets([{ symbol: 'AAPL', name: 'Apple' }], 'default');
      saveWatchlistAssets([{ symbol: 'SHOP', name: 'Shopify' }], 'tech');

      expect(loadWatchlistAssets([], 'default').map((a) => a.symbol)).toEqual(['AAPL']);
      expect(loadWatchlistAssets([], 'tech').map((a) => a.symbol)).toEqual(['SHOP']);
      // Default list reuses the legacy flat key (transparent migration).
      expect(localStorage.getItem('financial-intelligence-suite.watchlist.v1')).toContain('AAPL');
      expect(localStorage.getItem('financial-intelligence-suite.watchlist.v1::tech')).toContain('SHOP');
    });

    it('reads a pre-P5.4 flat watchlist as the default list', () => {
      localStorage.setItem(
        'financial-intelligence-suite.watchlist.v1',
        JSON.stringify([{ symbol: 'NVDA', name: 'NVIDIA' }]),
      );
      expect(loadWatchlistAssets([], 'default').map((a) => a.symbol)).toEqual(['NVDA']);
    });
  });
});
