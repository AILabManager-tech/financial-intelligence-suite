const SOURCE = 'finnhub.io';

function isFiniteNumber(value) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num);
}

function toFiniteNumber(value) {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function nonEmptyString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function emit(target, key, value, asOf) {
  if (value === null || value === undefined) return;
  target[key] = { value, source: SOURCE, asOf };
}

export function normalizeFundamentals({ profile, metric, asOf } = {}) {
  const result = {};
  const profileData = profile ?? {};
  const metricData = metric?.metric ?? {};

  const marketCapMillions = toFiniteNumber(profileData.marketCapitalization);
  if (marketCapMillions !== null) {
    emit(result, 'marketCap', marketCapMillions * 1_000_000, asOf);
  }

  emit(result, 'peRatio', toFiniteNumber(metricData.peTTM), asOf);
  emit(result, 'epsTtm', toFiniteNumber(metricData.epsTTM), asOf);

  const revenuePerShare = toFiniteNumber(metricData.revenuePerShareTTM);
  const sharesMillions = toFiniteNumber(profileData.shareOutstanding);
  if (revenuePerShare !== null && sharesMillions !== null && sharesMillions > 0) {
    emit(result, 'revenueTtm', revenuePerShare * sharesMillions * 1_000_000, asOf);
  }

  emit(result, 'grossMargin', toFiniteNumber(metricData.grossMarginTTM), asOf);
  emit(result, 'operatingMargin', toFiniteNumber(metricData.operatingMarginTTM), asOf);
  emit(result, 'netMargin', toFiniteNumber(metricData.netProfitMarginTTM), asOf);
  emit(result, 'dividendYield', toFiniteNumber(metricData.dividendYieldIndicatedAnnual), asOf);
  emit(result, 'beta', toFiniteNumber(metricData.beta), asOf);

  // Buffett-analysis fields (consumed by BuffettAnalysisPanel; not surfaced
  // by FundamentalsPanel because FUNDAMENTALS_DEFINITIONS does not list them).
  // All emitted as raw Finnhub values, scaling handled by the consumer.
  emit(result, 'roeTtm', toFiniteNumber(metricData.roeTTM), asOf);                          // pct, e.g. 43.62
  emit(result, 'epsGrowth5y', toFiniteNumber(metricData.epsGrowth5Y), asOf);                // pct, e.g. 11.14
  emit(result, 'debtEquityAnnual', toFiniteNumber(metricData['totalDebt/totalEquityAnnual']), asOf); // ratio, e.g. 1.41
  emit(result, 'pfcfShareTtm', toFiniteNumber(metricData.pfcfShareTTM), asOf);              // ratio price/FCF/share, e.g. 26.86

  emit(result, 'country', nonEmptyString(profileData.country), asOf);
  emit(result, 'industry', nonEmptyString(profileData.finnhubIndustry), asOf);

  return result;
}

// Exported for callers that need to enumerate the canonical field set
// (UI rendering order, audit dashboards, etc.) without re-deriving it.
export const FUNDAMENTALS_FIELDS = [
  'marketCap',
  'peRatio',
  'epsTtm',
  'revenueTtm',
  'grossMargin',
  'operatingMargin',
  'netMargin',
  'dividendYield',
  'beta',
  'roeTtm',
  'epsGrowth5y',
  'debtEquityAnnual',
  'pfcfShareTtm',
  'country',
  'industry',
];

// isFiniteNumber is exported for downstream guards that want the same
// "string-or-number, finite" semantics without re-implementing it.
export { isFiniteNumber };
