// FX rates client (P3.4). Fetches the base-anchored rate map for a mandate's
// base currency; AbortSignal-aware like the other market services.
export async function fetchFxRates(base = "USD", { signal } = {}) {
  const cleanBase = String(base ?? "").trim().toUpperCase() || "USD";
  const params = new URLSearchParams({ base: cleanBase });
  const response = await fetch(`/api/fx?${params.toString()}`, {
    headers: { accept: "application/json" },
    signal,
  });
  if (!response.ok) {
    throw new Error(`FX rates unavailable (${response.status})`);
  }
  const payload = await response.json();
  return {
    base: payload.base ?? cleanBase,
    source: payload.source ?? null,
    asOf: payload.asOf ?? null,
    fetchedAt: payload.fetchedAt ?? null,
    rates: payload.rates && typeof payload.rates === "object" ? payload.rates : {},
    cache: payload.cache ?? null,
  };
}
