// Mapping of known Finnhub symbol suffixes → exchange + ISO country code + label.
// Source: Finnhub /search documentation. Conservative list of liquid markets.
export const KNOWN_SUFFIXES = [
  { suffix: ".L", exchange: "LSE", country: "UK", countryLabel: "Royaume-Uni" },
  { suffix: ".PA", exchange: "Euronext Paris", country: "FR", countryLabel: "France" },
  { suffix: ".AS", exchange: "Euronext Amsterdam", country: "NL", countryLabel: "Pays-Bas" },
  { suffix: ".BR", exchange: "Euronext Brussels", country: "BE", countryLabel: "Belgique" },
  { suffix: ".LS", exchange: "Euronext Lisbonne", country: "PT", countryLabel: "Portugal" },
  { suffix: ".DE", exchange: "XETRA", country: "DE", countryLabel: "Allemagne" },
  { suffix: ".F", exchange: "Francfort", country: "DE", countryLabel: "Allemagne" },
  { suffix: ".MI", exchange: "Borsa Italiana", country: "IT", countryLabel: "Italie" },
  { suffix: ".MC", exchange: "BME Madrid", country: "ES", countryLabel: "Espagne" },
  { suffix: ".SW", exchange: "SIX Swiss", country: "CH", countryLabel: "Suisse" },
  { suffix: ".ST", exchange: "Stockholm", country: "SE", countryLabel: "Suède" },
  { suffix: ".OL", exchange: "Oslo", country: "NO", countryLabel: "Norvège" },
  { suffix: ".CO", exchange: "Copenhague", country: "DK", countryLabel: "Danemark" },
  { suffix: ".HE", exchange: "Helsinki", country: "FI", countryLabel: "Finlande" },
  { suffix: ".VI", exchange: "Vienne", country: "AT", countryLabel: "Autriche" },
  { suffix: ".WA", exchange: "Varsovie", country: "PL", countryLabel: "Pologne" },
  { suffix: ".PR", exchange: "Prague", country: "CZ", countryLabel: "République tchèque" },
  { suffix: ".IS", exchange: "Istanbul", country: "TR", countryLabel: "Turquie" },
  { suffix: ".ME", exchange: "Moscou", country: "RU", countryLabel: "Russie" },
  { suffix: ".TO", exchange: "TSX", country: "CA", countryLabel: "Canada" },
  { suffix: ".V", exchange: "TSX-V", country: "CA", countryLabel: "Canada" },
  { suffix: ".MX", exchange: "Mexico", country: "MX", countryLabel: "Mexique" },
  { suffix: ".SA", exchange: "B3", country: "BR", countryLabel: "Brésil" },
  { suffix: ".BA", exchange: "Buenos Aires", country: "AR", countryLabel: "Argentine" },
  { suffix: ".SN", exchange: "Santiago", country: "CL", countryLabel: "Chili" },
  { suffix: ".HK", exchange: "Hong Kong", country: "HK", countryLabel: "Hong Kong" },
  { suffix: ".T", exchange: "Tokyo", country: "JP", countryLabel: "Japon" },
  { suffix: ".KS", exchange: "KOSPI", country: "KR", countryLabel: "Corée du Sud" },
  { suffix: ".KQ", exchange: "KOSDAQ", country: "KR", countryLabel: "Corée du Sud" },
  { suffix: ".TW", exchange: "Taiwan", country: "TW", countryLabel: "Taïwan" },
  { suffix: ".SS", exchange: "Shanghai", country: "CN", countryLabel: "Chine" },
  { suffix: ".SZ", exchange: "Shenzhen", country: "CN", countryLabel: "Chine" },
  { suffix: ".NS", exchange: "NSE", country: "IN", countryLabel: "Inde" },
  { suffix: ".BO", exchange: "BSE", country: "IN", countryLabel: "Inde" },
  { suffix: ".AX", exchange: "ASX", country: "AU", countryLabel: "Australie" },
  { suffix: ".NZ", exchange: "NZX", country: "NZ", countryLabel: "Nouvelle-Zélande" },
  { suffix: ".JO", exchange: "JSE", country: "ZA", countryLabel: "Afrique du Sud" },
  { suffix: ".TA", exchange: "Tel Aviv", country: "IL", countryLabel: "Israël" },
];

const SUFFIX_MAP = new Map(KNOWN_SUFFIXES.map((entry) => [entry.suffix, entry]));

const US_DEFAULT = {
  exchange: "NASDAQ/NYSE",
  country: "US",
  countryLabel: "États-Unis",
};

const UNKNOWN = {
  exchange: null,
  country: null,
  countryLabel: "Marché inconnu",
};

export function parseSymbolExchange(symbol) {
  const normalized = String(symbol ?? "").trim().toUpperCase();
  if (!normalized) {
    return { base: "", suffix: "", ...UNKNOWN };
  }

  const dotIndex = normalized.indexOf(".");
  if (dotIndex === -1) {
    return { base: normalized, suffix: "", ...US_DEFAULT };
  }

  const base = normalized.slice(0, dotIndex);
  const suffix = normalized.slice(dotIndex);
  const known = SUFFIX_MAP.get(suffix);

  if (!known) {
    return { base, suffix, ...UNKNOWN };
  }

  return {
    base,
    suffix,
    exchange: known.exchange,
    country: known.country,
    countryLabel: known.countryLabel,
  };
}

export function uniqueCountriesFromResults(results) {
  const counts = new Map();
  (Array.isArray(results) ? results : []).forEach((result) => {
    if (!result?.country) return;
    counts.set(result.country, (counts.get(result.country) ?? 0) + 1);
  });

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([code]) => code);
}
