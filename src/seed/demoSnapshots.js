// Reconstituted daily-value snapshots for the demo portfolios (dev-only).
//
// The real performance panels (TWR/MWR/risque/ratios/benchmark/VaR…) consume a
// snapshot series `{ snapshotDate, totalMarketValue }` produced by the live
// accrual (one real point per day, never backfilled — factualité stricte). A
// fresh demo mandate has none, so every performance panel stays empty. This
// module RECONSTRUCTS a plausible value series for a demo profile so the
// Performance surface can be demonstrated — and tags every point
// `reconstructed: true` so the UI can label it as such (it is NOT real accrued
// market data).
//
// The series is internally consistent with the portfolio's own transactions:
//   value(t) = Σ_symbol heldQty(symbol, t) × pricePath(symbol, t)
// `heldQty` is replayed from the buy/sell log, so each purchase shows up as a
// capital inflow exactly where TWR's flow-neutralisation expects it. The price
// path is anchored on FACTUAL points — each buy's real price/date and the
// current static reference price (`prixCourant`) — with a small deterministic
// intra-period wiggle so volatility/drawdown have signal. Deterministic: seeded
// from the profile id + symbol + day, no Date.now / Math.random.

// Fixed "as of" date so the demo is reproducible across runs (no clock read).
export const DEMO_AS_OF = "2026-05-30";

const MS_PER_DAY = 86_400_000;
const NOISE_AMPLITUDE = 0.03; // ±3 % reconstituted intra-period variation
const STEP_DAYS = 7; // weekly cadence → ~120 points over ~18-28 months

function dayNum(iso) {
  const t = new Date(`${iso}T00:00:00.000Z`).getTime();
  return Number.isFinite(t) ? Math.round(t / MS_PER_DAY) : null;
}

function isoAddDays(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// FNV-1a string hash → uint32, seeded PRNG (mulberry32 step). Deterministic.
function hash32(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function rand01(seed) {
  let t = (seed + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function noiseAt(profileId, symbol, day) {
  return (rand01(hash32(`${profileId}|${symbol}|${day}`)) - 0.5) * 2 * NOISE_AMPLITUDE;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Linear interpolation of a symbol's price along its sorted factual anchors.
function priceAt(anchors, day) {
  if (day <= anchors[0].day) return anchors[0].price;
  const last = anchors[anchors.length - 1];
  if (day >= last.day) return last.price;
  for (let i = 1; i < anchors.length; i += 1) {
    const a = anchors[i - 1];
    const b = anchors[i];
    if (day <= b.day) {
      const span = b.day - a.day || 1;
      const frac = (day - a.day) / span;
      return a.price + (b.price - a.price) * frac;
    }
  }
  return last.price;
}

// Build per-symbol price anchors (factual buy points + current reference price).
function buildSymbolModels(transactions, prices, asOfDay) {
  const models = new Map();
  for (const tx of transactions) {
    if (tx.type !== "buy") continue;
    if (!Number.isFinite(tx.price)) continue;
    const day = dayNum(tx.date);
    if (day === null) continue;
    if (!models.has(tx.symbol)) models.set(tx.symbol, { anchors: [], lastBuyPrice: null });
    const model = models.get(tx.symbol);
    model.anchors.push({ day, price: tx.price });
    model.lastBuyPrice = tx.price;
  }
  for (const [symbol, model] of models) {
    model.anchors.sort((a, b) => a.day - b.day);
    const ref = prices?.[symbol];
    const refPrice = Number.isFinite(ref) ? ref : model.lastBuyPrice;
    // Append the current reference price as the final anchor.
    if (Number.isFinite(refPrice)) model.anchors.push({ day: asOfDay, price: refPrice });
  }
  return models;
}

// Net held quantity of `symbol` as of day `day` (buys − sells, dividend/fee ignored).
function heldQuantity(transactions, symbol, day) {
  let qty = 0;
  for (const tx of transactions) {
    if (tx.symbol !== symbol) continue;
    const txDay = dayNum(tx.date);
    if (txDay === null || txDay > day) continue;
    if (tx.type === "buy") qty += Number(tx.quantity) || 0;
    else if (tx.type === "sell") qty -= Number(tx.quantity) || 0;
  }
  return qty;
}

// Returns [{ snapshotDate, totalMarketValue, reconstructed: true }] ascending.
// `transactions` must be the already-normalized log (symbol upper, ISO date).
export function buildDemoSnapshots(profile, transactions, { asOf = DEMO_AS_OF } = {}) {
  const txs = Array.isArray(transactions) ? transactions : [];
  const buys = txs.filter((t) => t.type === "buy" && dayNum(t.date) !== null);
  if (buys.length === 0) return [];

  const asOfDay = dayNum(asOf);
  const startDay = Math.min(...buys.map((t) => dayNum(t.date)));
  if (!Number.isFinite(asOfDay) || !Number.isFinite(startDay) || asOfDay <= startDay) return [];

  const profileId = profile?.id ?? "demo";
  const models = buildSymbolModels(txs, profile?.prixCourant, asOfDay);
  const startIso = isoAddDays(asOf, -(asOfDay - startDay));

  // Weekly grid from the first purchase to as-of, ending exactly on as-of.
  const dates = [];
  for (let d = 0; ; d += STEP_DAYS) {
    const iso = isoAddDays(startIso, d);
    if (dayNum(iso) >= asOfDay) break;
    dates.push(iso);
  }
  dates.push(asOf);

  const series = [];
  for (const iso of dates) {
    const day = dayNum(iso);
    const isEndpoint = day >= asOfDay; // align final point with the holdings view
    let value = 0;
    for (const [symbol, model] of models) {
      const qty = heldQuantity(txs, symbol, day);
      if (qty <= 0 || model.anchors.length === 0) continue;
      const base = priceAt(model.anchors, day);
      const price = isEndpoint ? base : base * (1 + noiseAt(profileId, symbol, day));
      value += qty * price;
    }
    if (value > 0) {
      series.push({ snapshotDate: iso, totalMarketValue: round2(value), reconstructed: true });
    }
  }
  return series;
}
