import { useMemo } from "react";
import { TrendingUp, ArrowUpRight, ArrowDownRight, Sparkles } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import { getScoreColor, formatPercent } from "../utils/scoreTranslator";

export default function TopPerformers({ assets, onSelect }) {
  const top3 = useMemo(() => [...assets].sort((a, b) => b.score - a.score).slice(0, 3), [assets]);
  const medals = ["bg-gradient-to-br from-amber-400/20 to-amber-600/10 border-amber-500/30",
                  "bg-gradient-to-br from-slate-300/15 to-slate-500/5 border-slate-400/25",
                  "bg-gradient-to-br from-orange-400/15 to-orange-600/5 border-orange-500/20"];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-amber-500/10">
          <TrendingUp className="w-5 h-5 text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Meilleures Opportunités</h2>
        <span className="ml-auto text-xs text-slate-500 flex items-center gap-1">
          <Sparkles className="w-3 h-3" /> Analyse en temps réel
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {top3.map((asset, i) => {
          const { text: scoreText } = getScoreColor(asset.score);
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
                  <div className="text-xs text-slate-400 mt-0.5">{asset.sector}</div>
                </div>
                <ScoreGauge score={asset.score} size={56} showLabel={false} />
              </div>

              <div className="flex items-baseline gap-2 mb-3">
                <span className="text-2xl font-bold text-white">
                  ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
                <span className={`flex items-center text-sm font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                  {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  {formatPercent(asset.changePct)}
                </span>
              </div>

              <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getScoreColor(asset.score).bg} ${scoreText}`}>
                {asset.recommendation}
              </div>

              <p className="mt-3 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {asset.aiVerdict?.split(".")[0] ?? ""}.
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
