import { enrichAssetsWithPositionMetrics } from "./portfolioAnalytics";

export function buildOperatorAlerts(assets, options = {}) {
  const variationThresholdPct = options.variationThresholdPct ?? 5;
  const driftThresholdPct = options.driftThresholdPct ?? 5;
  const enrichedAssets = enrichAssetsWithPositionMetrics(assets);
  const alerts = [];

  enrichedAssets.forEach((asset) => {
    if (asset.marketData?.status === "stale") {
      alerts.push({
        id: `${asset.symbol}:stale`,
        level: "high",
        type: "source_stale",
        symbol: asset.symbol,
        title: "Donnée stale",
        detail: `${asset.symbol} n'a pas une quote fraîche selon l'horodatage marché.`,
      });
    }

    if (Math.abs(asset.changePct ?? 0) >= variationThresholdPct) {
      alerts.push({
        id: `${asset.symbol}:variation`,
        level: "medium",
        type: "price_variation",
        symbol: asset.symbol,
        title: "Variation importante",
        detail: `${asset.symbol} varie de ${asset.changePct.toFixed(2)}% sur la dernière séance.`,
      });
    }

    if (Math.abs(asset.positionMetrics.targetDrift) >= driftThresholdPct) {
      alerts.push({
        id: `${asset.symbol}:drift`,
        level: "medium",
        type: "allocation_drift",
        symbol: asset.symbol,
        title: "Drift allocation",
        detail: `${asset.symbol} est à ${asset.positionMetrics.targetDrift.toFixed(1)} pts de sa cible.`,
      });
    }
  });

  return alerts.sort((a, b) => {
    const rank = { high: 0, medium: 1, low: 2 };
    return rank[a.level] - rank[b.level] || a.symbol.localeCompare(b.symbol);
  });
}
