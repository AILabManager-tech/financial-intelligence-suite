import { fetchPeers } from "../../server/peers.js";

const TTL_MS = 24 * 60 * 60 * 1000;
const cache = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600`);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const symbol = String(request.query?.symbol ?? "").trim().toUpperCase();
  const limit = Math.min(Math.max(Number(request.query?.limit ?? 10), 1), 25);

  if (!symbol) {
    sendJson(response, 400, { error: "symbol query parameter is required" });
    return;
  }

  const cacheKey = `${symbol}:${limit}`;
  const cached = cache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, {
      ...cached.value,
      cache: { status: "hit", ttlMs: TTL_MS, expiresAt: new Date(cached.expiresAt).toISOString() },
    });
    return;
  }

  try {
    const value = await fetchPeers(symbol, { finnhubApiKey: process.env.FINNHUB_API_KEY, limit });
    const expiresAt = now + TTL_MS;
    cache.set(cacheKey, { value, expiresAt });
    sendJson(response, 200, {
      ...value,
      cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(expiresAt).toISOString() },
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message, source: "finnhub.io" });
  }
}
