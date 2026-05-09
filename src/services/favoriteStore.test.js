import { describe, expect, it } from 'vitest';
import { isFavoriteSymbol, normalizeFavoriteSymbols, toggleFavoriteSymbol } from './favoriteStore';

describe('favoriteStore', () => {
  it('normalizes favorite symbols', () => {
    expect(normalizeFavoriteSymbols([' nvda ', 'AAPL', 'nvda', '', null])).toEqual(['AAPL', 'NVDA']);
  });

  it('toggles favorite symbols', () => {
    const added = toggleFavoriteSymbol(['AAPL'], 'nvda');
    const removed = toggleFavoriteSymbol(added, 'AAPL');

    expect(added).toEqual(['AAPL', 'NVDA']);
    expect(removed).toEqual(['NVDA']);
    expect(isFavoriteSymbol(removed, 'nvda')).toBe(true);
    expect(isFavoriteSymbol(removed, 'aapl')).toBe(false);
  });
});
