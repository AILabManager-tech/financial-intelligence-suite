import { getSectorFamily } from "./portfolioAnalytics";

// Portfolio concentration & diversification (P5.x) — pure, derived strictly from
// the held positions (market value = quantity × price), no API and no snapshot.
// Surfaces what RiskCommandCenter's 4-sector teaser does not: holding-level
// concentration (largest position, top-5), the Herfindahl-Hirschman index (HHI)
// and the effective number of holdings (1 / Σ wᵢ²), plus full sector spread.
//
// HHI is on the standard 0–10000 percentage-point scale (Σ of squared percent
// weights): the DOJ/FTC bands — < 1500 diversified, 1500–2500 moderate, > 2500
// concentrated — are factual thresholds, not advice. Factuality: a value-less
// portfolio returns hasData:false so the panel shows an honest empty state.

const HHI_DIVERSIFIED_MAX = 1500;
const HHI_MODERATE_MAX = 2500;

function bandOf(hhi) {
  if (hhi < HHI_DIVERSIFIED_MAX) return "diversified";
  if (hhi <= HHI_MODERATE_MAX) return "moderate";
  return "concentrated";
}

function marketValueOf(asset) {
  const quantity = Number(asset?.position?.quantity);
  const price = Number(asset?.price);
  if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
  return quantity > 0 && price > 0 ? quantity * price : 0;
}

export function computePortfolioConcentration(assets) {
  const list = Array.isArray(assets) ? assets : [];

  const holdings = list
    .map((asset) => ({
      symbol: String(asset?.symbol ?? "").trim().toUpperCase(),
      sector: getSectorFamily(asset?.sector ?? ""),
      marketValue: marketValueOf(asset),
    }))
    .filter((h) => h.symbol && h.marketValue > 0);

  const total = holdings.reduce((sum, h) => sum + h.marketValue, 0);
  if (holdings.length === 0 || total <= 0) return { hasData: false };

  const weighted = holdings
    .map((h) => ({ ...h, weightPct: (h.marketValue / total) * 100 }))
    .sort((a, b) => b.weightPct - a.weightPct);

  // Sector families aggregated by market value, sorted by weight desc.
  const sectorMap = new Map();
  for (const h of weighted) {
    sectorMap.set(h.sector, (sectorMap.get(h.sector) ?? 0) + h.marketValue);
  }
  const sectors = [...sectorMap.entries()]
    .map(([sector, value]) => ({ sector, weightPct: (value / total) * 100 }))
    .sort((a, b) => b.weightPct - a.weightPct);

  const hhi = weighted.reduce((sum, h) => sum + h.weightPct * h.weightPct, 0);
  const top5Pct = weighted.slice(0, 5).reduce((sum, h) => sum + h.weightPct, 0);

  return {
    hasData: true,
    positionsCount: weighted.length,
    sectorsCount: sectors.length,
    topHolding: { symbol: weighted[0].symbol, weightPct: weighted[0].weightPct },
    top5Pct,
    topSector: sectors[0],
    hhi,
    effectiveHoldings: hhi > 0 ? 10000 / hhi : null,
    band: bandOf(hhi),
    holdings: weighted,
    sectors,
  };
}
