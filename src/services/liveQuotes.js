const QUOTE_ENDPOINT = "/api/quotes";
const staleQuoteThresholdMs = 4 * 24 * 60 * 60 * 1000;

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeQuote(rawQuote) {
  const symbol = rawQuote?.symbol ?? rawQuote?.Ticker;
  const price = toNumber(rawQuote?.price ?? rawQuote?.Price);
  const change = toNumber(rawQuote?.change ?? rawQuote?.ChangeAmount);
  const changePct = toNumber(rawQuote?.changePct ?? rawQuote?.ChangePercentage);

  if (!symbol || price === null) return null;

  return {
    symbol,
    name: rawQuote?.name ?? rawQuote?.Name,
    price,
    change: change ?? 0,
    changePct: changePct ?? 0,
    volume: toNumber(rawQuote?.volume ?? rawQuote?.Volume),
    previousClose: toNumber(rawQuote?.previousClose),
    source: rawQuote?.source ?? "stockprices.dev",
    fetchedAt: rawQuote?.fetchedAt ?? new Date().toISOString(),
    asOf: rawQuote?.asOf,
  };
}

export function getQuoteFreshness(asOf, now = new Date()) {
  if (!asOf) {
    return { isStale: false, ageHours: null };
  }

  const asOfTime = new Date(asOf).getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(asOfTime) || !Number.isFinite(nowTime)) {
    return { isStale: false, ageHours: null };
  }

  const ageMs = Math.max(0, nowTime - asOfTime);

  return {
    isStale: ageMs > staleQuoteThresholdMs,
    ageHours: Math.round(ageMs / 36_000) / 100,
  };
}

export function mergeQuotesIntoAssets(assets, quotes) {
  const quoteMap = new Map(
    quotes
      .map(normalizeQuote)
      .filter(Boolean)
      .map((quote) => [quote.symbol.toUpperCase(), quote])
  );

  return assets.map((asset) => {
    const quote = quoteMap.get(asset.symbol.toUpperCase());
    if (!quote) {
      return {
        ...asset,
        marketData: {
          status: "stale",
          source: "unavailable",
          fetchedAt: null,
          message: "Quote live indisponible; données statiques conservées.",
        },
      };
    }

    const freshness = getQuoteFreshness(quote.asOf);

    return {
      ...asset,
      name: quote.name || asset.name,
      price: quote.price,
      change: quote.change,
      changePct: quote.changePct,
      volume: quote.volume ?? asset.volume,
      marketData: {
        status: freshness.isStale ? "stale" : "live",
        source: quote.source,
        fetchedAt: quote.fetchedAt,
        asOf: quote.asOf,
        ageHours: freshness.ageHours,
        previousClose: quote.previousClose,
        message: freshness.isStale
          ? "Prix récupéré, mais horodatage de marché trop ancien."
          : "Prix récupéré depuis une source externe.",
      },
    };
  });
}

export async function fetchLiveQuotes(symbols) {
  const params = new URLSearchParams({ symbols: symbols.join(",") });
  const response = await fetch(`${QUOTE_ENDPOINT}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Quote API unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    quotes: Array.isArray(payload.quotes) ? payload.quotes : [],
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    source: payload.source ?? "stockprices.dev",
    fetchedAt: payload.fetchedAt ?? new Date().toISOString(),
    primaryConfigured: Boolean(payload.primaryConfigured),
    cacheStatus: payload.cache?.status,
    cacheExpiresAt: payload.cache?.expiresAt,
  };
}
