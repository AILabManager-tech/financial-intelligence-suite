import { memo } from "react";
import { Globe, TrendingUp, TrendingDown, Minus } from "lucide-react";

const trendIcon = (trend) => {
  if (trend.includes("expansion") || trend.includes("hausse")) return <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />;
  if (trend.includes("baisse") || trend.includes("contraction")) return <TrendingDown className="w-3.5 h-3.5 text-rose-400" />;
  return <Minus className="w-3.5 h-3.5 text-slate-400" />;
};

const trendColor = (change) => {
  if (change.startsWith("+")) return "text-emerald-400";
  if (change.startsWith("-")) return "text-rose-400";
  return "text-slate-400";
};

export default memo(function MarketPulse({ macro }) {
  const indicators = [
    { key: "gdp", label: "PIB (Mds $)", value: macro.gdp.value.toLocaleString("en-US"), ...macro.gdp },
    { key: "fedRate", label: "Taux Fed (%)", value: macro.fedRate.value.toFixed(2), ...macro.fedRate },
    { key: "cpi", label: "Inflation (CPI)", value: macro.cpi.value.toFixed(1), ...macro.cpi },
    { key: "unemployment", label: "Chômage (%)", value: macro.unemployment.value.toFixed(1), ...macro.unemployment },
  ];

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Globe className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Pouls du Marché</h2>
        <span className="ml-auto text-xs text-slate-500">Données macroéconomiques</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {indicators.map((ind) => (
          <div key={ind.key} className="p-4 rounded-xl bg-surface-800 border border-white/5">
            <div className="text-xs text-slate-400 mb-2">{ind.label}</div>
            <div className="text-xl font-bold text-white">{ind.value}</div>
            <div className="flex items-center gap-1.5 mt-2">
              {trendIcon(ind.trend.toLowerCase())}
              <span className="text-xs text-slate-400">{ind.trend}</span>
              <span className={`text-xs font-medium ml-auto ${trendColor(ind.change)}`}>{ind.change}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
})
