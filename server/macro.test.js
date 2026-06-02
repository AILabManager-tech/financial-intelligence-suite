import { describe, expect, it, vi } from 'vitest';
import { fetchMacroIndicators } from './macro.js';

function obs(series_id, value, date) {
  return { ok: true, status: 200, json: async () => ({ observations: [{ value: String(value), date }] }) };
}

describe('fetchMacroIndicators', () => {
  it('rejette sans clé FRED', async () => {
    await expect(fetchMacroIndicators({ fredApiKey: '', fetcher: vi.fn() })).rejects.toThrow(/FRED_API_KEY/);
  });

  it('récupère le dernier point de chaque série', async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      const values = { FEDFUNDS: 5.33, DGS2: 4.7, DGS10: 4.2, T10Y2Y: -0.5, CPIAUCSL: 2.9, IRSTCB01CAM156N: 4.25 };
      return obs(id, values[id], '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.source).toBe('fred.stlouisfed.org');
    expect(result.indicators).toHaveLength(6);
    const fed = result.indicators.find((i) => i.id === 'FEDFUNDS');
    expect(fed.value).toBe(5.33);
    expect(fed.label).toBe('Taux directeur Fed');
    const boc = result.indicators.find((i) => i.id === 'IRSTCB01CAM156N');
    expect(boc.label).toBe('Taux directeur Banque du Canada');
  });

  it("demande la transformation FRED 'pc1' pour l'inflation (calculée par FRED, pas maison)", async () => {
    const seen = {};
    const fetcher = vi.fn(async (url) => {
      const u = new URL(url);
      const id = u.searchParams.get('series_id');
      seen[id] = u.searchParams.get('units');
      return obs(id, 2.9, '2026-05-01');
    });
    await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(seen.CPIAUCSL).toBe('pc1'); // variation sur 1 an
    expect(seen.FEDFUNDS).toBeNull(); // série de taux : point brut, aucune transformation
  });

  it("ignore une valeur manquante FRED ('.') sans la fabriquer", async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      return id === 'DGS10' ? obs(id, '.', '2026-05-01') : obs(id, 4.0, '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.indicators.find((i) => i.id === 'DGS10')).toBeUndefined();
    expect(result.indicators).toHaveLength(5);
  });

  it('dégrade si une série échoue (Promise.allSettled)', async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      if (id === 'T10Y2Y') return { ok: false, status: 500, json: async () => ({}) };
      return obs(id, 4.0, '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.indicators).toHaveLength(5);
  });
});
