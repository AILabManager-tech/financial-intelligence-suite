import { describe, expect, it } from 'vitest';
import {
  isWatchlisted,
  normalizeWatchlistAsset,
  removeWatchlistAsset,
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
});
