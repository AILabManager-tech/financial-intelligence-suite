import { devBackendAvailable } from "./devBackend";

export async function fetchMarketDataHealth() {
  if (!devBackendAvailable) {
    // prod: the health probe is a dev-only endpoint; the panel handles this as
    // an "indisponible" state (no fetch -> no 404 in the console).
    throw new Error("Market data health is available in dev only");
  }
  const response = await fetch("/api/health/market-data", {
    headers: { accept: "application/json" },
  });

  if (!response.ok && response.status !== 207) {
    throw new Error(`Market data health unavailable: ${response.status}`);
  }

  return response.json();
}
