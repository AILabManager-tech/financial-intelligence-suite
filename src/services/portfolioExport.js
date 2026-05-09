import { enrichAssetsWithPositionMetrics } from "../utils/portfolioAnalytics";

const exportColumns = [
  "symbol",
  "name",
  "sector",
  "quantity",
  "averageCost",
  "price",
  "marketValue",
  "costValue",
  "unrealizedPnl",
  "unrealizedPnlPct",
  "weight",
  "targetWeight",
  "targetDrift",
  "source",
  "asOf",
];

function csvCell(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function buildPortfolioExportRows(assets) {
  return enrichAssetsWithPositionMetrics(assets).map((asset) => ({
    symbol: asset.symbol,
    name: asset.name,
    sector: asset.sector,
    quantity: asset.position?.quantity ?? 0,
    averageCost: asset.position?.averageCost ?? 0,
    price: asset.price,
    marketValue: asset.positionMetrics.marketValue,
    costValue: asset.positionMetrics.costValue,
    unrealizedPnl: asset.positionMetrics.unrealizedPnl,
    unrealizedPnlPct: asset.positionMetrics.unrealizedPnlPct,
    weight: asset.positionMetrics.weight,
    targetWeight: asset.positionMetrics.targetWeight,
    targetDrift: asset.positionMetrics.targetDrift,
    source: asset.marketData?.source,
    asOf: asset.marketData?.asOf,
  }));
}

export function buildPortfolioCsv(assets) {
  const rows = buildPortfolioExportRows(assets);
  return [
    exportColumns.join(","),
    ...rows.map((row) => exportColumns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

export function buildPortfolioJson(assets) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    assets: buildPortfolioExportRows(assets),
  }, null, 2);
}

export function downloadTextFile(filename, mimeType, content) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
