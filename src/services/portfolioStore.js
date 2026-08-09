import { MAX_QUANTITY, MAX_UNIT_PRICE } from "../utils/positionLimits";

export const STORAGE_KEY = "financial-intelligence-suite.portfolio.v1";
const DEFAULT_PORTFOLIO_ID = "default";

// Positions are namespaced per mandate (P3.2). The 'default' mandate keeps the
// legacy key for back-compat (existing users' data); others get a suffixed key.
function storageKeyFor(portfolioId = DEFAULT_PORTFOLIO_ID) {
  return portfolioId && portfolioId !== DEFAULT_PORTFOLIO_ID ? `${STORAGE_KEY}::${portfolioId}` : STORAGE_KEY;
}

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

// Une valeur hors borne est traitée comme une valeur non finie : repli, jamais
// un nombre inventé entre les deux (écrêter 1e308 à 1e9 fabriquerait une
// quantité que l'utilisateur n'a pas saisie). C'est la même convention que pour
// `NaN`, déjà en place ici.
function cleanNumber(value, fallback = 0, max = Number.POSITIVE_INFINITY) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || Math.abs(parsed) > max) return fallback;
  return parsed;
}

export function normalizePortfolioAsset(asset) {
  const position = asset.position ?? {};
  // Bornes : c'est la seule couche traversée en production (le portefeuille
  // persiste en localStorage, il n'existe pas de handler `/api/portfolio`).
  // Sans elles, `quantity × price` vaut Infinity et contamine la valeur totale,
  // les poids et l'exposition sectorielle.
  // Le prix borné sert aussi de repli au coût moyen : le prix brut pourrait
  // lui-même être hors borne et se réintroduire par là.
  const price = cleanNumber(asset.price, 0, MAX_UNIT_PRICE);

  return {
    symbol: String(asset.symbol ?? "").trim().toUpperCase(),
    name: asset.name || asset.symbol,
    sector: asset.sector || "Portefeuille — Non classé",
    price,
    change: cleanNumber(asset.change, null),
    changePct: cleanNumber(asset.changePct, null),
    volume: cleanNumber(asset.volume, 0),
    position: {
      quantity: cleanNumber(position.quantity, 0, MAX_QUANTITY),
      averageCost: cleanNumber(position.averageCost, price, MAX_UNIT_PRICE),
      targetWeight: cleanNumber(position.targetWeight, 0),
    },
  };
}

export function loadPortfolioAssets(defaultAssets, portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return defaultAssets.map(normalizePortfolioAsset);

  try {
    const raw = window.localStorage.getItem(storageKeyFor(portfolioId));
    if (!raw) return defaultAssets.map(normalizePortfolioAsset);

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return defaultAssets.map(normalizePortfolioAsset);
    }

    return parsed.map(normalizePortfolioAsset).filter((asset) => asset.symbol);
  } catch {
    return defaultAssets.map(normalizePortfolioAsset);
  }
}

export function savePortfolioAssets(assets, portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return;
  const normalized = assets.map(normalizePortfolioAsset).filter((asset) => asset.symbol);
  window.localStorage.setItem(storageKeyFor(portfolioId), JSON.stringify(normalized));
}

export function upsertPortfolioAsset(assets, asset, position) {
  const normalized = normalizePortfolioAsset({
    ...asset,
    position: {
      quantity: position.quantity,
      averageCost: position.averageCost,
      targetWeight: position.targetWeight,
    },
  });

  const existingIndex = assets.findIndex((item) => item.symbol === normalized.symbol);
  if (existingIndex === -1) return [...assets, normalized];

  return assets.map((item, index) => (
    index === existingIndex
      ? normalizePortfolioAsset({ ...item, ...normalized, marketData: item.marketData ?? normalized.marketData })
      : item
  ));
}

export function removePortfolioAsset(assets, symbol) {
  return assets.filter((asset) => asset.symbol !== symbol);
}

export function isPortfolioAsset(assets, symbol) {
  return assets.some((asset) => asset.symbol === symbol);
}

