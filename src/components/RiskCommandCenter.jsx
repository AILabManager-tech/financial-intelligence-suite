import { Activity, Layers3, ShieldAlert, WalletCards, Repeat2 } from "lucide-react";
import { calculatePortfolioAnalytics } from "../utils/portfolioAnalytics";
import { formatCurrency, formatPercent } from "../utils/scoreTranslator";

function Metric({ icon, label, value, caption, tone = "text-white" }) {
  const Icon = icon;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-slate-400" aria-hidden="true" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] text-slate-500 mt-1">{caption}</div>
    </div>
  );
}

export default function RiskCommandCenter({ assets }) {
  const analytics = calculatePortfolioAnalytics(assets);
  const topExposure = analytics.sectorExposure.slice(0, 4);
  const pnlTone = analytics.unrealizedPnl >= 0 ? "text-emerald-400" : "text-rose-400";
  const liveCount = assets.filter((asset) => asset.marketData?.status === "live").length;

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-rose-500/10">
          <ShieldAlert className="w-5 h-5 text-rose-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Portefeuille factuel</h2>
        <span className="ml-auto text-xs text-slate-500">Prix et positions sourcés</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mb-4">
        <Metric
          icon={WalletCards}
          label="Valeur portefeuille"
          value={formatCurrency(analytics.totalMarketValue)}
          caption={`${formatPercent(analytics.unrealizedPnlPct)} latent`}
          tone={pnlTone}
        />
        <Metric
          icon={Layers3}
          label="Concentration max"
          value={`${analytics.topSector.weight.toFixed(0)}%`}
          caption={analytics.topSector.sector}
          tone={analytics.topSector.weight >= 45 ? "text-amber-400" : "text-emerald-400"}
        />
        <Metric
          icon={Activity}
          label="Quotes reçues"
          value={`${liveCount}/${assets.length}`}
          caption="Données marché live/fallback"
          tone={liveCount === assets.length ? "text-emerald-400" : "text-amber-400"}
        />
        <Metric icon={Repeat2} label="Rééquilibrages" value={analytics.rebalanceActions.length} caption="Écart > 1% du portefeuille" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_1fr] gap-4">
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="text-xs font-medium text-slate-400 mb-3">Exposition sectorielle</div>
          <div className="space-y-3">
            {topExposure.map((item) => (
              <div key={item.sector}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-300">{item.sector}</span>
                  <span className="text-xs font-semibold text-white">{formatCurrency(item.marketValue)} · {item.weight.toFixed(0)}%</span>
                </div>
                <div className="h-2 rounded-full bg-surface-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-400"
                    style={{ width: `${item.weight}%` }}
                    aria-hidden="true"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mb-3">
            <Repeat2 className="w-3.5 h-3.5" aria-hidden="true" />
            Rééquilibrage suggéré
          </div>
          <div className="space-y-2">
            {analytics.rebalanceActions.slice(0, 4).map((action) => (
              <div key={action.symbol} className="flex items-center justify-between gap-3 py-2 border-b border-white/5 last:border-0">
                <div>
                  <div className="text-sm font-medium text-white">{action.symbol}</div>
                  <div className="text-[11px] text-slate-500">
                    {action.currentWeight.toFixed(1)}% vers {action.targetWeight.toFixed(1)}%
                  </div>
                </div>
                <div className={action.action === "Acheter" ? "text-right text-emerald-400" : "text-right text-amber-400"}>
                  <div className="text-xs font-semibold">{action.action}</div>
                  <div className="text-[11px]">{formatCurrency(Math.abs(action.tradeValue))}</div>
                </div>
              </div>
            ))}
            {!analytics.rebalanceActions.length && (
              <div className="text-xs text-slate-500">Aucune action au-dessus du seuil de 1%.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
