import { toStooqSymbol } from "../../server/stooqSymbol.js";

const PRIMARY_SOURCE = "finnhub.io";
const FALLBACK_SOURCE = "stooq.com";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  response.end(JSON.stringify(payload));
}

function normalizeStooqQuote(symbol, payload) {
  const rawQuote = payload?.symbols?.[0];
  const close = Number(rawQuote?.close);
  const open = Number(rawQuote?.open);
  // Sans cours d'ouverture, la variation est INCONNUE. Renvoyer 0 affirmerait
  // « stable aujourd'hui » — un fait fabriqué (factualité stricte : masqué).
  const change = Number.isFinite(open) ? close - open : null;

  if (!Number.isFinite(close)) {
    throw new Error(`${symbol}: invalid stooq payload`);
  }

  return {
    symbol,
    name: rawQuote.name,
    price: close,
    change,
    changePct: Number.isFinite(open) && open > 0 ? (change / open) * 100 : null,
    volume: rawQuote.volume,
    source: FALLBACK_SOURCE,
    fetchedAt: new Date().toISOString(),
    asOf: `${rawQuote.date}T${rawQuote.time}`,
  };
}

async function fetchQuote(symbol) {
  const token = process.env.FINNHUB_API_KEY;

  try {
    if (!token) {
      throw new Error(`${symbol}: missing FINNHUB_API_KEY`);
    }

    const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(token)}`, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`${symbol}: ${response.status}`);
    }

    const payload = await response.json();
    const price = Number(payload.c);
    const previousClose = Number(payload.pc);
    const change = Number(payload.d);
    const changePct = Number(payload.dp);

    if (!Number.isFinite(price) || price <= 0) {
      throw new Error(`${symbol}: invalid finnhub payload`);
    }

    // Variation indéterminable (ni `d`/`dp`, ni clôture précédente exploitable)
    // ⇒ null, jamais 0 : « inconnu » et « stable » ne sont pas la même chose.
    const resolvedChange = Number.isFinite(change)
      ? change
      : Number.isFinite(previousClose)
        ? price - previousClose
        : null;

    return {
      symbol,
      price,
      change: resolvedChange,
      changePct: Number.isFinite(changePct)
        ? changePct
        : Number.isFinite(previousClose) && previousClose > 0
          ? ((price - previousClose) / previousClose) * 100
          : null,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      source: PRIMARY_SOURCE,
      fetchedAt: new Date().toISOString(),
      asOf: payload.t ? new Date(payload.t * 1000).toISOString() : undefined,
    };
  } catch {
    const stooqSymbol = toStooqSymbol(symbol);
    if (!stooqSymbol) {
      // Non-US listing: the free fallback can't quote it. Report honestly
      // instead of firing a fabricated ".us" request that always 404s.
      throw new Error(`${symbol}: non couvert par la source de données gratuite`);
    }
    const fallbackResponse = await fetch(`https://stooq.com/q/l/?s=${stooqSymbol}&f=sd2t2ohlcvn&h&e=json`, {
      headers: { accept: "application/json" },
    });
    if (!fallbackResponse.ok) {
      throw new Error(`${symbol}: ${fallbackResponse.status}`);
    }

    return normalizeStooqQuote(symbol, await fallbackResponse.json());
  }
}

export default async function handler(request, response) {
  const rawSymbols = request.query?.symbols ?? "";
  const symbols = String(rawSymbols)
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, 30);

  if (!symbols.length) {
    sendJson(response, 400, { error: "symbols query parameter is required" });
    return;
  }

  const settled = await Promise.allSettled(symbols.map(fetchQuote));
  const quotes = settled
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value);
  const errors = settled
    .filter((result) => result.status === "rejected")
    .map((result) => result.reason.message);

  // Always 200 when symbols were provided: the response is structured
  // (quotes + per-symbol errors). An uncovered symbol (e.g. a Canadian listing
  // the free data source does not quote) is a missing datum, not an endpoint
  // outage — the client renders it as "unavailable" rather than a global error.
  // Provenance : chaque cote porte déjà la sienne. Le champ d'enveloppe liste
  // les sources RÉELLEMENT utilisées — annoncer « finnhub.io » pour tout le lot
  // parce qu'une cote sur trente en venait mésattribuait les vingt-neuf autres.
  sendJson(response, 200, {
    sources: [...new Set(quotes.map((quote) => quote.source))],
    fetchedAt: new Date().toISOString(),
    quotes,
    errors,
    primaryConfigured: Boolean(process.env.FINNHUB_API_KEY),
  });
}
