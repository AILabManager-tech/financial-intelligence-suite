import { checkMarketDataHealth } from "../../server/marketDataHealth.js";

// Market-data health probe for production (/api/health/market-data). This route
// existed only in the dev middleware, so in prod the path 404'd and the panel was
// permanently dead. Mirror the dev behaviour (207 when degraded) with a short
// memo cache so repeated panel mounts don't re-probe all providers each time
// (documented health TTL = 60s).
const TTL_MS = 60 * 1000;
let cached = null;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=120`);
  response.end(JSON.stringify(payload));
}

function statusCodeFor(value) {
  return value.status === "degraded" ? 207 : 200;
}

export default async function handler(request, response) {
  if (request.method && request.method !== "GET") {
    sendJson(response, 405, { error: "method not allowed" });
    return;
  }

  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, statusCodeFor(cached.value), {
      ...cached.value,
      cache: { status: "hit", ttlMs: TTL_MS },
    });
    return;
  }

  try {
    const value = await checkMarketDataHealth({
      finnhubApiKey: process.env.FINNHUB_API_KEY,
      twelveDataApiKey: process.env.TWELVE_DATA_API_KEY,
    });
    cached = { value, expiresAt: now + TTL_MS };
    sendJson(response, statusCodeFor(value), {
      ...value,
      cache: { status: "miss", ttlMs: TTL_MS },
    });
  } catch (error) {
    sendJson(response, 503, {
      status: "down",
      checkedAt: new Date().toISOString(),
      error: error.message,
    });
  }
}
