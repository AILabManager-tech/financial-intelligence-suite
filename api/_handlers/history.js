const SOURCE = "twelvedata.com";

const PERIOD_MAP = {
  "1D": { interval: "1h", outputsize: 8, timeUnit: "intraday" },
  "5D": { interval: "30min", outputsize: 65, timeUnit: "intraday" },
  "1M": { interval: "1day", outputsize: 22, timeUnit: "daily" },
  "6M": { interval: "1day", outputsize: 130, timeUnit: "daily" },
  "1Y": { interval: "1day", outputsize: 260, timeUnit: "daily" },
  "5Y": { interval: "1week", outputsize: 260, timeUnit: "weekly" },
};

function ytdOutputsize(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const calendarDays = Math.max(1, Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
  return Math.max(1, Math.round((calendarDays * 5) / 7));
}

function resolveSeries(period, daysParam) {
  if (period === "YTD") {
    return { interval: "1day", outputsize: ytdOutputsize(), timeUnit: "daily" };
  }
  if (period && PERIOD_MAP[period]) {
    return PERIOD_MAP[period];
  }
  const days = Math.min(Math.max(Number(daysParam ?? 30), 5), 365);
  return { interval: "1day", outputsize: days, timeUnit: "daily" };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
  response.end(JSON.stringify(payload));
}

function normalizeTimeSeries(symbol, payload, timeUnit) {
  if (payload?.status === "error") {
    throw new Error(`${symbol}: ${payload.message ?? "Twelve Data error"}`);
  }

  if (!Array.isArray(payload?.values)) {
    throw new Error(`${symbol}: invalid Twelve Data payload`);
  }

  return payload.values
    .map((point) => {
      const datetime = String(point.datetime);
      return {
        datetime,
        date: timeUnit === "intraday" ? datetime : datetime.slice(0, 10),
        close: Number(point.close),
        open: Number(point.open),
        high: Number(point.high),
        low: Number(point.low),
        volume: Number(point.volume),
      };
    })
    .filter((point) => Number.isFinite(point.close))
    .reverse();
}

export default async function handler(request, response) {
  const symbol = String(request.query?.symbol ?? "").trim().toUpperCase();
  const period = String(request.query?.period ?? "").trim().toUpperCase();
  const series = resolveSeries(period || null, request.query?.days);
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
  url.searchParams.set("interval", series.interval);
  url.searchParams.set("outputsize", String(series.outputsize));
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
      period: period || null,
      interval: series.interval,
      timeUnit: series.timeUnit,
      points: normalizeTimeSeries(symbol, await upstream.json(), series.timeUnit),
    });
  } catch (error) {
    sendJson(response, 502, { error: error.message, source: SOURCE });
  }
}
