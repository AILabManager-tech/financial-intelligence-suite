export async function fetchMarketDataHealth() {
  const response = await fetch("/api/health/market-data", {
    headers: { accept: "application/json" },
  });

  if (!response.ok && response.status !== 207) {
    throw new Error(`Market data health unavailable: ${response.status}`);
  }

  return response.json();
}
