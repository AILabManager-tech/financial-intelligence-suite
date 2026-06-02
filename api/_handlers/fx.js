import { fetchFxRates } from "../../server/fx.js";

const TTL_MS = 6 * 60 * 60 * 1000; // FX reference rates refresh ~daily; 6h is safe.
const cache = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600`);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const base = String(request.query?.base ?? "USD").trim().toUpperCase() || "USD";
  const now = Date.now();
  const cached = cache.get(base);
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, {
      ...cached.value,
      cache: { status: "hit", ttlMs: TTL_MS, expiresAt: new Date(cached.expiresAt).toISOString() },
    });
    return;
  }
  try {
    const value = await fetchFxRates(base, {
      exchangerateApiKey: process.env.EXCHANGERATE_HOST_API_KEY,
    });
    const expiresAt = now + TTL_MS;
    cache.set(base, { value, expiresAt });
    sendJson(response, 200, {
      ...value,
      cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(expiresAt).toISOString() },
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message, source: "frankfurter.app" });
  }
}
