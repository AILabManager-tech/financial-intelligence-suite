import { useMemo } from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Clock } from "lucide-react";
import { formatPercent } from "../utils/scoreTranslator";

export default function TopPerformers({ assets, onSelect }) {
  const top3 = useMemo(() => [...assets].sort((a, b) => b.changePct - a.changePct).slice(0, 3), [assets]);
  const medals = ["bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-amber-500/30",
                  "bg-gradient-to-br from-slate-300/15 to-slate-500/5 border-slate-400/25",
                  "bg-gradient-to-br from-orange-400/15 to-orange-600/5 border-orange-500/20"];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Plus fortes hausses</h2>
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Prix sourcés
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((asset, i) => {
          const isUp = asset.changePct >= 0;

          return (
            <button
              key={asset.symbol}
              onClick={() => onSelect(asset)}
              className={`relative p-5 rounded-2xl border ${medals[i]} backdrop-blur-sm text-left transition-all hover:scale-[1.02] hover:shadow-lg hover:shadow-black/20 cursor-pointer group`}
            >
              {i === 0 && (
                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-amber-500 text-black text-[10px] font-bold rounded-full uppercase tracking-wider">
                  #1
                </div>
              )}

              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                    {asset.symbol}
                  </div>
                  <div className="text-sm text-slate-300 mt-0.5 line-clamp-1">{asset.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{asset.sector}</div>
                </div>
                <div className="text-right text-[11px] text-slate-500">
                  <div>{asset.marketData?.source ?? "source externe"}</div>
                  <div>{asset.marketData?.asOf ? new Date(asset.marketData.asOf).toLocaleDateString("fr-CA") : "temps réel"}</div>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-2xl font-bold text-white">
                  ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-sm font-bold ${isUp ? "bg-emerald-500/25 text-emerald-300" : "bg-rose-500/25 text-rose-300"}`}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(asset.changePct)}
                </span>
                <span className={`text-sm font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? "+" : "-"}${Math.abs(asset.change).toFixed(2)}
                </span>
              </div>

              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${isUp ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
                Variation journalière
              </div>

              <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                Donnée de marché externe: prix, variation et horodatage fournis par l'API de quotes.
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
