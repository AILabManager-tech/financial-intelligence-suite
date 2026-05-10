function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

export function buildPeersTable(peers, quotes, baseQuote) {
  if (!Array.isArray(peers) || peers.length === 0) return [];
  const quoteMap = new Map();
  if (Array.isArray(quotes)) {
    for (const quote of quotes) {
      if (quote && typeof quote.symbol === 'string') {
        quoteMap.set(quote.symbol.trim().toUpperCase(), quote);
      }
    }
  }
  const baseChangePct = toFiniteNumber(baseQuote?.changePct);

  return peers.map((peer) => {
    const symbol = String(peer ?? '').trim().toUpperCase();
    const quote = quoteMap.get(symbol);
    if (!quote) {
      return {
        symbol,
        status: 'missing',
        price: null,
        change: null,
        changePct: null,
        deltaVsBasePct: null,
        source: null,
      };
    }
    const price = toFiniteNumber(quote.price);
    const change = toFiniteNumber(quote.change);
    const changePct = toFiniteNumber(quote.changePct);
    const deltaVsBasePct = baseChangePct !== null && changePct !== null ? changePct - baseChangePct : null;
    return {
      symbol,
      status: 'ready',
      price,
      change: change ?? 0,
      changePct: changePct ?? 0,
      deltaVsBasePct,
      source: quote.source ?? null,
    };
  });
}

export function rankPeersByChange(rows, { direction = 'desc' } = {}) {
  if (!Array.isArray(rows)) return [];
  const sign = direction === 'asc' ? 1 : -1;
  const ready = rows.filter((row) => row?.status === 'ready');
  const missing = rows.filter((row) => row?.status !== 'ready');
  ready.sort((a, b) => {
    const ax = a.changePct ?? 0;
    const bx = b.changePct ?? 0;
    return (ax - bx) * sign;
  });
  return [...ready, ...missing];
}

export function formatDeltaVsBase(value) {
  const num = toFiniteNumber(value);
  if (num === null) return null;
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  return `${sign}${Math.abs(num).toFixed(2)} pp`;
}
