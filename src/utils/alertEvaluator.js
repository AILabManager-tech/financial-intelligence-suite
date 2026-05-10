import { enrichAssetsWithPositionMetrics } from "./portfolioAnalytics";

function formatPrice(price) {
  return Number.isFinite(price) ? price.toFixed(2) : "—";
}

function formatPct(value) {
  return Number.isFinite(value) ? `${value.toFixed(2)}%` : "—";
}

function formatPts(value) {
  return Number.isFinite(value) ? `${value.toFixed(1)} pts` : "—";
}

function buildPriceTrigger(alert, asset, type, isoTimestamp) {
  const comparator = type === "price_above" ? "≥" : "≤";
  return {
    alertId: alert.id,
    symbol: asset.symbol,
    type,
    level: "medium",
    title: "Alerte prix",
    detail: `${asset.symbol} à ${formatPrice(asset.price)} USD ${comparator} seuil ${alert.threshold}`,
    threshold: alert.threshold,
    observedValue: asset.price,
    triggeredAt: isoTimestamp,
  };
}

function buildChangeTrigger(alert, asset, type, isoTimestamp) {
  const comparator = type === "change_pct_above" ? "≥" : "≤";
  return {
    alertId: alert.id,
    symbol: asset.symbol,
    type,
    level: "medium",
    title: "Alerte variation",
    detail: `${asset.symbol} varie ${formatPct(asset.changePct)} ${comparator} seuil ${alert.threshold}%`,
    threshold: alert.threshold,
    observedValue: asset.changePct,
    triggeredAt: isoTimestamp,
  };
}

function buildDriftTrigger(alert, asset, isoTimestamp) {
  const drift = asset.positionMetrics?.targetDrift ?? 0;
  return {
    alertId: alert.id,
    symbol: asset.symbol,
    type: "drift_above",
    level: "high",
    title: "Alerte drift allocation",
    detail: `${asset.symbol} dérive de ${formatPts(drift)} (seuil ${alert.threshold} pts)`,
    threshold: alert.threshold,
    observedValue: drift,
    triggeredAt: isoTimestamp,
  };
}

export function evaluateAlerts(alerts, assets, isoTimestamp = new Date().toISOString()) {
  if (!Array.isArray(alerts) || !alerts.length) return [];
  if (!Array.isArray(assets) || !assets.length) return [];

  const enriched = enrichAssetsWithPositionMetrics(assets);
  const bySymbol = new Map(enriched.map((asset) => [asset.symbol, asset]));
  const triggers = [];

  alerts.forEach((alert) => {
    if (!alert?.enabled) return;
    if (!Number.isFinite(alert.threshold)) return;

    if (alert.type === "drift_above") {
      const candidates = alert.symbol
        ? [bySymbol.get(alert.symbol)].filter(Boolean)
        : enriched;
      const most = candidates.reduce((max, asset) => {
        const drift = Math.abs(asset.positionMetrics?.targetDrift ?? 0);
        if (!max || drift > Math.abs(max.positionMetrics?.targetDrift ?? 0)) return asset;
        return max;
      }, null);
      if (!most) return;
      if (Math.abs(most.positionMetrics?.targetDrift ?? 0) >= alert.threshold) {
        triggers.push(buildDriftTrigger(alert, most, isoTimestamp));
      }
      return;
    }

    const asset = bySymbol.get(alert.symbol);
    if (!asset) return;

    if (alert.type === "price_above" && Number.isFinite(asset.price) && asset.price >= alert.threshold) {
      triggers.push(buildPriceTrigger(alert, asset, "price_above", isoTimestamp));
      return;
    }
    if (alert.type === "price_below" && Number.isFinite(asset.price) && asset.price <= alert.threshold) {
      triggers.push(buildPriceTrigger(alert, asset, "price_below", isoTimestamp));
      return;
    }
    if (alert.type === "change_pct_above" && Number.isFinite(asset.changePct) && asset.changePct >= alert.threshold) {
      triggers.push(buildChangeTrigger(alert, asset, "change_pct_above", isoTimestamp));
      return;
    }
    if (alert.type === "change_pct_below" && Number.isFinite(asset.changePct) && asset.changePct <= alert.threshold) {
      triggers.push(buildChangeTrigger(alert, asset, "change_pct_below", isoTimestamp));
    }
  });

  return triggers;
}
