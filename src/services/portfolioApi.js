const PORTFOLIO_ENDPOINT = "/api/portfolio";
const PORTFOLIOS_ENDPOINT = "/api/portfolios";

// Dev SQLite is mandate-scoped (P3.2c). The 'default' mandate keeps the bare
// endpoint (back-compat); others append ?portfolio=<id>.
function scoped(url, portfolioId) {
  if (!portfolioId || portfolioId === "default") return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}portfolio=${encodeURIComponent(portfolioId)}`;
}

export async function fetchPortfolioFromApi(portfolioId = "default") {
  const response = await fetch(scoped(PORTFOLIO_ENDPOINT, portfolioId));
  if (!response.ok) {
    throw new Error(`Portfolio API unavailable (${response.status})`);
  }

  const payload = await response.json();
  return Array.isArray(payload.assets) ? payload.assets : [];
}

export async function savePortfolioToApi(assets, portfolioId = "default") {
  const response = await fetch(scoped(PORTFOLIO_ENDPOINT, portfolioId), {
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

// --- Mandate metadata (dev SQLite parity, P3.2c) ---------------------------
export async function fetchPortfoliosFromApi() {
  const response = await fetch(PORTFOLIOS_ENDPOINT);
  if (!response.ok) {
    throw new Error(`Portfolios API unavailable (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload.portfolios) ? payload.portfolios : [];
}

export async function savePortfolioMandateToApi(mandate) {
  const response = await fetch(PORTFOLIOS_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mandate),
  });
  if (!response.ok) {
    throw new Error(`Mandate save failed (${response.status})`);
  }
  return (await response.json()).portfolio;
}

export async function deletePortfolioMandateFromApi(id) {
  const response = await fetch(`${PORTFOLIOS_ENDPOINT}?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!response.ok) {
    throw new Error(`Mandate delete failed (${response.status})`);
  }
  return (await response.json()).removed;
}
