// Indicateurs macro (P5.6) via FRED (Federal Reserve, St. Louis). Données
// factuelles : dernier point publié de chaque série de taux. Clé FRED_API_KEY
// requise (gratuite) ; sans elle, lève une erreur explicite (l'UI affiche un état
// indisponible, jamais de valeur inventée).

const FRED_BASE = 'https://api.stlouisfed.org/fred/series/observations';

// Séries publiées sur FRED. Point unique = dernier publié (pas de calcul dérivé
// → factualité directe). `transform` = transformation d'unités calculée PAR FRED
// (ex. 'pc1' = variation % sur un an), donc l'inflation reste une donnée FRED,
// pas un calcul maison. Les séries canadiennes (OCDE via FRED) complètent le
// volet macro Canada (P5.6 + couverture canadienne).
const SERIES = [
  { id: 'FEDFUNDS', label: 'Taux directeur Fed', unit: '%' },
  { id: 'DGS2', label: 'Trésor US 2 ans', unit: '%' },
  { id: 'DGS10', label: 'Trésor US 10 ans', unit: '%' },
  { id: 'T10Y2Y', label: 'Spread 10A − 2A', unit: '%' },
  { id: 'CPIAUCSL', label: 'Inflation US (IPC, 1 an)', unit: '%', transform: 'pc1' },
  { id: 'IRSTCB01CAM156N', label: 'Taux directeur Banque du Canada', unit: '%' },
];

async function fetchLatestObservation(series, { fredApiKey, fetcher }) {
  const url = new URL(FRED_BASE);
  url.searchParams.set('series_id', series.id);
  url.searchParams.set('api_key', fredApiKey);
  url.searchParams.set('file_type', 'json');
  url.searchParams.set('sort_order', 'desc');
  url.searchParams.set('limit', '1');
  if (series.transform) {
    url.searchParams.set('units', series.transform); // ex. pc1 = % sur 1 an (calculé par FRED)
  }

  const response = await fetcher(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(`${series.id}: FRED upstream ${response.status}`);
  }
  const payload = await response.json();
  const obs = Array.isArray(payload?.observations) ? payload.observations[0] : null;
  const value = Number(obs?.value); // FRED met '.' pour une valeur manquante → NaN
  if (!obs || !Number.isFinite(value)) return null;
  return { id: series.id, label: series.label, unit: series.unit, value, date: obs.date };
}

export async function fetchMacroIndicators({ fredApiKey, fetcher = fetch } = {}) {
  if (!fredApiKey) {
    throw new Error('FRED_API_KEY is required for macro indicators');
  }
  const settled = await Promise.allSettled(
    SERIES.map((series) => fetchLatestObservation(series, { fredApiKey, fetcher })),
  );
  const indicators = settled
    .filter((r) => r.status === 'fulfilled' && r.value)
    .map((r) => r.value);

  return { source: 'fred.stlouisfed.org', fetchedAt: new Date().toISOString(), indicators };
}
