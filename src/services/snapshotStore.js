// Durable client-side daily snapshot series (P-repair #1).
//
// Portfolio snapshots used to live only in the dev SQLite mirror, so in
// production (localStorage-only) every snapshot-derived panel — TWR, MWR, risk,
// ratios, VaR, benchmark, beta — stayed permanently empty: the accrual never
// persisted anywhere. This store keeps the series in localStorage, the same
// durable source of truth as positions/watchlists, so real users actually
// accumulate a performance history.
//
// Factuality: this only PERSISTS points the app already computes from real
// positions × live quotes, one per calendar day, with NO backfill of past days
// (quantities change over time — a fabricated past value would be a lie). Demo
// mandates keep their own reconstituted series (demoSnapshotStore) and never
// touch this key.

export const SNAPSHOT_STORAGE_KEY = "fis:snapshots:v1";
const DEFAULT_PORTFOLIO_ID = "default";
const DEFAULT_LIMIT = 120;

function storageKeyFor(portfolioId = DEFAULT_PORTFOLIO_ID) {
  return portfolioId && portfolioId !== DEFAULT_PORTFOLIO_ID
    ? `${SNAPSHOT_STORAGE_KEY}::${portfolioId}`
    : SNAPSHOT_STORAGE_KEY;
}

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function dayOf(snapshot) {
  const date = snapshot?.snapshotDate || snapshot?.capturedAt || "";
  return String(date).slice(0, 10);
}

// Normalize to the shape the perf utils read (snapshotDate + totalMarketValue),
// keeping the captured metrics. Returns null if there is no usable day/value.
function normalizeSnapshot(snapshot) {
  const day = dayOf(snapshot);
  const totalMarketValue = Number(snapshot?.totalMarketValue);
  if (!day || !Number.isFinite(totalMarketValue)) return null;
  return {
    ...snapshot,
    capturedAt: snapshot.capturedAt ?? `${day}T00:00:00.000Z`,
    snapshotDate: day,
    totalMarketValue,
  };
}

function readRaw(portfolioId) {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(portfolioId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeSnapshot).filter(Boolean);
  } catch {
    return [];
  }
}

function sortAndCap(series, limit) {
  return [...series]
    .sort((a, b) => a.snapshotDate.localeCompare(b.snapshotDate))
    .slice(-limit);
}

export function loadStoredSnapshots(portfolioId = DEFAULT_PORTFOLIO_ID, limit = DEFAULT_LIMIT) {
  return sortAndCap(readRaw(portfolioId), limit);
}

// Idempotent per calendar day: a second snapshot for the same day replaces the
// first (last write of the day wins, mirroring the dev SQLite upsert). Returns
// the updated, sorted, capped series so the caller can set state directly.
export function appendStoredSnapshot(snapshot, portfolioId = DEFAULT_PORTFOLIO_ID, limit = DEFAULT_LIMIT) {
  const normalized = normalizeSnapshot(snapshot);
  const existing = readRaw(portfolioId);
  if (!normalized) return sortAndCap(existing, limit);

  const withoutDay = existing.filter((entry) => entry.snapshotDate !== normalized.snapshotDate);
  const series = sortAndCap([...withoutDay, normalized], limit);

  if (hasStorage()) {
    try {
      window.localStorage.setItem(storageKeyFor(portfolioId), JSON.stringify(series));
    } catch {
      // Persistence is best-effort — never let a storage failure break the UI.
    }
  }
  return series;
}

export function clearStoredSnapshots(portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return;
  try {
    window.localStorage.removeItem(storageKeyFor(portfolioId));
  } catch {
    // ignore
  }
}
