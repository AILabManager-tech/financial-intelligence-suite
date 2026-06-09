import { describe, expect, it } from 'vitest';
import {
  buildPeersTable,
  formatDeltaVsBase,
  rankPeersByChange,
} from './peersFormatters';

const BASE_QUOTE = { symbol: 'AAPL', price: 200, change: 2, changePct: 1.0, source: 'finnhub.io' };

const PEER_QUOTES = [
  { symbol: 'MSFT', price: 380, change: -1.5, changePct: -0.4, source: 'finnhub.io' },
  { symbol: 'GOOGL', price: 145, change: 3, changePct: 2.1, source: 'finnhub.io' },
  { symbol: 'META', price: 510, change: 0, changePct: 0, source: 'finnhub.io' },
];

describe('buildPeersTable', () => {
  it('aligns peers in input order and attaches a delta vs base', () => {
    const rows = buildPeersTable(['MSFT', 'GOOGL', 'META'], PEER_QUOTES, BASE_QUOTE);
    expect(rows.map((r) => r.symbol)).toEqual(['MSFT', 'GOOGL', 'META']);
    expect(rows[0].deltaVsBasePct).toBeCloseTo(-1.4, 5);
    expect(rows[1].deltaVsBasePct).toBeCloseTo(1.1, 5);
    expect(rows[2].deltaVsBasePct).toBeCloseTo(-1.0, 5);
  });

  it('flags peers with no quote so the UI can render an explicit gap', () => {
    const rows = buildPeersTable(['MSFT', 'TSLA'], PEER_QUOTES, BASE_QUOTE);
    expect(rows[1]).toMatchObject({ symbol: 'TSLA', status: 'missing' });
    expect(rows[1].price).toBeNull();
    expect(rows[1].changePct).toBeNull();
  });

  it('treats a quote with a non-finite price as missing (never fabricates $0)', () => {
    const rows = buildPeersTable(
      ['MSFT', 'NOPX'],
      [...PEER_QUOTES, { symbol: 'NOPX', price: null, change: 1, changePct: 0.5, source: 'finnhub.io' }],
      BASE_QUOTE,
    );
    expect(rows[1]).toMatchObject({ symbol: 'NOPX', status: 'missing' });
    expect(rows[1].price).toBeNull();
  });

  it('returns an empty array when peers are empty', () => {
    expect(buildPeersTable([], PEER_QUOTES, BASE_QUOTE)).toEqual([]);
  });

  it('still renders rows even when no base quote is available (no delta)', () => {
    const rows = buildPeersTable(['MSFT'], PEER_QUOTES, null);
    expect(rows[0].deltaVsBasePct).toBeNull();
    expect(rows[0].price).toBe(380);
  });
});

describe('rankPeersByChange', () => {
  it('sorts by changePct desc by default, putting missing rows last', () => {
    const rows = buildPeersTable(['MSFT', 'GOOGL', 'TSLA', 'META'], PEER_QUOTES, BASE_QUOTE);
    const sorted = rankPeersByChange(rows);
    expect(sorted.map((r) => r.symbol)).toEqual(['GOOGL', 'META', 'MSFT', 'TSLA']);
  });

  it('respects an asc direction', () => {
    const rows = buildPeersTable(['MSFT', 'GOOGL', 'META'], PEER_QUOTES, BASE_QUOTE);
    const sorted = rankPeersByChange(rows, { direction: 'asc' });
    expect(sorted.map((r) => r.symbol)).toEqual(['MSFT', 'META', 'GOOGL']);
  });
});

describe('formatDeltaVsBase', () => {
  it('formats positive and negative deltas with sign and pp suffix', () => {
    expect(formatDeltaVsBase(2.5)).toBe('+2.50 pp');
    expect(formatDeltaVsBase(-1.0)).toBe('-1.00 pp');
    expect(formatDeltaVsBase(0)).toBe('0.00 pp');
  });

  it('returns null on missing or invalid values', () => {
    expect(formatDeltaVsBase(null)).toBeNull();
    expect(formatDeltaVsBase(undefined)).toBeNull();
    expect(formatDeltaVsBase('foo')).toBeNull();
    expect(formatDeltaVsBase(Number.NaN)).toBeNull();
  });
});
