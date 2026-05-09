function sectorFamily(sector = "") {
  return sector.split("—")[0].trim() || "Non classé";
}

function average(values) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function standardDeviation(values) {
  if (values.length < 2) return 0;
  const mean = average(values);
  const variance = average(values.map((value) => (value - mean) ** 2));
  return Math.sqrt(variance);
}

function maxDrawdown(values) {
  if (!values.length) return 0;
  let peak = values[0];
  let drawdown = 0;

  values.forEach((value) => {
    peak = Math.max(peak, value);
    if (peak > 0) {
      drawdown = Math.min(drawdown, (value - peak) / peak);
    }
  });

  return drawdown * 100;
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

function statusFromRisk(riskScore) {
  if (riskScore >= 75) return "Critique";
  if (riskScore >= 55) return "Élevé";
  if (riskScore >= 35) return "Modéré";
  return "Contrôlé";
}

function scoreRiskLabel(score) {
  if (score >= 75) return "Critique";
  if (score >= 55) return "Élevé";
  if (score >= 35) return "Modéré";
  return "Faible";
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
  const scoredAssets = enrichedAssets.filter((asset) => Number.isFinite(asset.score));
  const weakAssets = scoredAssets.filter((asset) => asset.score < 70);
  const highConviction = scoredAssets.filter((asset) => asset.score >= 85);
  const weightedScore = scoredAssets.reduce((sum, asset) => sum + asset.score * (asset.positionMetrics.weight / 100), 0);
  const avgScore = Math.round(weightedScore || average(scoredAssets.map((asset) => asset.score)));
  const scoreVolatility = average(scoredAssets.map((asset) => standardDeviation(asset.history || [])));
  const drawdown = average(scoredAssets.map((asset) => Math.abs(maxDrawdown(asset.history || []))));
  const integrityFailures = enrichedAssets.filter((asset) => asset.integrity && !asset.integrity.verified).length;
  const driftedAssets = enrichedAssets
    .filter((asset) => Math.abs(asset.positionMetrics.targetDrift) >= 2.5)
    .sort((a, b) => Math.abs(b.positionMetrics.targetDrift) - Math.abs(a.positionMetrics.targetDrift));
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

  const concentrationRisk = Math.max(0, topSector.weight - 35) * 1.3;
  const qualityRisk = Math.max(0, 78 - avgScore) * 1.2;
  const weakAssetRisk = weakAssets.reduce((sum, asset) => sum + asset.positionMetrics.weight, 0) * 0.35;
  const driftRisk = driftedAssets.reduce((sum, asset) => sum + Math.abs(asset.positionMetrics.targetDrift), 0) * 0.6;
  const volatilityRisk = Math.min(20, scoreVolatility * 3);
  const drawdownRisk = Math.min(20, drawdown * 2);
  const integrityRisk = integrityFailures * 10;
  const riskScore = Math.round(Math.min(100, concentrationRisk + qualityRisk + weakAssetRisk + driftRisk + volatilityRisk + drawdownRisk + integrityRisk));

  const alerts = [];

  if (topSector.weight >= 45) {
    alerts.push({
      level: "high",
      title: "Concentration sectorielle",
      detail: `${topSector.sector} représente ${topSector.weight.toFixed(0)}% de la valeur de marché.`,
    });
  }

  if (weakAssets.length > 0) {
    alerts.push({
      level: weakAssets.length >= 2 ? "high" : "medium",
      title: "Actifs à revoir",
      detail: `${weakAssets.map((asset) => asset.symbol).join(", ")} sous le seuil opérateur de 70.`,
    });
  }

  if (driftedAssets.length > 0) {
    alerts.push({
      level: "medium",
      title: "Rééquilibrage requis",
      detail: `${driftedAssets.slice(0, 3).map((asset) => asset.symbol).join(", ")} à plus de 2,5 pts de leur cible.`,
    });
  }

  if (scoreVolatility >= 3.5) {
    alerts.push({
      level: "medium",
      title: "Volatilité du scoring",
      detail: `Écart-type moyen ${scoreVolatility.toFixed(1)} pts sur 10 jours.`,
    });
  }

  if (!alerts.length) {
    alerts.push({
      level: "low",
      title: "Aucune alerte critique",
      detail: "Le profil agrégé reste dans les seuils opérateur actuels.",
    });
  }

  return {
    methodology: "market-value-weighted",
    totalMarketValue,
    totalCost,
    unrealizedPnl,
    unrealizedPnlPct,
    enrichedAssets,
    avgScore,
    riskScore,
    riskLabel: statusFromRisk(riskScore),
    scoreVolatility,
    maxDrawdown: drawdown,
    topSector,
    sectorExposure,
    weakAssets,
    highConviction,
    driftedAssets,
    rebalanceActions,
    alerts,
  };
}

export function buildStressScenarios(analytics) {
  const concentrationPenalty = Math.max(0, analytics.topSector.weight - 35) * 0.18;
  const fragilityPenalty = analytics.weakAssets.length * 1.5;
  const volatilityPenalty = analytics.scoreVolatility * 0.7;

  return [
    {
      name: "Taux +100 pb",
      impact: -(2.8 + concentrationPenalty + fragilityPenalty * 0.25),
      risk: scoreRiskLabel(analytics.riskScore),
    },
    {
      name: "Correction tech -12%",
      impact: -(4.5 + concentrationPenalty * 1.8 + fragilityPenalty),
      risk: analytics.topSector.sector === "Technologie" ? "Élevé" : scoreRiskLabel(analytics.riskScore),
    },
    {
      name: "Liquidité réduite",
      impact: -(2.2 + volatilityPenalty + fragilityPenalty * 0.6),
      risk: scoreRiskLabel(analytics.riskScore - 10),
    },
  ];
}
