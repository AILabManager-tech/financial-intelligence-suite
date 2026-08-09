import { MIN_QUERY_LENGTH, searchSymbols } from "../../server/search.js";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  response.end(JSON.stringify(payload));
}

export default async function handler(request, response) {
  const query = String(request.query?.q ?? "").trim();

  if (query.length < MIN_QUERY_LENGTH) {
    sendJson(response, 400, { error: `q query parameter must contain at least ${MIN_QUERY_LENGTH} characters` });
    return;
  }

  const token = process.env.FINNHUB_API_KEY;
  if (!token) {
    sendJson(response, 503, { error: "FINNHUB_API_KEY is required for symbol search", source: "finnhub.io" });
    return;
  }

  try {
    sendJson(response, 200, await searchSymbols(query, { finnhubApiKey: token }));
  } catch (error) {
    // La normalisation ne laisse pas fuir le jeton dans ses messages (testé
    // dans server/search.test.js) ; on peut donc les propager tels quels.
    const status = Number(String(error.message).match(/\b(\d{3})\b/)?.[1]) || 502;
    sendJson(response, status, { error: error.message, source: "finnhub.io" });
  }
}
