// Investment journal store (P5.1) — per-symbol investment thesis & conviction.
// A catalog feature of the asset card: for each symbol the user records a buy
// thesis, a conviction (1-5), a target price, a stop, and a review date. This is
// the user's OWN decision record (factual user input, never a fabricated signal
// or advice); the target/stop are the user's objectives, not a recommendation.
//
// Storage mirrors watchlistStore: a single versioned localStorage document (the
// prod source of truth — no server mirror, like the watchlist), keyed by symbol
// so a thesis is mandate-agnostic ("my view on AAPL"). The mutators are pure and
// operate on a plain { SYMBOL: note } map so they stay testable in isolation; a
// future AI layer can read the same normalized notes through a clean data seam.
//
// Note shape: { symbol, thesis, conviction, targetPrice, stopPrice, reviewDate, updatedAt }
//   conviction: integer 1..5 | null   targetPrice/stopPrice: number > 0 | null
//   reviewDate: "YYYY-MM-DD" | ""      updatedAt: ISO string | "" (set by the panel)

export const JOURNAL_KEY = "fis:investment-journal:v1";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function posNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function convictionOf(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 5 ? parsed : null;
}

// Normalize a raw note; returns null when it can't be keyed (no usable symbol)
// so callers can filter it out. Empty optional fields collapse to null/"".
export function normalizeNote(raw) {
  const symbol = String(raw?.symbol ?? "").trim().toUpperCase();
  if (!symbol) return null;
  const reviewDate = String(raw?.reviewDate ?? "").trim();
  return {
    symbol,
    thesis: typeof raw?.thesis === "string" ? raw.thesis.trim() : "",
    conviction: convictionOf(raw?.conviction),
    targetPrice: posNumber(raw?.targetPrice),
    stopPrice: posNumber(raw?.stopPrice),
    reviewDate: DATE_RE.test(reviewDate) ? reviewDate : "",
    updatedAt: typeof raw?.updatedAt === "string" ? raw.updatedAt : "",
  };
}

// A note carries content once any decision field is filled. updatedAt alone does
// not count as content (it's metadata) — an otherwise-empty note is junk.
export function hasContent(note) {
  if (!note) return false;
  return Boolean(
    note.thesis ||
      note.conviction !== null ||
      note.targetPrice !== null ||
      note.stopPrice !== null ||
      note.reviewDate,
  );
}

// --- Pure map mutators (return a new map, never mutate the argument) ----------

export function getNote(map, symbol) {
  const key = String(symbol ?? "").trim().toUpperCase();
  if (!key || !map || typeof map !== "object") return null;
  return map[key] ?? null;
}

// Upsert a note; an empty (no-content) note removes the key so the store never
// accumulates blank records.
export function upsertNote(map, raw) {
  const note = normalizeNote(raw);
  if (!note) return map;
  if (!hasContent(note)) return removeNote(map, note.symbol);
  return { ...map, [note.symbol]: note };
}

export function removeNote(map, symbol) {
  const key = String(symbol ?? "").trim().toUpperCase();
  if (!map || !(key in map)) return map;
  const next = { ...map };
  delete next[key];
  return next;
}

// --- Persistence (graceful on private browsing / corrupt data) ----------------

export function loadJournal() {
  if (!hasStorage()) return {};
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return {};
    const out = {};
    for (const value of Object.values(parsed)) {
      const note = normalizeNote(value);
      if (note && hasContent(note)) out[note.symbol] = note;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveJournal(map) {
  if (!hasStorage()) return;
  const clean = {};
  for (const value of Object.values(map ?? {})) {
    const note = normalizeNote(value);
    if (note && hasContent(note)) clean[note.symbol] = note;
  }
  try {
    window.localStorage.setItem(JOURNAL_KEY, JSON.stringify(clean));
  } catch {
    // private browsing / quota — non-fatal
  }
}
