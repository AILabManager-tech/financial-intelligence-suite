// Recherche de titres (B5). Couche de domaine pure, fetcher injectable.
//
// C'était la SEULE feature du projet sans `server/<feature>.js` : la logique
// vivait en double, inline, dans `api/_handlers/search.js` et le middleware de
// `vite.config.js`. Elle échappait donc à la couche testée qu'impose la
// convention, alors que la recherche est la porte d'entrée de l'application.

const FINNHUB_BASE = 'https://finnhub.io/api/v1';
const SOURCE = 'finnhub.io';
const MAX_RESULTS = 12;

export const MIN_QUERY_LENGTH = 2;

function normalizeResult(item) {
  return {
    symbol: item.symbol,
    description: item.description,
    type: item.type,
  };
}

export async function searchSymbols(query, {
  finnhubApiKey,
  fetcher = fetch,
  minLength = MIN_QUERY_LENGTH,
} = {}) {
  const cleanQuery = String(query ?? '').trim();

  // Validé AVANT tout appel réseau : une requête trop courte ou une clé absente
  // ne doit pas consommer de quota amont.
  if (cleanQuery.length < minLength) {
    throw new Error(`q must contain at least ${minLength} characters`);
  }

  if (!finnhubApiKey) {
    throw new Error('FINNHUB_API_KEY is required for symbol search');
  }

  const url = new URL(`${FINNHUB_BASE}/search`);
  url.searchParams.set('q', cleanQuery);
  url.searchParams.set('token', finnhubApiKey);

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    // Le message porte le statut, jamais l'URL : elle contient le jeton.
    throw new Error(`Finnhub search failed: ${response.status}`);
  }

  const payload = await response.json();
  const results = Array.isArray(payload.result)
    ? payload.result
      .filter((item) => item.symbol && item.description)
      .map(normalizeResult)
      .slice(0, MAX_RESULTS)
    : [];

  return {
    source: SOURCE,
    fetchedAt: new Date().toISOString(),
    results,
  };
}
