import { describe, expect, it } from 'vitest';
import {
  checkFinnhubCompanyNewsHealth,
  checkFinnhubFundamentalsHealth,
  checkFinnhubHealth,
  checkFxHealth,
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

  it('marks company news as missing_config when no Finnhub token is configured', async () => {
    await expect(checkFinnhubCompanyNewsHealth('')).resolves.toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'missing_config',
      capability: 'company_news',
      configured: false,
    }));
  });

  it('reports company news as ok when /company-news returns an array', async () => {
    const result = await checkFinnhubCompanyNewsHealth('news-token', async (url) => {
      expect(String(url)).toContain('/company-news');
      expect(String(url)).toContain('symbol=AAPL');
      return okJson([{ id: 1, datetime: 1746704400, headline: 'x', source: 'y', url: 'https://z' }]);
    });

    expect(result).toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'ok',
      capability: 'company_news',
      configured: true,
      latencyMs: expect.any(Number),
    }));
    expect(JSON.stringify(result)).not.toContain('news-token');
  });

  it('reports company news as down when /company-news returns a non-array payload', async () => {
    const result = await checkFinnhubCompanyNewsHealth('news-token', async () => okJson({ error: 'boom' }));
    expect(result).toEqual(expect.objectContaining({
      provider: 'finnhub.io',
      status: 'down',
      capability: 'company_news',
    }));
  });

  it('includes company_news provider in checkMarketDataHealth output', async () => {
    const okFetcher = async (url) => {
      const u = String(url);
      if (u.includes('/stock/metric')) return okJson({ metric: { peTTM: 32 } });
      if (u.includes('/company-news')) return okJson([{ id: 1, datetime: 1746704400, headline: 'h', source: 's', url: 'https://x' }]);
      if (u.includes('finnhub.io/api/v1/quote')) return okJson({ c: 293.32 });
      if (u.includes('twelvedata')) return okJson({ values: [{ datetime: '2026-05-08', close: '293' }] });
      if (u.includes('stooq')) return okJson({ symbols: [{ close: '293' }] });
      throw new Error(`unexpected ${url}`);
    };

    const result = await checkMarketDataHealth({
      finnhubApiKey: 'tok',
      twelveDataApiKey: 'tok',
      fetcher: okFetcher,
    });

    expect(result.providers.find((p) => p.capability === 'company_news')?.status).toBe('ok');
  });

  it('reports fx as ok when frankfurter returns a usable rate', async () => {
    const result = await checkFxHealth(async (url) => {
      expect(String(url)).toContain('frankfurter.app');
      return okJson({ amount: 1, base: 'USD', date: '2026-05-30', rates: { EUR: 0.92 } });
    });
    expect(result).toEqual(expect.objectContaining({
      provider: 'frankfurter.app',
      status: 'ok',
      capability: 'fx_rates',
      configured: true,
    }));
  });

  it('reports fx as down on invalid payload', async () => {
    const result = await checkFxHealth(async () => okJson({ rates: {} }));
    expect(result).toEqual(expect.objectContaining({ provider: 'frankfurter.app', status: 'down', capability: 'fx_rates' }));
  });

  it('includes fx provider in checkMarketDataHealth output', async () => {
    const okFetcher = async (url) => {
      const u = String(url);
      if (u.includes('frankfurter.app')) return okJson({ rates: { EUR: 0.92 } });
      if (u.includes('/stock/metric')) return okJson({ metric: { peTTM: 32 } });
      if (u.includes('/company-news')) return okJson([{ id: 1, datetime: 1, headline: 'h', source: 's', url: 'https://x' }]);
      if (u.includes('finnhub.io/api/v1/quote')) return okJson({ c: 293.32 });
      if (u.includes('twelvedata')) return okJson({ values: [{ datetime: '2026-05-08', close: '293' }] });
      if (u.includes('stooq')) return okJson({ symbols: [{ close: '293' }] });
      throw new Error(`unexpected ${url}`);
    };
    const result = await checkMarketDataHealth({ finnhubApiKey: 'tok', twelveDataApiKey: 'tok', fetcher: okFetcher });
    expect(result.providers.find((p) => p.capability === 'fx_rates')?.status).toBe('ok');
  });

  it('summarizes provider status', () => {
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'ok' }])).toBe('ok');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'missing_config' }])).toBe('partial');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'down' }])).toBe('degraded');
  });
});

describe('accord entre les deux sources de prix (B6)', () => {
  it('une divergence dégrade la santé globale sans qu\'aucune source soit en panne', () => {
    // Le risque que B6 visait : les deux fournisseurs répondent, mais ne
    // racontent plus la même chose. Sans ce cas, `degraded` n'était atteignable
    // que par une panne franche et la dérive serait passée inaperçue.
    expect(summarizeMarketDataHealth([
      { provider: 'finnhub.io', status: 'ok' },
      { provider: 'twelvedata.com', status: 'ok' },
      { provider: 'finnhub.io + twelvedata.com', status: 'degraded' },
    ])).toBe('degraded');
  });

  it('reste ok quand les sources concordent', () => {
    expect(summarizeMarketDataHealth([
      { provider: 'finnhub.io', status: 'ok' },
      { provider: 'finnhub.io + twelvedata.com', status: 'ok' },
    ])).toBe('ok');
  });
});
