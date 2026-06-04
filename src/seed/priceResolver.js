// Historical price resolver for declarative demo profiles.
//
// A profile transaction may omit `price` — the resolver fills it from the
// symbol's real historical close on (or before) the trade date, via an
// injectable history fetcher (the live `/api/history` in the app, a mock in
// tests). This keeps demo authoring light AND factual: the filled price is a
// REAL past close, never invented.
//
// Coverage is finite (free tier ≈ 18 months), so a date the history doesn't
// reach resolves to nothing — the resolver leaves `price` absent and
// expandTransactions drops that buy/sell (a 0-cost position would be a
// fabrication). Fill where the data exists, drop where it doesn't, never guess.

function toTime(date) {
  return new Date(`${date}T00:00:00.000Z`).getTime();
}

// Real close on or before `targetDate` from a {date, close} series, or null.
export function closeOnOrBefore(points, targetDate) {
  const target = toTime(targetDate);
  if (!Number.isFinite(target)) return null;
  const series = (Array.isArray(points) ? points : [])
    .filter((p) => p && p.date && Number.isFinite(p.close) && p.close > 0)
    .sort((a, b) => toTime(a.date) - toTime(b.date));
  let found = null;
  for (const p of series) {
    if (toTime(p.date) <= target) found = p;
    else break;
  }
  return found ? found.close : null;
}

function needsResolution(t) {
  return (t?.type === "buy" || t?.type === "sell") && !Number.isFinite(t?.price) && Boolean(t?.symbol);
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Fill missing buy/sell prices in a profile from history. Returns a new profile
// (unchanged when nothing needs resolving — so profiles with explicit prices do
// zero network work). `fetchHistory(symbol)` → {points:[{date,close}]} | array.
export async function resolveProfilePrices(profile, { fetchHistory } = {}) {
  const txs = Array.isArray(profile?.transactions) ? profile.transactions : [];
  const pending = txs.filter(needsResolution);
  if (pending.length === 0 || typeof fetchHistory !== "function") return profile;

  const symbols = [...new Set(pending.map((t) => String(t.symbol).toUpperCase()))];
  const histBySymbol = new Map();
  await Promise.all(
    symbols.map(async (symbol) => {
      try {
        const res = await fetchHistory(symbol);
        const points = Array.isArray(res) ? res : Array.isArray(res?.points) ? res.points : [];
        histBySymbol.set(symbol, points);
      } catch {
        histBySymbol.set(symbol, []); // unreachable / failed → no fill, tx will drop
      }
    }),
  );

  const resolved = txs.map((t) => {
    if (!needsResolution(t)) return t;
    const date = t.date ?? profile.dateDebut;
    const close = closeOnOrBefore(histBySymbol.get(String(t.symbol).toUpperCase()), date);
    return close == null ? t : { ...t, price: round2(close) };
  });

  return { ...profile, transactions: resolved };
}

// Resolve a list of profiles concurrently.
export async function resolveDemoProfiles(profiles, deps) {
  return Promise.all((Array.isArray(profiles) ? profiles : []).map((p) => resolveProfilePrices(p, deps)));
}
