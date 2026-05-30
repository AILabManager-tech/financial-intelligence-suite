// Foreign-exchange rates (P3.4). Pure domain: fetch current rates from a free,
// ECB-backed provider (Frankfurter, keyless) with an optional keyed fallback
// (exchangerate.host), normalize to a single rates map anchored on `base`
// (base itself = 1), and expose a pure `convertAmount` helper. No invention:
// a missing rate yields null so the UI can hide the figure rather than fake it.
//
// Rates convention: ratesMap[ccy] = "how many <ccy> for 1 <base>". To convert an
// amount expressed in `from` into `to`, both must be present in the same map:
//   amount * (ratesMap[to] / ratesMap[from]).

const FRANKFURTER_BASE = "https://api.frankfurter.app/latest";
const EXCHANGERATE_HOST_BASE = "https://api.exchangerate.host/live";

function cleanCurrency(value, fallback = "USD") {
  const code = String(value ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : fallback;
}

function toFiniteNumber(value) {
  const num = typeof value === "number" ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

// Pure: convert `amount` from one currency to another using a base-anchored map.
// Returns null when either leg is missing (factual: never guess a rate).
export function convertAmount(amount, from, to, ratesMap) {
  const value = toFiniteNumber(amount);
  if (value === null || !ratesMap) return null;
  const fromCode = cleanCurrency(from);
  const toCode = cleanCurrency(to);
  if (fromCode === toCode) return value;
  const fromRate = toFiniteNumber(ratesMap[fromCode]);
  const toRate = toFiniteNumber(ratesMap[toCode]);
  if (fromRate === null || toRate === null || fromRate === 0) return null;
  return value * (toRate / fromRate);
}

async function fetchFrankfurter(base, { fetcher }) {
  const url = new URL(FRANKFURTER_BASE);
  url.searchParams.set("from", base);
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`frankfurter fx upstream ${response.status}`);
  }
  const payload = await response.json();
  const rates = payload?.rates;
  if (!rates || typeof rates !== "object") {
    throw new Error("frankfurter fx: invalid payload");
  }
  const normalized = { [base]: 1 };
  for (const [code, rate] of Object.entries(rates)) {
    const value = toFiniteNumber(rate);
    if (value !== null) normalized[cleanCurrency(code, code)] = value;
  }
  return { source: "frankfurter.app", asOf: payload.date ?? null, rates: normalized };
}

async function fetchExchangerateHost(base, { fetcher, exchangerateApiKey }) {
  const url = new URL(EXCHANGERATE_HOST_BASE);
  url.searchParams.set("source", base);
  url.searchParams.set("access_key", exchangerateApiKey);
  const response = await fetcher(url, { headers: { accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`exchangerate.host fx upstream ${response.status}`);
  }
  const payload = await response.json();
  if (payload?.success === false || !payload?.quotes || typeof payload.quotes !== "object") {
    throw new Error("exchangerate.host fx: unavailable");
  }
  // exchangerate.host returns keys like "USDCAD"; strip the leading base.
  const normalized = { [base]: 1 };
  for (const [pair, rate] of Object.entries(payload.quotes)) {
    const value = toFiniteNumber(rate);
    if (value === null) continue;
    const code = cleanCurrency(pair.slice(base.length), pair.slice(base.length));
    if (/^[A-Z]{3}$/.test(code)) normalized[code] = value;
  }
  const asOf = payload.timestamp
    ? new Date(payload.timestamp * 1000).toISOString().slice(0, 10)
    : null;
  return { source: "exchangerate.host", asOf, rates: normalized };
}

async function firstSuccessfulProvider(providers) {
  const errors = [];
  for (const provider of providers) {
    if (!provider.enabled) continue;
    try {
      return await provider.load();
    } catch (error) {
      errors.push(error.message);
    }
  }
  throw new Error(errors.at(-1) ?? "No FX provider available");
}

export async function fetchFxRates(base = "USD", {
  fetcher = fetch,
  exchangerateApiKey,
} = {}) {
  const baseCode = cleanCurrency(base);
  const result = await firstSuccessfulProvider([
    {
      enabled: true, // Frankfurter is keyless (ECB reference rates).
      load: () => fetchFrankfurter(baseCode, { fetcher }),
    },
    {
      enabled: Boolean(exchangerateApiKey),
      load: () => fetchExchangerateHost(baseCode, { fetcher, exchangerateApiKey }),
    },
  ]);

  return {
    base: baseCode,
    source: result.source,
    asOf: result.asOf,
    fetchedAt: new Date().toISOString(),
    rates: result.rates,
  };
}
