import { describe, expect, it } from 'vitest';
import {
  checkFinnhubHealth,
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

  it('summarizes provider status', () => {
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'ok' }])).toBe('ok');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'missing_config' }])).toBe('partial');
    expect(summarizeMarketDataHealth([{ status: 'ok' }, { status: 'down' }])).toBe('degraded');
  });
});
