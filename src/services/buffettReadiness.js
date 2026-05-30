import {
  calcIntrinsicValue,
  decideAction,
  evaluateCriteria,
  resolveMoat,
} from "../utils/buffettCalculator";
import { extractBuffettInputs, formatActionLabel } from "../utils/buffettFormatters";
import { fetchFundamentals } from "./fundamentals";

const STANDARD_R = 0.10;
const STANDARD_G = 0.05;
const REQUIRED_FIELDS = ["roeTtm", "epsGrowth5y", "debtEquityAnnual", "pfcfShareTtm"];

function missingFields(fields) {
  return REQUIRED_FIELDS.filter((key) => !Number.isFinite(fields?.[key]?.value));
}

export function buildBuffettSummary(asset, fields) {
  const inputs = extractBuffettInputs({
    ticker: asset?.symbol ?? "",
    price: asset?.price,
    fields,
  });

  if (!inputs) {
    return {
      symbol: asset?.symbol ?? "",
      status: "incomplete",
      missing: missingFields(fields),
      score: null,
      criteriaTotal: 6,
      signal: null,
      label: "Incomplet",
    };
  }

  const intrinsicValue = calcIntrinsicValue(inputs.fcf, STANDARD_G, STANDARD_R);
  const mos = Number.isFinite(intrinsicValue) && inputs.price > 0
    ? (intrinsicValue - inputs.price) / intrinsicValue
    : NaN;
  const hasMoat = resolveMoat(inputs.ticker, {
    roe: inputs.roe,
    earningsGrowth5y: inputs.earningsGrowth5y,
    fcf: inputs.fcf,
    debtEquity: inputs.debtEquity,
  });
  const criteria = evaluateCriteria({ ...inputs, hasMoat }, mos);
  const score = criteria.filter((criterion) => criterion.status === "PASS").length;
  const signal = decideAction(score === criteria.length, mos);

  return {
    symbol: inputs.ticker,
    status: "ready",
    score,
    criteriaTotal: criteria.length,
    signal,
    label: formatActionLabel(signal),
    intrinsicValue,
    mos,
    source: inputs.source,
    asOf: inputs.asOf,
  };
}

export async function fetchBuffettSummary(asset, { signal } = {}) {
  const payload = await fetchFundamentals(asset.symbol, { signal });
  return buildBuffettSummary(asset, payload.fields);
}

export async function fetchBuffettSummaries(assets, { signal } = {}) {
  const entries = await Promise.all(
    assets.map(async (asset) => {
      try {
        const summary = await fetchBuffettSummary(asset, { signal });
        return [asset.symbol, summary];
      } catch (error) {
        return [asset.symbol, {
          symbol: asset.symbol,
          status: "unavailable",
          score: null,
          criteriaTotal: 6,
          signal: null,
          label: "Indisponible",
          error: error.message,
        }];
      }
    }),
  );
  return Object.fromEntries(entries);
}
