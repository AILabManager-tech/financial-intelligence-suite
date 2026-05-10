import { describe, expect, it } from 'vitest';
import {
  KNOWN_SUFFIXES,
  parseSymbolExchange,
  uniqueCountriesFromResults,
} from './symbolExchange';

describe('parseSymbolExchange', () => {
  it('returns US default when no suffix is present', () => {
    expect(parseSymbolExchange('AAPL')).toEqual({
      base: 'AAPL',
      suffix: '',
      exchange: 'NASDAQ/NYSE',
      country: 'US',
      countryLabel: 'États-Unis',
    });
  });

  it('parses common European suffixes', () => {
    expect(parseSymbolExchange('AIR.PA')).toMatchObject({ country: 'FR', exchange: 'Euronext Paris' });
    expect(parseSymbolExchange('VOD.L')).toMatchObject({ country: 'UK', exchange: 'LSE' });
    expect(parseSymbolExchange('SAP.DE')).toMatchObject({ country: 'DE', exchange: 'XETRA' });
    expect(parseSymbolExchange('ENI.MI')).toMatchObject({ country: 'IT', exchange: 'Borsa Italiana' });
  });

  it('parses Asian and Pacific suffixes', () => {
    expect(parseSymbolExchange('7203.T')).toMatchObject({ country: 'JP', exchange: 'Tokyo' });
    expect(parseSymbolExchange('0700.HK')).toMatchObject({ country: 'HK', exchange: 'Hong Kong' });
    expect(parseSymbolExchange('BHP.AX')).toMatchObject({ country: 'AU', exchange: 'ASX' });
  });

  it('parses Canadian suffixes', () => {
    expect(parseSymbolExchange('SHOP.TO')).toMatchObject({ country: 'CA', exchange: 'TSX' });
    expect(parseSymbolExchange('XYZ.V')).toMatchObject({ country: 'CA', exchange: 'TSX-V' });
  });

  it('keeps unknown suffix as raw and marks exchange null', () => {
    expect(parseSymbolExchange('XYZ.UNKNOWN')).toEqual({
      base: 'XYZ',
      suffix: '.UNKNOWN',
      exchange: null,
      country: null,
      countryLabel: 'Marché inconnu',
    });
  });

  it('handles empty/null inputs without throwing', () => {
    expect(parseSymbolExchange('')).toEqual({
      base: '',
      suffix: '',
      exchange: null,
      country: null,
      countryLabel: 'Marché inconnu',
    });
    expect(parseSymbolExchange(null)).toMatchObject({ country: null });
  });

  it('uppercases the symbol', () => {
    expect(parseSymbolExchange('aapl')).toMatchObject({ base: 'AAPL', country: 'US' });
    expect(parseSymbolExchange('air.pa')).toMatchObject({ base: 'AIR', country: 'FR' });
  });

  it('exposes all known suffixes in KNOWN_SUFFIXES for UI lookups', () => {
    expect(KNOWN_SUFFIXES.length).toBeGreaterThanOrEqual(20);
    KNOWN_SUFFIXES.forEach((entry) => {
      expect(entry.suffix.startsWith('.')).toBe(true);
      expect(entry.country).toMatch(/^[A-Z]{2}$/);
    });
  });
});

describe('uniqueCountriesFromResults', () => {
  it('returns unique country codes sorted by frequency desc, then alpha', () => {
    const results = [
      { country: 'US' },
      { country: 'FR' },
      { country: 'US' },
      { country: 'IT' },
      { country: 'FR' },
      { country: 'US' },
    ];

    expect(uniqueCountriesFromResults(results)).toEqual(['US', 'FR', 'IT']);
  });

  it('ignores null countries', () => {
    expect(uniqueCountriesFromResults([{ country: 'US' }, { country: null }, { country: 'FR' }]))
      .toEqual(['FR', 'US']);
  });
});
