export async function fetchMarketDataHealth() {
  // Served in both dev (vite middleware) and prod (api/_handlers/health.js via
  // the catch-all router). 207 = degraded (some provider down) is a valid body.
  const response = await fetch("/api/health/market-data", {
    headers: { accept: "application/json" },
  });

  if (!response.ok && response.status !== 207) {
    throw new Error(`Market data health unavailable: ${response.status}`);
  }

  return response.json();
}
