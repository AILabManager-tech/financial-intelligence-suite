export async function fetchPortfolioSnapshots(limit = 120) {
  const response = await fetch(`/api/portfolio/snapshots?limit=${encodeURIComponent(limit)}`, {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`Portfolio snapshots unavailable: ${response.status}`);
  }

  const payload = await response.json();
  return Array.isArray(payload.snapshots) ? payload.snapshots : [];
}

export async function savePortfolioSnapshot(snapshot) {
  const response = await fetch("/api/portfolio/snapshots", {
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
