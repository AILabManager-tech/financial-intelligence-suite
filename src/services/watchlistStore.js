const STORAGE_KEY = "financial-intelligence-suite.watchlist.v1";

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function cleanNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeWatchlistAsset(asset) {
  return {
    symbol: String(asset.symbol ?? "").trim().toUpperCase(),
    name: asset.name || asset.symbol,
    sector: asset.sector || "Watchlist — Non classé",
    price: cleanNumber(asset.price, 0),
    change: cleanNumber(asset.change, 0),
    changePct: cleanNumber(asset.changePct, 0),
    volume: cleanNumber(asset.volume, 0),
    addedAt: asset.addedAt || new Date().toISOString(),
    marketData: asset.marketData ? { ...asset.marketData } : undefined,
  };
}

export function loadWatchlistAssets(defaultAssets = []) {
  if (!hasStorage()) return defaultAssets.map(normalizeWatchlistAsset);

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultAssets.map(normalizeWatchlistAsset);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return defaultAssets.map(normalizeWatchlistAsset);
    }

    return parsed.map(normalizeWatchlistAsset).filter((asset) => asset.symbol);
  } catch {
    return defaultAssets.map(normalizeWatchlistAsset);
  }
}

export function saveWatchlistAssets(assets) {
  if (!hasStorage()) return;
  const normalized = assets.map(normalizeWatchlistAsset).filter((asset) => asset.symbol);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
}

export function upsertWatchlistAsset(assets, asset) {
  const normalized = normalizeWatchlistAsset(asset);
  const existing = assets.find((item) => item.symbol === normalized.symbol);

  if (!existing) {
    return [...assets, normalized];
  }

  return assets.map((item) => (item.symbol === normalized.symbol ? { ...item, ...normalized, addedAt: item.addedAt ?? normalized.addedAt } : item));
}

export function removeWatchlistAsset(assets, symbol) {
  return assets.filter((asset) => asset.symbol !== String(symbol).trim().toUpperCase());
}

export function isWatchlisted(assets, symbol) {
  return assets.some((asset) => asset.symbol === String(symbol).trim().toUpperCase());
}
