import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { checkPriceSourceAgreement, comparePriceSources } from './priceSourceAgreement.js';

const FIXED_NOW = new Date('2026-05-12T14:00:00.000Z');

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

describe('comparePriceSources', () => {
  it('déclare un accord quand l\'écart tient dans la tolérance', () => {
    // Le cas mesuré dans l'audit : 313,33 contre 313,32999.
    const result = comparePriceSources({ primaryClose: 313.33, secondaryClose: 313.32999 });
    expect(result.status).toBe('aligned');
    expect(result.gapPct).toBeLessThan(0.001);
  });

  it('déclare une divergence au-delà de la tolérance', () => {
    const result = comparePriceSources({ primaryClose: 320, secondaryClose: 313.33 });
    expect(result.status).toBe('diverged');
    expect(result.gapPct).toBeCloseTo(2.129, 2);
    expect(result.gapAbs).toBeCloseTo(6.67, 2);
  });

  it('reste sur le fil de la tolérance sans basculer', () => {
    // 0.5 % exactement : la borne est inclusive, sinon un écart pile au seuil
    // serait signalé comme une divergence.
    const result = comparePriceSources({ primaryClose: 100.5, secondaryClose: 100 });
    expect(result.gapPct).toBeCloseTo(0.5, 10);
    expect(result.status).toBe('aligned');
  });

  it('ne compare RIEN quand une des deux valeurs manque', () => {
    // Sans les deux cours, il n'y a pas d'accord à constater. Renvoyer
    // « aligned » affirmerait une concordance jamais vérifiée.
    for (const input of [
      { primaryClose: null, secondaryClose: 100 },
      { primaryClose: 100, secondaryClose: undefined },
      { primaryClose: 100, secondaryClose: 0 },
    ]) {
      const result = comparePriceSources(input);
      expect(result.status).toBe('unknown');
      expect(result.gapPct).toBeNull();
      expect(result.reason).toBeTruthy();
    }
  });
});

describe('checkPriceSourceAgreement', () => {
  it('compare des CLÔTURES, pas un cours courant contre une clôture', async () => {
    // Comparer le prix live de finnhub à la dernière clôture quotidienne
    // produirait un écart en séance qui n'est pas une anomalie. La sonde
    // confronte donc `pc` (clôture précédente) à la dernière clôture complète.
    const fetcher = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('finnhub.io')) return okJson({ c: 318.4, pc: 313.33 });
      return okJson({ values: [{ datetime: '2026-05-11', close: '313.32999' }] });
    });

    const result = await checkPriceSourceAgreement({
      finnhubApiKey: 'tok',
      twelveDataApiKey: 'td',
      fetcher,
    });

    expect(result.capability).toBe('price_source_agreement');
    expect(result.status).toBe('ok');
    expect(result.comparison.status).toBe('aligned');
    expect(result.comparison.primaryClose).toBe(313.33);
  });

  it('passe en dégradé quand les deux sources divergent', async () => {
    const fetcher = vi.fn(async (url) => {
      const href = String(url);
      if (href.includes('finnhub.io')) return okJson({ c: 318.4, pc: 340 });
      return okJson({ values: [{ datetime: '2026-05-11', close: '313.33' }] });
    });

    const result = await checkPriceSourceAgreement({ finnhubApiKey: 'tok', twelveDataApiKey: 'td', fetcher });
    expect(result.status).toBe('degraded');
    expect(result.comparison.status).toBe('diverged');
  });

  it('signale une configuration absente sans appeler le réseau', async () => {
    const fetcher = vi.fn();
    const result = await checkPriceSourceAgreement({ fetcher });
    expect(result.status).toBe('missing_config');
    expect(result.capability).toBe('price_source_agreement');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('ne prétend pas à un accord quand une source est indisponible', async () => {
    const fetcher = vi.fn(async (url) => (String(url).includes('finnhub.io')
      ? okJson({ c: 318.4, pc: 313.33 })
      : { ok: false, status: 500, json: async () => ({}) }));

    const result = await checkPriceSourceAgreement({ finnhubApiKey: 'tok', twelveDataApiKey: 'td', fetcher });
    expect(result.status).toBe('down');
    expect(result.comparison?.status ?? 'unknown').toBe('unknown');
  });

  it('ne laisse pas fuir les jetons', async () => {
    const fetcher = vi.fn(async (url) => (String(url).includes('finnhub.io')
      ? okJson({ c: 1, pc: 1 })
      : okJson({ values: [{ datetime: '2026-05-11', close: '1' }] })));

    const result = await checkPriceSourceAgreement({
      finnhubApiKey: 'secret-token',
      twelveDataApiKey: 'secret-token',
      fetcher,
    });
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });
});
