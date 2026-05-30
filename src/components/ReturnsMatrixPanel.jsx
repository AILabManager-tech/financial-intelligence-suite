import { useEffect, useState } from "react";
import { LineChart, RefreshCw } from "lucide-react";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeReturns } from "../utils/returnsCalculator";
import { formatPct, returnTone, formatMonthLabel } from "../utils/returnsFormatters";

// Matrice de rendements standards (P4.1). Première feature analytique de la
// Phase 4 : rendement cumulé, CAGR, matrice par période (1M → origine) et
// rendements mensuels — tous DÉRIVÉS de la série de prix factuelle (/api/history).
// Aucune valeur inventée : une période hors de la portée des données est masquée
// (tiret), jamais un 0. Rendements de prix (hors dividendes réinvestis), affiché
// honnêtement dans le pied du panneau. Réutilise l'endpoint history existant,
// comme SimulationPanel — pas de nouvelle source de données.
//
// Fenêtre demandée : ~5 ans de quotidien (days=1825) — la source quotidienne
// renvoie la plus longue série disponible (~18 mois en free tier, plafond
// confirmé en dogfood ; bien plus riche que la voie hebdo "5Y" qui plafonne à
// ~30 points). L'« origine » correspond au plus ancien point réel, étiqueté par
// sa date ; les périodes hors de portée (ex. 3 ans) sont masquées, pas inventées.
const HISTORY_DAYS = 1825;

export default function ReturnsMatrixPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset.symbol,
    status: "loading",
    data: null,
    source: null,
    error: null,
  });

  // Reset to loading in render-phase on symbol change (même idiome que les autres
  // panels de la fiche actif) — pas de setState synchrone dans l'effet.
  if (state.symbol !== asset.symbol) {
    setState({ symbol: asset.symbol, status: "loading", data: null, source: null, error: null });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchPriceHistory(asset.symbol, { days: HISTORY_DAYS })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const data = computeReturns(payload.points);
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
    <div className="mt-4 p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Rendements standards">
      <div className="flex items-center gap-2 mb-3">
        <LineChart className="w-4 h-4 text-blue-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Rendements — {asset.symbol}</span>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Calcul des rendements
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="text-sm font-medium text-amber-400">Rendements indisponibles</div>
          <div className="text-xs text-slate-500 mt-1">
            Historique de prix insuffisant pour ce titre. Les rendements sont masqués pour éviter d'afficher des valeurs simulées.
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <div className="space-y-4">
          {/* KPIs de tête */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Rendement cumulé</div>
              <div className={`text-sm font-semibold ${returnTone(data.cumulativeReturnPct)}`}>
                {formatPct(data.cumulativeReturnPct) ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Annualisé (CAGR)</div>
              <div className={`text-sm font-semibold ${returnTone(data.cagrPct)}`}>
                {data.cagrPct != null ? `${formatPct(data.cagrPct)}/an` : "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Depuis</div>
              <div className="text-sm font-semibold text-white">{data.firstDate}</div>
            </div>
          </div>

          {/* Matrice par période */}
          <div>
            <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Par période</div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {data.periodReturns.map((row) => {
                const formatted = formatPct(row.pct);
                return (
                  <div key={row.key} className="p-2 rounded-lg bg-surface-900 border border-white/5">
                    <div className="text-[11px] text-slate-500">{row.label}</div>
                    <div className={`text-sm font-semibold ${formatted ? returnTone(row.pct) : "text-slate-500"}`}>
                      {formatted ?? "—"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rendements mensuels (12 derniers mois avec antécédent) */}
          {data.monthly.some((m) => m.returnPct != null) && (
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Rendements mensuels</div>
              <div className="flex flex-wrap gap-1.5">
                {data.monthly
                  .filter((m) => m.returnPct != null)
                  .slice(-12)
                  .map((m) => (
                    <div key={m.month} className="px-2 py-1 rounded-md bg-surface-900 border border-white/5">
                      <span className="text-[10px] text-slate-500">{formatMonthLabel(m.month) ?? m.month}</span>
                      <span className={`ml-1.5 text-[11px] font-semibold ${returnTone(m.returnPct)}`}>
                        {formatPct(m.returnPct)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div className="text-[11px] text-slate-500">
            Rendements de prix (hors dividendes réinvestis), dérivés de l'historique factuel.
            {source ? ` Source ${source}.` : ""} Au {data.lastDate}.
          </div>
        </div>
      )}
    </div>
  );
}
