export async function fetchMarketDataHealth() {
  // Single-segment path: the prod catch-all (api/[...path].js) only resolves one
  // segment after /api on this Vercel project, so /api/health/market-data 404s
  // while /api/health works. Served in both dev (vite middleware) and prod
  // (router → api/_handlers/health.js). 207 = degraded is a valid body.
  const response = await fetch("/api/health", {
    headers: { accept: "application/json" },
  });

  if (!response.ok && response.status !== 207) {
    throw new Error(`Market data health unavailable: ${response.status}`);
  }

  return response.json();
}
