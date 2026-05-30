import { fetchDividends } from "../server/dividends.js";

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600`);
  response.end(JSON.stringify(payload));
}

function isProviderAccessDenied(error) {
  return /\b(upstream 401|upstream 403)\b/.test(error.message);
}

function unavailablePayload(symbol, error) {
  return {
    symbol,
    source: "finnhub.io",
    fetchedAt: new Date().toISOString(),
    status: "unavailable",
    reason: "provider_access_denied",
    message: error.message,
    items: [],
  };
}

export default async function handler(request, response) {
  const symbol = String(request.query?.symbol ?? "").trim().toUpperCase();

  if (!symbol) {
    sendJson(response, 400, { error: "symbol query parameter is required" });
    return;
  }

  const cached = cache.get(symbol);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, {
      ...cached.value,
      cache: { status: "hit", ttlMs: TTL_MS, expiresAt: new Date(cached.expiresAt).toISOString() },
    });
    return;
  }

  try {
    const value = await fetchDividends(symbol, {
      finnhubApiKey: process.env.FINNHUB_API_KEY,
      alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY,
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
    });
    const expiresAt = now + TTL_MS;
    cache.set(symbol, { value, expiresAt });
    sendJson(response, 200, {
      ...value,
      cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(expiresAt).toISOString() },
    });
  } catch (error) {
    if (isProviderAccessDenied(error)) {
      const value = unavailablePayload(symbol, error);
      const expiresAt = now + TTL_MS;
      cache.set(symbol, { value, expiresAt });
      sendJson(response, 200, {
        ...value,
        cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(expiresAt).toISOString() },
      });
      return;
    }
    sendJson(response, 502, { error: error.message, source: "finnhub.io" });
  }
}
