import { describe, expect, it } from 'vitest';
import { normalizeStooqQuote, STOOQ_SOURCE } from './stooqQuote.js';

function payload(overrides = {}) {
  return {
    symbols: [{
      symbol: 'AAPL.US',
      name: 'APPLE',
      date: '2026-08-08',
      time: '21:45:00',
      open: 310,
      close: 313.33,
      volume: 1000,
      ...overrides,
    }],
  };
}

describe('normalizeStooqQuote', () => {
  it('normalise prix, variation et provenance', () => {
    const quote = normalizeStooqQuote('AAPL', payload());
    expect(quote.symbol).toBe('AAPL');
    expect(quote.price).toBe(313.33);
    expect(quote.change).toBeCloseTo(3.33, 5);
    expect(quote.source).toBe(STOOQ_SOURCE);
  });

  it("masque la variation quand le cours d'ouverture manque", () => {
    const quote = normalizeStooqQuote('AAPL', payload({ open: undefined }));
    expect(quote.change).toBeNull();
    expect(quote.changePct).toBeNull();
  });

  it('rejette un payload sans cours de clôture', () => {
    expect(() => normalizeStooqQuote('AAPL', payload({ close: 'n/a' }))).toThrow('invalid stooq payload');
  });

  // --- B11 : l'horodatage ---

  it("produit un instant NON AMBIGU (le fuseau de stooq est inconnu)", () => {
    // `2026-08-08T21:45:00` sans décalage est lu comme une heure LOCALE par
    // ECMAScript : le même payload donnait un instant différent selon le
    // navigateur, ce qui déplaçait l'étiquette « prix périmé ».
    const quote = normalizeStooqQuote('AAPL', payload());
    expect(quote.asOf).toMatch(/(Z|[+-]\d{2}:\d{2})$/);
    expect(Number.isFinite(new Date(quote.asOf).getTime())).toBe(true);
  });

  it("n'invente pas de fuseau : la précision retenue est le JOUR", () => {
    // On ne connaît pas le fuseau de stooq. Plutôt que d'en fabriquer un —
    // ce serait de la provenance inventée — on ne retient que la date, qui
    // est fiable, et on l'étiquette. Minuit UTC place l'instant AVANT l'heure
    // réelle : la cote paraît plus vieille, jamais plus fraîche qu'on ne sait.
    const quote = normalizeStooqQuote('AAPL', payload());
    expect(quote.asOf).toBe('2026-08-08T00:00:00.000Z');
    expect(quote.asOfPrecision).toBe('day');
  });

  it('se lit identiquement quel que soit le fuseau du lecteur', () => {
    const quote = normalizeStooqQuote('AAPL', payload());
    const asRead = new Date(quote.asOf).getTime();
    expect(asRead).toBe(Date.UTC(2026, 7, 8));
  });

  it('masque asOf quand la date est absente plutôt que de la fabriquer', () => {
    const quote = normalizeStooqQuote('AAPL', payload({ date: undefined }));
    expect(quote.asOf).toBeUndefined();
    expect(quote.asOfPrecision).toBeUndefined();
  });
});
