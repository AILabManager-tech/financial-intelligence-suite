// Snapshots are mandate-scoped in dev SQLite (P3.2c). The 'default' mandate uses
// the bare endpoint (back-compat); others append ?portfolio=<id>.
function snapshotQuery(portfolioId) {
  return portfolioId && portfolioId !== "default"
    ? `&portfolio=${encodeURIComponent(portfolioId)}`
    : "";
}

export async function fetchPortfolioSnapshots(limit = 120, portfolioId = "default") {
  const response = await fetch(
    `/api/portfolio/snapshots?limit=${encodeURIComponent(limit)}${snapshotQuery(portfolioId)}`,
    { headers: { accept: "application/json" } },
  );

  if (!response.ok) {
    throw new Error(`Portfolio snapshots unavailable: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.snapshots) ? payload.snapshots : [];
}

export async function savePortfolioSnapshot(snapshot, portfolioId = "default") {
  const query = portfolioId && portfolioId !== "default"
    ? `?portfolio=${encodeURIComponent(portfolioId)}`
    : "";
  const response = await fetch(`/api/portfolio/snapshots${query}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ snapshot }),
  });

  if (!response.ok) {
    throw new Error(`Portfolio snapshot save failed: ${response.status}`);
  }

  const payload = await response.json();
  return payload.snapshot;
}
