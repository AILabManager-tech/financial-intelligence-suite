// Mandate report builder (P6.1) — pure. Assembles the factual sections of a
// client report from data already in the app (positions, snapshots,
// transactions): summary, holdings, time-weighted return, realized gains by
// year. The benchmark comparison needs an async price fetch, so the view
// computes it separately and passes it through. Sector attribution (Brinson,
// P4.9) is blocked-on-data and deliberately absent — never fabricated.
//
// No network here, deterministic (asOf is injected, not read from the clock).
import { enrichAssetsWithPositionMetrics } from "./portfolioAnalytics";
import { computeTimeWeightedReturn } from "./timeWeightedReturn";
import { computeRealizedGainsByYear } from "./taxRealizedGains";
import { ACCOUNT_LABEL } from "./usWithholding";

export function buildMandateReport({ mandate = {}, assets = [], snapshots = [], transactions = [], asOf = null, method = "fifo" } = {}) {
  const enriched = enrichAssetsWithPositionMetrics(assets).filter(
    (a) => Number(a.position?.quantity) > 0,
  );

  const positions = enriched
    .map((a) => ({
      symbol: a.symbol,
      name: a.name,
      quantity: a.position?.quantity ?? 0,
      averageCost: a.position?.averageCost ?? 0,
      price: a.price,
      marketValue: a.positionMetrics.marketValue,
      costValue: a.positionMetrics.costValue,
      unrealizedPnl: a.positionMetrics.unrealizedPnl,
      unrealizedPnlPct: a.positionMetrics.unrealizedPnlPct,
      weight: a.positionMetrics.weight,
    }))
    .sort((a, b) => b.marketValue - a.marketValue);

  const totalMarketValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = positions.reduce((s, p) => s + p.costValue, 0);
  const unrealizedPnl = totalMarketValue - totalCost;

  const summary = {
    mandateName: mandate.name ?? "Mandat",
    client: mandate.client || null,
    accountTypeLabel: ACCOUNT_LABEL[mandate.accountType] ?? null,
    baseCurrency: mandate.baseCurrency ?? "USD",
    asOf,
    positionsCount: positions.length,
    totalMarketValue,
    totalCost,
    unrealizedPnl,
    unrealizedPnlPct: totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : null,
  };

  return {
    summary,
    positions,
    twr: computeTimeWeightedReturn(snapshots, transactions),
    realized: computeRealizedGainsByYear(transactions, { method }),
  };
}
