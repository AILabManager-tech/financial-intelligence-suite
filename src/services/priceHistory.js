export async function fetchPriceHistory(symbol, days = 30) {
  const params = new URLSearchParams({ symbol, days: String(days) });
  const response = await fetch(`/api/history?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Historical data unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    symbol: payload.symbol,
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    points: Array.isArray(payload.points) ? payload.points : [],
  };
}

