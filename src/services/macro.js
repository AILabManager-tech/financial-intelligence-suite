export async function fetchMacroIndicators({ signal } = {}) {
  const response = await fetch(`/api/macro`, { headers: { accept: "application/json" }, signal });
  if (!response.ok) {
    throw new Error(`Macro indicators unavailable (${response.status})`);
  }
  const payload = await response.json();
  return {
    source: payload.source ?? "fred.stlouisfed.org",
    fetchedAt: payload.fetchedAt ?? null,
    indicators: Array.isArray(payload.indicators) ? payload.indicators : [],
    cache: payload.cache ?? null,
  };
}
