const PORTFOLIO_ENDPOINT = "/api/portfolio";

export async function fetchPortfolioFromApi() {
  const response = await fetch(PORTFOLIO_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Portfolio API unavailable (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.assets) ? payload.assets : [];
}

export async function savePortfolioToApi(assets) {
  const response = await fetch(PORTFOLIO_ENDPOINT, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assets }),
  });

  if (!response.ok) {
    throw new Error(`Portfolio API save failed (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.assets) ? payload.assets : assets;
}

