function sectorFamily(sector = "") {
  return sector.split("—")[0].trim() || "Non classé";
}

function marketValue(asset) {
  const quantity = asset.position?.quantity ?? 1;
  return quantity * asset.price;
}

function costValue(asset) {
  const quantity = asset.position?.quantity ?? 1;
  const averageCost = asset.position?.averageCost ?? asset.price;
  return quantity * averageCost;
}

function rebalanceAction(tradeValue) {
  if (tradeValue > 0) return "Acheter";
  if (tradeValue < 0) return "Vendre";
  return "Maintenir";
}

export function getSectorFamily(sector) {
  return sectorFamily(sector);
}

export function enrichAssetsWithPositionMetrics(assets) {
  const totalMarketValue = assets.reduce((sum, asset) => sum + marketValue(asset), 0) || 1;

  return assets.map((asset) => {
    const value = marketValue(asset);
    const cost = costValue(asset);
    const weight = (value / totalMarketValue) * 100;
    const targetWeight = asset.position?.targetWeight ?? weight;
    const unrealizedPnl = value - cost;
    const unrealizedPnlPct = cost > 0 ? (unrealizedPnl / cost) * 100 : 0;

    return {
      ...asset,
      positionMetrics: {
        marketValue: value,
        costValue: cost,
        weight,
        targetWeight,
        targetDrift: weight - targetWeight,
        unrealizedPnl,
        unrealizedPnlPct,
      },
    };
  });
}

export function calculatePortfolioAnalytics(assets) {
  const enrichedAssets = enrichAssetsWithPositionMetrics(assets);
  const totalMarketValue = enrichedAssets.reduce((sum, asset) => sum + asset.positionMetrics.marketValue, 0);
  const totalCost = enrichedAssets.reduce((sum, asset) => sum + asset.positionMetrics.costValue, 0);
  const unrealizedPnl = totalMarketValue - totalCost;
  const unrealizedPnlPct = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;

  const sectors = enrichedAssets.reduce((acc, asset) => {
    const family = sectorFamily(asset.sector);
    acc[family] = acc[family] || { count: 0, value: 0 };
    acc[family].count += 1;
    acc[family].value += asset.positionMetrics.marketValue;
    return acc;
  }, {});

  const sectorExposure = Object.entries(sectors)
    .map(([sector, exposure]) => ({
      sector,
      count: exposure.count,
      marketValue: exposure.value,
      weight: totalMarketValue > 0 ? (exposure.value / totalMarketValue) * 100 : 0,
    }))
    .sort((a, b) => b.weight - a.weight);

  const topSector = sectorExposure[0] || { sector: "Non classé", count: 0, marketValue: 0, weight: 0 };

  const rebalanceActions = enrichedAssets
    .map((asset) => {
      const targetValue = totalMarketValue * (asset.positionMetrics.targetWeight / 100);
      const tradeValue = targetValue - asset.positionMetrics.marketValue;

      return {
        symbol: asset.symbol,
        action: rebalanceAction(Math.round(tradeValue)),
        tradeValue,
        targetWeight: asset.positionMetrics.targetWeight,
        currentWeight: asset.positionMetrics.weight,
      };
    })
    .filter((action) => Math.abs(action.tradeValue) >= totalMarketValue * 0.01)
    .sort((a, b) => Math.abs(b.tradeValue) - Math.abs(a.tradeValue));

  return {
    totalMarketValue,
    totalCost,
    unrealizedPnl,
    unrealizedPnlPct,
    topSector,
    sectorExposure,
    rebalanceActions,
  };
}
