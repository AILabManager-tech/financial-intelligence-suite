import { useMemo } from "react";
import { Activity, AlertTriangle } from "lucide-react";
import { computeOperationalStats } from "../utils/operationalStats";
import { formatCount, formatDays, formatMultiple } from "../utils/operationalStatsFormatters";
import { formatPct, returnTone } from "../utils/returnsFormatters";
import { formatCurrency } from "../utils/scoreTranslator";

// Operational stats (P4.12). Dashboard catalog feature derived purely from the
// active mandate's entered transactions via the tax-lot engine — turnover, hit
// ratio, win/loss, average holding period, yield-on-cost. No market data, no
// snapshots: strictly factual. An empty mandate shows an honest empty state;
// trade metrics that need closed positions stay hidden ("—") until there are
// sells, rather than displaying a fabricated 0.

function StatTile({ label, value, tone }) {
  const shown = value ?? "—";
  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="text-xs text-slate-400 mb-1">{label}</div>
      <div className={`text-xl font-bold ${shown === "—" ? "text-slate-500" : tone ?? "text-white"}`}>{shown}</div>
    </div>
  );
}

export default function OperationalStatsPanel({ transactions = [], method = "fifo" }) {
  const stats = useMemo(() => computeOperationalStats(transactions, { method }), [transactions, method]);

  return (
    <div className="animate-slide-up" role="region" aria-label="Statistiques opérationnelles">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-emerald-500/10">
          <Activity className="w-5 h-5 text-emerald-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Statistiques opérationnelles</h2>
        <span className="ml-auto text-xs text-slate-500">Méthode {method.toUpperCase()}</span>
      </div>

      {!stats.hasData ? (
        <p className="text-xs text-slate-500">
          Aucune transaction saisie — les statistiques opérationnelles apparaîtront après vos premières
          opérations dans le journal.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
            <StatTile label="Transactions clôturées" value={formatCount(stats.closedCount)} />
            <StatTile label="Taux de réussite" value={formatPct(stats.hitRatioPct, { signed: false })} />
            <StatTile label="Ratio gain/perte" value={formatMultiple(stats.winLossRatio)} />
            <StatTile label="Détention moyenne" value={formatDays(stats.avgHoldingDays)} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatTile label="Rotation" value={formatPct(stats.turnoverPct, { signed: false })} />
            <StatTile label="Rendement sur coût" value={formatPct(stats.yieldOnCostPct, { signed: false })} />
            <StatTile
              label="P&L réalisé"
              value={stats.closedCount > 0 ? formatCurrency(stats.realizedPnl) : null}
              tone={returnTone(stats.realizedPnl)}
            />
            <StatTile label="Dividendes cumulés" value={stats.dividends > 0 ? formatCurrency(stats.dividends) : null} />
          </div>

          {stats.closedCount === 0 && (
            <p className="text-[11px] text-slate-500 mt-3">
              Aucune position clôturée — taux de réussite, ratio gain/perte et détention moyenne apparaîtront
              après vos premières ventes.
            </p>
          )}

          {stats.oversold > 0 && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[11px] text-amber-200/90">
                {formatCount(stats.oversold)} part(s) vendues au-delà des positions détenues — vérifier le
                journal de transactions.
              </p>
            </div>
          )}

          <p className="text-[11px] text-slate-500 mt-3">
            Dérivé des transactions saisies. Rotation = part du capital déployé (au coût) déjà revendu ·
            rendement sur coût = dividendes cumulés / coût des positions ouvertes. Pas un conseil.
          </p>
        </>
      )}
    </div>
  );
}
