const STORAGE_KEY = "financial-intelligence-suite.favorites.v1";

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function normalizeSymbol(symbol) {
  return String(symbol ?? "").trim().toUpperCase();
}

export function normalizeFavoriteSymbols(symbols) {
  return Array.from(new Set((Array.isArray(symbols) ? symbols : [])
    .map(normalizeSymbol)
    .filter(Boolean)))
    .sort();
}

export function loadFavoriteSymbols(defaultSymbols = []) {
  if (!hasStorage()) return normalizeFavoriteSymbols(defaultSymbols);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return normalizeFavoriteSymbols(defaultSymbols);

    return normalizeFavoriteSymbols(JSON.parse(raw));
  } catch {
    return normalizeFavoriteSymbols(defaultSymbols);
  }
}

export function saveFavoriteSymbols(symbols) {
  if (!hasStorage()) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeFavoriteSymbols(symbols)));
}

export function toggleFavoriteSymbol(symbols, symbol) {
  const normalized = normalizeSymbol(symbol);
  if (!normalized) return normalizeFavoriteSymbols(symbols);

  const current = new Set(normalizeFavoriteSymbols(symbols));
  if (current.has(normalized)) {
    current.delete(normalized);
  } else {
    current.add(normalized);
  }

  return normalizeFavoriteSymbols(Array.from(current));
}

export function isFavoriteSymbol(symbols, symbol) {
  return normalizeFavoriteSymbols(symbols).includes(normalizeSymbol(symbol));
}
