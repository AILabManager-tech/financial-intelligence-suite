const SOURCE = "twelvedata.com";

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  response.end(JSON.stringify(payload));
}

function normalizeTimeSeries(symbol, payload) {
  if (payload?.status === "error") {
    throw new Error(`${symbol}: ${payload.message ?? "Twelve Data error"}`);
  }

  if (!Array.isArray(payload?.values)) {
    throw new Error(`${symbol}: invalid Twelve Data payload`);
  }

  return payload.values
    .map((point) => ({
      date: String(point.datetime).slice(0, 10),
      close: Number(point.close),
      open: Number(point.open),
      high: Number(point.high),
      low: Number(point.low),
      volume: Number(point.volume),
    }))
    .filter((point) => Number.isFinite(point.close))
    .reverse();
}

export default async function handler(request, response) {
  const symbol = String(request.query?.symbol ?? "").trim().toUpperCase();
  const days = Math.min(Math.max(Number(request.query?.days ?? 30), 5), 365);
  const token = process.env.TWELVE_DATA_API_KEY;

  if (!symbol) {
    sendJson(response, 400, { error: "symbol query parameter is required" });
    return;
  }

  if (!token) {
    sendJson(response, 503, { error: "TWELVE_DATA_API_KEY is required for factual historical data", source: SOURCE });
    return;
  }

  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", "1day");
  url.searchParams.set("outputsize", String(days));
  url.searchParams.set("order", "desc");
  url.searchParams.set("apikey", token);
  const upstream = await fetch(url, { headers: { accept: "application/json" } });

  if (!upstream.ok) {
    sendJson(response, upstream.status, { error: `${symbol}: ${upstream.status}`, source: SOURCE });
    return;
  }

  try {
    sendJson(response, 200, {
      symbol,
      source: SOURCE,
      fetchedAt: new Date().toISOString(),
      points: normalizeTimeSeries(symbol, await upstream.json()),
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message, source: SOURCE });
  }
}
