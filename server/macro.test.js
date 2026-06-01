import { describe, expect, it, vi } from 'vitest';
import { fetchMacroIndicators } from './macro.js';

function obs(series_id, value, date) {
  return { ok: true, status: 200, json: async () => ({ observations: [{ value: String(value), date }] }) };
}

describe('fetchMacroIndicators', () => {
  it('rejette sans clé FRED', async () => {
    await expect(fetchMacroIndicators({ fredApiKey: '', fetcher: vi.fn() })).rejects.toThrow(/FRED_API_KEY/);
  });

  it('récupère le dernier point de chaque série de taux', async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      const values = { FEDFUNDS: 5.33, DGS2: 4.7, DGS10: 4.2, T10Y2Y: -0.5 };
      return obs(id, values[id], '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.source).toBe('fred.stlouisfed.org');
    expect(result.indicators).toHaveLength(4);
    const fed = result.indicators.find((i) => i.id === 'FEDFUNDS');
    expect(fed.value).toBe(5.33);
    expect(fed.label).toBe('Taux directeur Fed');
  });

  it("ignore une valeur manquante FRED ('.') sans la fabriquer", async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      return id === 'DGS10' ? obs(id, '.', '2026-05-01') : obs(id, 4.0, '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.indicators.find((i) => i.id === 'DGS10')).toBeUndefined();
    expect(result.indicators).toHaveLength(3);
  });

  it('dégrade si une série échoue (Promise.allSettled)', async () => {
    const fetcher = vi.fn(async (url) => {
      const id = new URL(url).searchParams.get('series_id');
      if (id === 'T10Y2Y') return { ok: false, status: 500, json: async () => ({}) };
      return obs(id, 4.0, '2026-05-01');
    });
    const result = await fetchMacroIndicators({ fredApiKey: 'k', fetcher });
    expect(result.indicators).toHaveLength(3);
  });
});
