export async function searchSymbols(query) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`/api/search?${params.toString()}`);

  if (!response.ok) {
    throw new Error(`Symbol search unavailable (${response.status})`);
  }

  const payload = await response.json();
  return {
    source: payload.source,
    fetchedAt: payload.fetchedAt,
    results: Array.isArray(payload.results) ? payload.results : [],
  };
}

