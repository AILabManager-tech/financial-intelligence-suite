const STORAGE_KEY = "financial-intelligence-suite.search-history.v1";

export const MAX_SEARCH_HISTORY = 20;
const MAX_QUERY_LENGTH = 80;
const MIN_QUERY_LENGTH = 2;

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function nowIso() {
  return new Date().toISOString();
}

function isValidIso(value) {
  if (typeof value !== "string") return false;
  const ts = Date.parse(value);
  return Number.isFinite(ts);
}

function normalizeEntry(raw) {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.query !== "string") return null;

  const trimmed = raw.query.trim().slice(0, MAX_QUERY_LENGTH);
  if (trimmed.length < MIN_QUERY_LENGTH) return null;

  const recordedAt = isValidIso(raw.recordedAt) ? raw.recordedAt : nowIso();
  const resultsCount = Number.isFinite(Number(raw.resultsCount)) ? Math.max(0, Number(raw.resultsCount)) : 0;

  return {
    query: trimmed,
    normalizedQuery: trimmed.toLowerCase(),
    recordedAt,
    resultsCount,
  };
}

export function normalizeSearchHistory(entries) {
  return (Array.isArray(entries) ? entries : [])
    .map(normalizeEntry)
    .filter(Boolean);
}

export function loadSearchHistory() {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return normalizeSearchHistory(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveSearchHistory(entries) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSearchHistory(entries)));
}

export function recordSearch(history, payload) {
  const entry = normalizeEntry({ ...payload, recordedAt: nowIso() });
  if (!entry) return Array.isArray(history) ? [...history] : [];

  const without = (Array.isArray(history) ? history : []).filter(
    (existing) => existing.normalizedQuery !== entry.normalizedQuery,
  );
  return [entry, ...without].slice(0, MAX_SEARCH_HISTORY);
}

export function removeSearchEntry(history, query) {
  const target = String(query ?? "").trim().toLowerCase();
  return (Array.isArray(history) ? history : []).filter(
    (entry) => entry.normalizedQuery !== target,
  );
}

export function clearSearchHistory() {
  if (hasStorage()) {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  return [];
}
