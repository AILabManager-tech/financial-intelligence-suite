const QUOTE_ENDPOINT = "/api/quotes";
const MS_PER_DAY = 24 * 60 * 60 * 1000;
const staleQuoteThresholdMs = 4 * MS_PER_DAY;

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
    // `null` = variation inconnue (le serveur la masque quand elle l'est).
    // La ramener à 0 ici réintroduirait l'affirmation « stable aujourd'hui ».
    change,
    changePct,
    volume: toNumber(rawQuote?.volume ?? rawQuote?.Volume),
    previousClose: toNumber(rawQuote?.previousClose),
    source: rawQuote?.source ?? null,
    fetchedAt: rawQuote?.fetchedAt ?? new Date().toISOString(),
    asOf: rawQuote?.asOf,
    // Ce que la source permet d'affirmer : "instant" (horodatage réel) ou
    // "day" (date seule — stooq, dont le fuseau est inconnu).
    asOfPrecision: rawQuote?.asOfPrecision,
  };
}

// `precision` décrit ce que la SOURCE permet d'affirmer, pas ce qu'on aimerait
// afficher. Stooq ne documente pas son fuseau : seule la date est fiable
// (`"day"`), donc annoncer un âge en heures affirmerait une précision qu'on n'a
// pas. Finnhub donne un vrai instant (`"instant"`), l'âge en heures est légitime.
export function getQuoteFreshness(asOf, now = new Date(), precision = "instant") {
  const unknown = { isStale: false, ageHours: null, ageDays: null };
  if (!asOf) {
    return unknown;
  }

  const asOfTime = new Date(asOf).getTime();
  const nowTime = now.getTime();

  if (!Number.isFinite(asOfTime) || !Number.isFinite(nowTime)) {
    return unknown;
  }

  const ageMs = Math.max(0, nowTime - asOfTime);
  const byDay = precision === "day";

  return {
    isStale: ageMs > staleQuoteThresholdMs,
    ageHours: byDay ? null : Math.round(ageMs / 36_000) / 100,
    ageDays: byDay ? Math.floor(ageMs / MS_PER_DAY) : null,
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

    const freshness = getQuoteFreshness(quote.asOf, new Date(), quote.asOfPrecision);

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
        asOfPrecision: quote.asOfPrecision,
        ageHours: freshness.ageHours,
        ageDays: freshness.ageDays,
        previousClose: quote.previousClose,
        message: freshness.isStale
          ? "Prix récupéré, mais horodatage de marché trop ancien."
          : "Prix récupéré depuis une source externe.",
      },
    };
  });
}

export async function fetchLiveQuotes(symbols, { signal } = {}) {
  const params = new URLSearchParams({ symbols: symbols.join(",") });
  const response = await fetch(`${QUOTE_ENDPOINT}?${params.toString()}`, { signal });

  if (!response.ok) {
    throw new Error(`Quote API unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    quotes: Array.isArray(payload.quotes) ? payload.quotes : [],
    errors: Array.isArray(payload.errors) ? payload.errors : [],
    sources: Array.isArray(payload.sources) ? payload.sources : [],
    fetchedAt: payload.fetchedAt ?? new Date().toISOString(),
    primaryConfigured: Boolean(payload.primaryConfigured),
    cacheStatus: payload.cache?.status,
    cacheExpiresAt: payload.cache?.expiresAt,
  };
}
