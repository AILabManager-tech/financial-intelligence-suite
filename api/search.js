function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  response.end(JSON.stringify(payload));
}

function normalizeResult(item) {
  return {
    symbol: item.symbol,
    description: item.description,
    type: item.type,
  };
}

export default async function handler(request, response) {
  const query = String(request.query?.q ?? "").trim();
  const token = process.env.FINNHUB_API_KEY;

  if (query.length < 2) {
    sendJson(response, 400, { error: "q query parameter must contain at least 2 characters" });
    return;
  }

  if (!token) {
    sendJson(response, 503, { error: "FINNHUB_API_KEY is required for symbol search", source: "finnhub.io" });
    return;
  }

  const url = new URL("https://finnhub.io/api/v1/search");
  url.searchParams.set("q", query);
  url.searchParams.set("token", token);

  const upstream = await fetch(url, { headers: { accept: "application/json" } });
  if (!upstream.ok) {
    sendJson(response, upstream.status, { error: `Finnhub search failed: ${upstream.status}`, source: "finnhub.io" });
    return;
  }

  const payload = await upstream.json();
  const results = Array.isArray(payload.result)
    ? payload.result
      .filter((item) => item.symbol && item.description)
      .map(normalizeResult)
      .slice(0, 12)
    : [];

  sendJson(response, 200, {
    source: "finnhub.io",
    fetchedAt: new Date().toISOString(),
    results,
  });
}

