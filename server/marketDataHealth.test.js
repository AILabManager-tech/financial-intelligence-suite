import { describe, expect, it } from 'vitest';
import {
  checkFinnhubFundamentalsHealth,
  checkFinnhubHealth,
  checkMarketDataHealth,
  checkStooqHealth,
  checkTwelveDataHealth,
  summarizeMarketDataHealth,
} from './marketDataHealth';

function okJson(payload) {
  return {
    ok: true,
    json: async () => payload,
  };
}

describe('marketDataHealth', () => {
  it('marks missing keyed providers without exposing secrets', async () => {
    await expect(checkFinnhubHealth('')).resolves.toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'missing_config',
      configured: false,
    }));
  });

  it('checks finnhub quote payloads', async () => {
    const result = await checkFinnhubHealth('secret-token', async () => okJson({ c: 293.32 }));

    expect(result).toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'ok',
      configured: true,
      latencyMs: expect.any(Number),
    }));
    expect(JSON.stringify(result)).not.toContain('secret-token');
  });

  it('checks Twelve Data historical payloads', async () => {
    const result = await checkTwelveDataHealth('secret-token', async () => okJson({
      values: [{ datetime: '2026-05-08', close: '293.32' }],
    }));

    expect(result).toEqual(expect.objectContaining({
      provider: 'twelvedata.com',
      status: 'ok',
      capability: 'historical_prices',
    }));
  });

  it('checks Stooq fallback payloads', async () => {
    const result = await checkStooqHealth(async () => okJson({
      symbols: [{ close: '293.32' }],
    }));

    expect(result).toEqual(expect.objectContaining({
      provider: 'stooq.com',
      status: 'ok',
      capability: 'quote_fallback',
    }));
  });

  it('marks fundamentals as missing_config when no Finnhub token is configured', async () => {
    await expect(checkFinnhubFundamentalsHealth('')).resolves.toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'missing_config',
      capability: 'fundamentals',
      configured: false,
    }));
  });

  it('reports fundamentals as ok when /stock/metric returns a usable payload', async () => {
    const result = await checkFinnhubFundamentalsHealth('fundamentals-token', async (url) => {
      expect(String(url)).toContain('/stock/metric');
      expect(String(url)).toContain('symbol=AAPL');
      return okJson({ metric: { peTTM: 32.5, beta: 1.27 } });
    });

    expect(result).toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'ok',
      capability: 'fundamentals',
      configured: true,
      latencyMs: expect.any(Number),
    }));
    expect(JSON.stringify(result)).not.toContain('fundamentals-token');
  });

  it('reports fundamentals as down when /stock/metric returns an empty metric object', async () => {
    const result = await checkFinnhubFundamentalsHealth('fundamentals-token', async () => okJson({ metric: {} }));
    expect(result).toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'down',
      capability: 'fundamentals',
    }));
  });

  it('includes fundamentals provider in checkMarketDataHealth output', async () => {
    const calls = [];
    const okFetcher = async (url) => {
      calls.push(String(url));
      if (String(url).includes('/stock/metric')) return okJson({ metric: { peTTM: 32.5 } });
      if (String(url).includes('finnhub.io/api/v1/quote')) return okJson({ c: 293.32 });
      if (String(url).includes('twelvedata')) return okJson({ values: [{ datetime: '2026-05-08', close: '293' }] });
      if (String(url).includes('stooq')) return okJson({ symbols: [{ close: '293' }] });
      throw new Error(`unexpected ${url}`);
    };

    const result = await checkMarketDataHealth({
      finnhubApiKey: 'tok',
      twelveDataApiKey: 'tok',
      fetcher: okFetcher,
    });

    const fundamentals = result.providers.find((p) => p.capability === 'fundamentals');
    expect(fundamentals).toBeTruthy();
    expect(fundamentals.status).toBe('ok');
  });

  it('summarizes provider status', () => {
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'ok' }])).toBe('ok');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'missing_config' }])).toBe('partial');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'down' }])).toBe('degraded');
  });
});
