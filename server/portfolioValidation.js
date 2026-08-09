import { MAX_QUANTITY, MAX_UNIT_PRICE } from '../src/utils/positionLimits.js';

const symbolPattern = /^[A-Z0-9][A-Z0-9.-]{0,14}$/;
const maxPositions = 200;

function parseFiniteNumber(value, field, { min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a finite number`);
  }

  if (parsed < min || parsed > max) {
    throw new Error(`${field} must be between ${min} and ${max}`);
  }

  return parsed;
}

function parseText(value, field, fallback, maxLength = 160) {
  const normalized = String(value || fallback || "").trim();

  if (!normalized) {
    throw new Error(`${field} is required`);
  }

  return normalized.slice(0, maxLength);
}

export function validatePortfolioAssets(assets) {
  if (!Array.isArray(assets)) {
    throw new Error("assets must be an array");
  }

  if (assets.length > maxPositions) {
    throw new Error(`assets cannot contain more than ${maxPositions} positions`);
  }

  const seen = new Set();

  return assets.map((asset, index) => {
    const symbol = String(asset?.symbol || "").trim().toUpperCase();

    if (!symbolPattern.test(symbol)) {
      throw new Error(`assets[${index}].symbol is invalid`);
    }

    if (seen.has(symbol)) {
      throw new Error(`assets[${index}].symbol is duplicated`);
    }
    seen.add(symbol);

    const position = asset.position ?? {};

    return {
      ...asset,
      symbol,
      name: parseText(asset.name, `assets[${index}].name`, symbol),
      sector: parseText(asset.sector, `assets[${index}].sector`, "Portefeuille - Non classé"),
      // `price` est le facteur réel de la valeur de marché (quantity × price).
      // Il traversait la validation par le spread ci-dessus : borner la seule
      // quantité laissait 1e9 × 1e308 = Infinity atteignable.
      price: parseFiniteNumber(asset.price ?? 0, `assets[${index}].price`, { min: 0, max: MAX_UNIT_PRICE }),
      position: {
        quantity: parseFiniteNumber(position.quantity ?? 0, `assets[${index}].position.quantity`, { min: 0, max: MAX_QUANTITY }),
        averageCost: parseFiniteNumber(position.averageCost ?? asset.price ?? 0, `assets[${index}].position.averageCost`, { min: 0, max: MAX_UNIT_PRICE }),
        targetWeight: parseFiniteNumber(position.targetWeight ?? 0, `assets[${index}].position.targetWeight`, { min: 0, max: 100 }),
      },
    };
  });
}

export function validatePortfolioSnapshot(snapshot) {
  const value = snapshot ?? {};
  const capturedAt = value.capturedAt ? new Date(value.capturedAt) : new Date();

  if (Number.isNaN(capturedAt.getTime())) {
    throw new Error("snapshot.capturedAt must be a valid date");
  }

  return {
    capturedAt: capturedAt.toISOString(),
    totalMarketValue: parseFiniteNumber(value.totalMarketValue ?? 0, "snapshot.totalMarketValue", { min: 0 }),
    totalCost: parseFiniteNumber(value.totalCost ?? 0, "snapshot.totalCost", { min: 0 }),
    unrealizedPnl: parseFiniteNumber(value.unrealizedPnl ?? 0, "snapshot.unrealizedPnl"),
    unrealizedPnlPct: parseFiniteNumber(value.unrealizedPnlPct ?? 0, "snapshot.unrealizedPnlPct"),
    positionsCount: Math.round(parseFiniteNumber(value.positionsCount ?? 0, "snapshot.positionsCount", { min: 0 })),
    liveQuotesCount: Math.round(parseFiniteNumber(value.liveQuotesCount ?? 0, "snapshot.liveQuotesCount", { min: 0 })),
  };
}
