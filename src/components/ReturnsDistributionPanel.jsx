import { useEffect, useState } from "react";
import { BarChart3, RefreshCw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import ChartErrorBoundary from "./ChartErrorBoundary";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeReturns } from "../utils/returnsCalculator";
import { computeDistribution } from "../utils/returnsDistribution";
import { formatPct, returnTone, formatMonthLabel, formatRatio } from "../utils/returnsFormatters";

// Distribution des rendements mensuels (P4.10). Feature de catalogue distincte de
// la matrice P4.1 (activable / positionnable séparément) : part de mois positifs,
// meilleur / pire mois, dispersion, forme (asymétrie / aplatissement) et un
// histogramme. Dérivée de la même série de prix factuelle (/api/history) que la
// matrice — réutilise computeReturns().monthly, aucune nouvelle source serveur.
// Périodes/mesures hors-portée masquées, jamais inventées.
const HISTORY_DAYS = 1825;

export default function ReturnsDistributionPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset.symbol,
    status: "loading",
    data: null,
    source: null,
    error: null,
  });

  if (state.symbol !== asset.symbol) {
    setState({ symbol: asset.symbol, status: "loading", data: null, source: null, error: null });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchPriceHistory(asset.symbol, { days: HISTORY_DAYS })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const returns = computeReturns(payload.points);
        const data = returns ? computeDistribution(returns.monthly) : null;
        if (!data) {
          setState({ symbol: asset.symbol, status: "error", data: null, source: payload.source, error: "insufficient" });
          return;
        }
        setState({ symbol: asset.symbol, status: "ready", data, source: payload.source, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setState({ symbol: asset.symbol, status: "error", data: null, source: null, error: "network" });
      });

    return () => controller.abort();
  }, [asset.symbol]);

  const { status, data, source } = state;

  return (
    <div className="mt-4 p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Distribution des rendements">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Distribution des rendements — {asset.symbol}</span>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Analyse de la distribution
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="text-sm font-medium text-amber-400">Distribution indisponible</div>
          <div className="text-xs text-slate-500 mt-1">
            Pas assez de rendements mensuels pour ce titre. Les statistiques sont masquées pour éviter d'afficher des valeurs simulées.
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Mois positifs</div>
              <div className="text-sm font-semibold text-white">
                {formatPct(data.positiveMonthsPct)} <span className="text-slate-500">({data.count} mois)</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Rendement mensuel moyen</div>
              <div className={`text-sm font-semibold ${returnTone(data.averagePct)}`}>{formatPct(data.averagePct) ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Meilleur mois</div>
              <div className="text-sm font-semibold text-emerald-400">
                {formatPct(data.bestMonth.returnPct)} <span className="text-slate-500">{formatMonthLabel(data.bestMonth.month) ?? data.bestMonth.month}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Pire mois</div>
              <div className="text-sm font-semibold text-rose-400">
                {formatPct(data.worstMonth.returnPct)} <span className="text-slate-500">{formatMonthLabel(data.worstMonth.month) ?? data.worstMonth.month}</span>
              </div>
            </div>
          </div>

          <ChartErrorBoundary>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.histogram} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 9 }} interval={0} angle={-30} textAnchor="end" height={48} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} width={28} />
                <ChartTooltip
                  cursor={{ fill: "rgba(255,255,255,0.04)" }}
                  contentStyle={{ background: "#151d35", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12 }}
                  formatter={(value) => [`${value} mois`, "Compte"]}
                />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {/* tranches 0-3 = rendements négatifs (rose), 4-7 = positifs (emerald) */}
                  {data.histogram.map((bucket, index) => (
                    <Cell key={bucket.label} fill={index >= 4 ? "#34d399" : "#fb7185"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartErrorBoundary>

          {/* Mesures de forme — avancées, masquées si non calculables */}
          {(data.skewness != null || data.kurtosis != null) && (
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <div className="text-[11px] text-slate-500">Asymétrie (skewness)</div>
                <div className="text-sm font-semibold text-white">{formatRatio(data.skewness) ?? "—"}</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500">Aplatissement (kurtosis excès)</div>
                <div className="text-sm font-semibold text-white">{formatRatio(data.kurtosis) ?? "—"}</div>
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            Distribution des rendements de prix mensuels (hors dividendes réinvestis), dérivée de l'historique factuel.
            {source ? ` Source ${source}.` : ""}
          </div>
        </div>
      )}
    </div>
  );
}
