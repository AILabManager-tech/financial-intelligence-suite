import { Brain, BarChart3, ArrowUpRight, ArrowDownRight, X, Lightbulb, AlertTriangle } from "lucide-react";
import ScoreGauge from "./ScoreGauge";
import Tooltip from "./Tooltip";
import { getScoreColor, confidenceToText, formatCurrency } from "../utils/scoreTranslator";
import { LineChart, Line, ResponsiveContainer, Tooltip as ChartTooltip, YAxis } from "recharts";
import ChartErrorBoundary from "./ChartErrorBoundary";

export default function IntelligenceCard({ asset, onClose }) {
  if (!asset) return null;

  const { deterministic: det, aiAnalysis: ai, earnings, history = [] } = asset;
  const isUp = asset.changePct >= 0;
  const chartData = history.map((v, i) => ({ day: i + 1, score: v }));

  return (
    <div className="animate-slide-up" role="region" aria-label={`Analyse de ${asset.symbol}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <ScoreGauge score={asset.score} size={72} />
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">
              {asset.symbol} <span className="text-sm sm:text-base font-normal text-slate-400">— {asset.name}</span>
            </h2>
            <div className="flex items-center gap-2 sm:gap-3 mt-1 flex-wrap">
              <span className="text-lg sm:text-xl font-semibold text-white">
                ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
              <span className={`flex items-center text-sm font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                {isUp ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getScoreColor(asset.score).bg} ${getScoreColor(asset.score).text}`}>
                {asset.recommendation}
              </span>
            </div>
          </div>
        </div>
        <button onClick={onClose} aria-label="Fermer l'analyse" className="p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer flex-shrink-0">
          <X className="w-5 h-5 text-slate-400" />
        </button>
      </div>

      {/* AI Verdict */}
      <div className="p-4 rounded-xl bg-violet-500/8 border border-violet-500/20 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-violet-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-violet-300">Pourquoi l'IA recommande cet actif</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">{asset.aiVerdict}</p>
      </div>

      {/* Two columns: Deterministic vs AI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Deterministic */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-blue-500/15">
              <BarChart3 className="w-4 h-4 text-blue-400" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-white">Analyse des Chiffres</span>
            <span className="ml-auto text-xs text-slate-500">Données quantitatives</span>
          </div>

          <div className="space-y-3">
            {[
              { label: "Force du marché", term: "rsi", value: det.rsiSignal },
              { label: "Tendance", term: "macd", value: det.macd },
              { label: "Volatilité", term: "bollinger", value: det.bollinger },
              { label: "Moyennes mobiles", term: "movingAvg", value: det.movingAvg },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <Tooltip term={item.term}>
                  <span className="text-xs text-slate-400">{item.label}</span>
                </Tooltip>
                <span className="text-xs font-medium text-slate-200">{item.value}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <Tooltip term="signalScore">
              <span className="text-xs text-slate-500">Score quantitatif</span>
            </Tooltip>
            <span className={`text-lg font-bold ${getScoreColor(det.signalScore).text}`}>{det.signalScore}/100</span>
          </div>
        </div>

        {/* AI Analysis */}
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-1.5 rounded-md bg-violet-500/15">
              <Brain className="w-4 h-4 text-violet-400" aria-hidden="true" />
            </div>
            <span className="text-sm font-semibold text-white">Avis de l'Analyste IA</span>
            <Tooltip term="confidence">
              <span className="ml-auto text-xs text-slate-500">{confidenceToText(ai.confidence)}</span>
            </Tooltip>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Lightbulb className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
              <span className="text-xs font-medium text-emerald-400">Points forts</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ai.keyFactors.map((f) => (
                <span key={f} className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px]">{f}</span>
              ))}
            </div>
          </div>

          <div className="mb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
              <span className="text-xs font-medium text-amber-400">Risques identifiés</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ai.risks.map((r) => (
                <span key={r} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[11px]">{r}</span>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
            <Tooltip term="decisionScore">
              <span className="text-xs text-slate-500">Score IA</span>
            </Tooltip>
            <span className={`text-lg font-bold ${getScoreColor(ai.decisionScore).text}`}>{ai.decisionScore}/100</span>
          </div>
        </div>
      </div>

      {/* Score trend mini-chart + Earnings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <span className="text-xs text-slate-500 mb-2 block">Évolution du score (10 derniers jours)</span>
          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={chartData}>
                <YAxis domain={["dataMin - 5", "dataMax + 5"]} hide />
                <ChartTooltip
                  contentStyle={{ background: "#151d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  labelFormatter={(v) => `Jour ${v}`}
                  formatter={(v) => [`${v}/100`, "Score"]}
                />
                <Line type="monotone" dataKey="score" stroke={getScoreColor(asset.score).ring} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>
        </div>

        <div className="p-4 rounded-xl bg-surface-800 border border-white/5">
          <span className="text-xs text-slate-500 mb-3 block">Fondamentaux financiers</span>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Chiffre d'affaires", term: "revenue", value: formatCurrency(earnings.revenue) },
              { label: "Marge nette", term: "netMargin", value: `${earnings.netMargin}%` },
              { label: "Bénéfice/action", term: "eps", value: `$${earnings.eps}` },
              { label: "Croissance", term: "growth", value: earnings.growth },
            ].map((item) => (
              <div key={item.label}>
                <Tooltip term={item.term}>
                  <span className="text-[11px] text-slate-500">{item.label}</span>
                </Tooltip>
                <div className="text-sm font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
