import { fetchMacroIndicators } from "../../server/macro.js";

const TTL_MS = 6 * 60 * 60 * 1000;
let cached = null;

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600`);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, { ...cached.value, cache: { status: "hit", ttlMs: TTL_MS, expiresAt: new Date(cached.expiresAt).toISOString() } });
    return;
  }
  try {
    const value = await fetchMacroIndicators({ fredApiKey: process.env.FRED_API_KEY });
    cached = { value, expiresAt: now + TTL_MS };
    sendJson(response, 200, { ...value, cache: { status: "miss", ttlMs: TTL_MS, expiresAt: new Date(now + TTL_MS).toISOString() } });
  } catch (error) {
    // FRED unavailable (no key, upstream down): degrade to a structured empty
    // payload (200) so the UI shows an honest "indisponible" state instead of a
    // console 502. Never fabricate values.
    sendJson(response, 200, {
      source: "fred.stlouisfed.org",
      fetchedAt: new Date().toISOString(),
      indicators: [],
      unavailable: true,
      note: error.message,
    });
  }
}
