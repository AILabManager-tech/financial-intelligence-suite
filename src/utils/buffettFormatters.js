// Buffett analysis formatters — convert normalised Finnhub fields into the
// shape expected by the pure DCF calculator, and produce display-ready
// strings for the panel. All functions are pure.

const REQUIRED_FIELDS = ['roeTtm', 'epsGrowth5y', 'debtEquityAnnual', 'pfcfShareTtm'];

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

function pickValue(field) {
  return field && isFiniteNumber(field.value) ? field.value : null;
}

function pickAsOf(field) {
  return field?.asOf ?? null;
}

function pickSource(field) {
  return field?.source ?? null;
}

/**
 * Build the input object consumed by buffettCalculator (calcIntrinsicValue
 * + evaluateCriteria + resolveMoat) from the normalised fundamentals payload
 * plus the live price.
 *
 * Returns null if any required input is missing — the panel then renders an
 * explicit "données insuffisantes" state instead of silently fabricating
 * numbers (FIS rule: zero invented data).
 */
export function extractBuffettInputs({ ticker, price, fields }) {
  if (!isFiniteNumber(price) || price <= 0) return null;
  if (!fields) return null;

  for (const key of REQUIRED_FIELDS) {
    if (!fields[key] || !isFiniteNumber(fields[key].value)) return null;
  }

  const pfcf = fields.pfcfShareTtm.value;
  if (pfcf <= 0) return null;

  const fcf = price / pfcf;
  const roe = fields.roeTtm.value / 100;
  const earningsGrowth5y = fields.epsGrowth5y.value / 100;
  const debtEquity = fields.debtEquityAnnual.value;

  // Most recent asOf — fields may share a single fundamentals fetch, so
  // typically all four equal each other. Take the max defensively.
  const asOfStamps = REQUIRED_FIELDS.map((k) => pickAsOf(fields[k])).filter(Boolean);
  const asOf = asOfStamps.length
    ? asOfStamps.reduce((a, b) => (a > b ? a : b))
    : null;
  const source = pickSource(fields.roeTtm) ?? 'finnhub.io';

  return {
    ticker: typeof ticker === 'string' ? ticker : '',
    price,
    fcf,
    roe,
    earningsGrowth5y,
    debtEquity,
    source,
    asOf,
    raw: {
      roeTtm: pickValue(fields.roeTtm),
      epsGrowth5y: pickValue(fields.epsGrowth5y),
      debtEquityAnnual: pickValue(fields.debtEquityAnnual),
      pfcfShareTtm: pickValue(fields.pfcfShareTtm),
    },
  };
}

export function formatPercent(value) {
  if (!isFiniteNumber(value)) return null;
  const pct = value * 100;
  const sign = pct >= 0 ? '+' : '';
  return `${sign}${pct.toFixed(2)}%`;
}

export function formatRatio(value) {
  if (!isFiniteNumber(value)) return null;
  return value.toFixed(2);
}

export function formatCurrency(value) {
  if (value === Infinity) return '∞';
  if (!isFiniteNumber(value)) return null;
  return `$${value.toFixed(2)}`;
}

const ACTION_LABELS = {
  BUY: 'Acheter',
  SELL: 'Vendre',
  HOLD: 'Conserver',
};

export function formatActionLabel(action) {
  return ACTION_LABELS[action] ?? null;
}
