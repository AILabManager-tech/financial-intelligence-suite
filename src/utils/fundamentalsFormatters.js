function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function formatLargeUsd(value) {
  if (!isFiniteNumber(value)) return null;
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}Mds`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  return `$${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

function formatRatio(value) {
  if (!isFiniteNumber(value)) return null;
  return `${value.toFixed(1)}x`;
}

function formatUsdPrice(value) {
  if (!isFiniteNumber(value)) return null;
  return `$${value.toFixed(2)}`;
}

function formatPercent(value) {
  if (!isFiniteNumber(value)) return null;
  // Dividend yields land typically <1% — keep two decimals there.
  // Margins (and 0) read better with one decimal.
  const decimals = Math.abs(value) > 0 && Math.abs(value) < 1 ? 2 : 1;
  return `${value.toFixed(decimals)}%`;
}

function formatBeta(value) {
  if (!isFiniteNumber(value)) return null;
  return value.toFixed(2);
}

function formatString(value) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

const FORMATTERS = {
  marketCap: formatLargeUsd,
  revenueTtm: formatLargeUsd,
  peRatio: formatRatio,
  epsTtm: formatUsdPrice,
  grossMargin: formatPercent,
  operatingMargin: formatPercent,
  netMargin: formatPercent,
  dividendYield: formatPercent,
  beta: formatBeta,
  country: formatString,
  industry: formatString,
};

export function formatFundamentalValue(key, value) {
  const formatter = FORMATTERS[key];
  if (!formatter) return null;
  return formatter(value);
}

export const FUNDAMENTALS_DEFINITIONS = [
  { key: 'marketCap', label: 'Capitalisation', hint: 'Capitalisation boursière (USD)' },
  { key: 'revenueTtm', label: 'Revenus TTM', hint: 'Revenus 12 derniers mois (USD)' },
  { key: 'peRatio', label: 'P/E (TTM)', hint: 'Ratio cours / bénéfice TTM' },
  { key: 'epsTtm', label: 'BPA (TTM)', hint: 'Bénéfice par action 12 derniers mois (USD)' },
  { key: 'grossMargin', label: 'Marge brute', hint: 'Marge brute TTM (%)' },
  { key: 'operatingMargin', label: 'Marge opérationnelle', hint: 'Marge opérationnelle TTM (%)' },
  { key: 'netMargin', label: 'Marge nette', hint: 'Marge bénéficiaire nette TTM (%)' },
  { key: 'dividendYield', label: 'Rendement div.', hint: 'Rendement en dividendes annualisé (%)' },
  { key: 'beta', label: 'Bêta', hint: 'Volatilité relative au marché' },
  { key: 'country', label: 'Pays', hint: 'Pays d\'enregistrement' },
  { key: 'industry', label: 'Secteur', hint: 'Industrie Finnhub' },
];
