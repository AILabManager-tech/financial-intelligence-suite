import { isValidPeriod } from "./priceHistoryPeriods";

export async function fetchPriceHistory(symbol, options = {}) {
  const params = new URLSearchParams({ symbol });

  if (typeof options === "number" || typeof options === "string") {
    params.set("days", String(options));
  } else {
    if (isValidPeriod(options.period)) {
      params.set("period", options.period);
    } else if (options.days != null) {
      params.set("days", String(options.days));
    }
  }

  const response = await fetch(`/api/history?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Historical data unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol,
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    period: payload.period ?? null,
    interval: payload.interval ?? null,
    timeUnit: payload.timeUnit ?? "daily",
    points: Array.isArray(payload.points) ? payload.points : [],
  };
}

