const PRIMARY_SOURCE = "finnhub.io";
const FALLBACK_SOURCE = "stooq.com";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=120");
  response.end(JSON.stringify(payload));
}

function toStooqSymbol(symbol) {
  return `${symbol.replace(".", "-").toLowerCase()}.us`;
}

function normalizeStooqQuote(symbol, payload) {
  const rawQuote = payload?.symbols?.[0];
  const close = Number(rawQuote?.close);
  const open = Number(rawQuote?.open);
  const change = Number.isFinite(open) ? close - open : 0;

  if (!Number.isFinite(close)) {
    throw new Error(`${symbol}: invalid stooq payload`);
  }

  return {
    symbol,
    name: rawQuote.name,
    price: close,
    change,
    changePct: Number.isFinite(open) && open > 0 ? (change / open) * 100 : 0,
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

    return {
      symbol,
      price,
      change: Number.isFinite(change) ? change : price - previousClose,
      changePct: Number.isFinite(changePct) ? changePct : 0,
      previousClose: Number.isFinite(previousClose) ? previousClose : null,
      source: PRIMARY_SOURCE,
      fetchedAt: new Date().toISOString(),
      asOf: payload.t ? new Date(payload.t * 1000).toISOString() : undefined,
    };
  } catch {
    const fallbackResponse = await fetch(`https://stooq.com/q/l/?s=${toStooqSymbol(symbol)}&f=sd2t2ohlcvn&h&e=json`, {
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
  sendJson(response, 200, {
    source: quotes.some((quote) => quote.source === PRIMARY_SOURCE) ? PRIMARY_SOURCE : FALLBACK_SOURCE,
    fetchedAt: new Date().toISOString(),
    quotes,
    errors,
    primaryConfigured: Boolean(process.env.FINNHUB_API_KEY),
  });
}
