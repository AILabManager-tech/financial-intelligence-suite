import { fetchCompanyNews } from "../../server/companyNews.js";
import { extractMeetingTopics } from "../../server/meetingTopics.js";

// TTL aligné sur celui de company-news (30 min), délibérément : les sujets
// citent ces articles, donc les laisser vivre plus longtemps que leur source
// afficherait des citations plus vieilles que l'actualité qui les fonde.
// L'appel modèle coûte à chaque miss — d'où le cap de symboles et d'articles.
const TTL_MS = 30 * 60 * 1000;
const MAX_SYMBOLS = 10;
const NEWS_PER_SYMBOL = 6;
const cache = new Map();

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", `s-maxage=${Math.floor(TTL_MS / 1000)}, stale-while-revalidate=600`);
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const symbols = String(request.query?.symbols ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .slice(0, MAX_SYMBOLS);

  if (symbols.length === 0) {
    sendJson(response, 400, { error: "symbols query parameter is required" });
    return;
  }

  // Capability optionnelle : sans clé, la feature est absente — jamais fabriquée,
  // jamais une erreur (même idiome que le panel macro sans FRED_API_KEY).
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicApiKey) {
    sendJson(response, 200, {
      hasData: false,
      reason: "Sélection des sujets non configurée (ANTHROPIC_API_KEY absente).",
      topics: [],
      dropped: 0,
    });
    return;
  }

  const key = symbols.join(",");
  const cached = cache.get(key);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    sendJson(response, 200, { ...cached.value, cache: { status: "hit", ttlMs: TTL_MS } });
    return;
  }

  const settled = await Promise.allSettled(
    symbols.map((symbol) =>
      fetchCompanyNews(symbol, {
        finnhubApiKey: process.env.FINNHUB_API_KEY,
        limit: NEWS_PER_SYMBOL,
      }),
    ),
  );
  // Un symbole dont l'actualité échoue est simplement absent — pas d'invention.
  const news = settled.filter((r) => r.status === "fulfilled").map((r) => r.value);

  const value = await extractMeetingTopics({ news, anthropicApiKey });
  if (value.hasData) cache.set(key, { value, expiresAt: now + TTL_MS });
  sendJson(response, 200, { ...value, cache: { status: "miss", ttlMs: TTL_MS } });
}
