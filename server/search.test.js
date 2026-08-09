import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MIN_QUERY_LENGTH, searchSymbols } from './search.js';

const FIXED_NOW = new Date('2026-05-10T12:00:00.000Z');

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('searchSymbols', () => {
  it('interroge /search avec la requête et le jeton', async () => {
    const fetcher = vi.fn(async () => okJson({ result: [] }));
    await searchSymbols('apple', { finnhubApiKey: 'tok', fetcher });

    const url = String(fetcher.mock.calls[0][0]);
    expect(url).toContain('/search');
    expect(url).toContain('q=apple');
    expect(url).toContain('token=tok');
  });

  it('normalise chaque résultat aux seuls champs utilisés', async () => {
    const fetcher = vi.fn(async () => okJson({
      result: [{ symbol: 'AAPL', description: 'APPLE INC', type: 'Common Stock', extra: 'ignoré' }],
    }));

    const payload = await searchSymbols('apple', { finnhubApiKey: 'tok', fetcher });
    expect(payload.results).toEqual([
      { symbol: 'AAPL', description: 'APPLE INC', type: 'Common Stock' },
    ]);
    expect(payload.source).toBe('finnhub.io');
    expect(payload.fetchedAt).toBe(FIXED_NOW.toISOString());
  });

  it('écarte les entrées sans symbole ou sans description', async () => {
    const fetcher = vi.fn(async () => okJson({
      result: [
        { symbol: 'AAPL', description: 'APPLE INC' },
        { symbol: '', description: 'vide' },
        { symbol: 'MSFT' },
      ],
    }));

    const payload = await searchSymbols('a', { finnhubApiKey: 'tok', fetcher, minLength: 1 });
    expect(payload.results.map((r) => r.symbol)).toEqual(['AAPL']);
  });

  it('plafonne le nombre de résultats', async () => {
    const result = Array.from({ length: 40 }, (_, i) => ({ symbol: `S${i}`, description: `Titre ${i}` }));
    const fetcher = vi.fn(async () => okJson({ result }));

    const payload = await searchSymbols('titre', { finnhubApiKey: 'tok', fetcher });
    expect(payload.results).toHaveLength(12);
  });

  it('rend une liste vide quand la réponse amont n\'a pas de tableau', async () => {
    const fetcher = vi.fn(async () => okJson({}));
    const payload = await searchSymbols('rien', { finnhubApiKey: 'tok', fetcher });
    expect(payload.results).toEqual([]);
  });

  it('refuse une requête trop courte sans appeler la source', async () => {
    const fetcher = vi.fn();
    await expect(searchSymbols('a', { finnhubApiKey: 'tok', fetcher }))
      .rejects.toThrow(`q must contain at least ${MIN_QUERY_LENGTH} characters`);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('refuse une clé absente sans appeler la source', async () => {
    const fetcher = vi.fn();
    await expect(searchSymbols('apple', { fetcher })).rejects.toThrow('FINNHUB_API_KEY');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('remonte le statut amont en erreur', async () => {
    const fetcher = vi.fn(async () => ({ ok: false, status: 429, json: async () => ({}) }));
    await expect(searchSymbols('apple', { finnhubApiKey: 'tok', fetcher }))
      .rejects.toThrow('429');
  });

  it('ne laisse JAMAIS fuir le jeton, ni dans la sortie ni dans les erreurs', async () => {
    const okFetcher = vi.fn(async () => okJson({ result: [{ symbol: 'AAPL', description: 'APPLE INC' }] }));
    const payload = await searchSymbols('apple', { finnhubApiKey: 'secret-token', fetcher: okFetcher });
    expect(JSON.stringify(payload)).not.toContain('secret-token');

    const failing = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }));
    await expect(searchSymbols('apple', { finnhubApiKey: 'secret-token', fetcher: failing }))
      .rejects.toThrow(/^(?!.*secret-token).*$/);
  });
});
