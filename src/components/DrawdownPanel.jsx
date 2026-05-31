import { useEffect, useState } from "react";
import { TrendingDown, RefreshCw } from "lucide-react";
import { fetchPriceHistory } from "../services/priceHistory";
import { computeDrawdown } from "../utils/assetDrawdown";
import { formatPct } from "../utils/returnsFormatters";

// Analyse de repli / drawdown (P5.x). Feature de catalogue de la fiche actif,
// dérivée de la même série de prix factuelle (/api/history) que la matrice (P4.1)
// et la distribution (P4.10) — aucune nouvelle source serveur. Repli = baisse
// depuis le dernier sommet ; on montre le pire épisode (repli maximal, dates,
// durée), s'il est récupéré, et le repli courant. Niveau actif uniquement
// (distinct du drawdown PORTEFEUILLE P4.4 qui exige la série de snapshots).
// Factualité : série insuffisante = masquée, jamais de valeur inventée.
const HISTORY_DAYS = 1825;

function formatDays(days) {
  if (!Number.isFinite(days) || days < 0) return null;
  if (days < 365) return `${Math.round(days)} j`;
  const years = days / 365;
  return `${years.toFixed(1).replace(".", ",")} an${years >= 2 ? "s" : ""}`;
}

export default function DrawdownPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset.symbol,
    status: "loading",
    data: null,
    source: null,
  });

  if (state.symbol !== asset.symbol) {
    setState({ symbol: asset.symbol, status: "loading", data: null, source: null });
  }

  useEffect(() => {
    const controller = new AbortController();

    fetchPriceHistory(asset.symbol, { days: HISTORY_DAYS })
      .then((payload) => {
        if (controller.signal.aborted) return;
        const data = computeDrawdown(payload.points);
        if (!data) {
          setState({ symbol: asset.symbol, status: "error", data: null, source: payload.source });
          return;
        }
        setState({ symbol: asset.symbol, status: "ready", data, source: payload.source });
      })
      .catch((error) => {
        if (controller.signal.aborted || error?.name === "AbortError") return;
        setState({ symbol: asset.symbol, status: "error", data: null, source: null });
      });

    return () => controller.abort();
  }, [asset.symbol]);

  const { status, data, source } = state;

  return (
    <div className="mt-4 p-4 rounded-xl bg-surface-800 border border-white/5" role="region" aria-label="Analyse de repli">
      <div className="flex items-center gap-2 mb-3">
        <TrendingDown className="w-4 h-4 text-rose-400" aria-hidden="true" />
        <span className="text-sm font-semibold text-white">Analyse de repli (drawdown) — {asset.symbol}</span>
      </div>

      {status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 py-6">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Analyse des replis
        </div>
      )}

      {status === "error" && (
        <div className="py-4">
          <div className="text-sm font-medium text-amber-400">Analyse de repli indisponible</div>
          <div className="text-xs text-slate-500 mt-1">
            Pas assez d'historique de prix pour ce titre. Les mesures sont masquées pour éviter d'afficher des
            valeurs simulées.
          </div>
        </div>
      )}

      {status === "ready" && data && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="text-[11px] text-slate-500">Repli maximal</div>
              <div className="text-sm font-semibold text-rose-400">{formatPct(data.maxDrawdownPct) ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Repli courant</div>
              <div className={`text-sm font-semibold ${data.atHigh ? "text-emerald-400" : "text-rose-400"}`}>
                {data.atHigh ? "Au plus haut" : formatPct(data.currentDrawdownPct)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Durée (sommet → creux)</div>
              <div className="text-sm font-semibold text-white">{formatDays(data.drawdownDays) ?? "—"}</div>
            </div>
            <div>
              <div className="text-[11px] text-slate-500">Statut</div>
              <div className={`text-sm font-semibold ${data.recovered ? "text-emerald-400" : "text-amber-300"}`}>
                {data.recovered ? "Récupéré" : "Sous l'eau"}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400">
            Pire épisode : du <span className="text-slate-300">{data.peakDate}</span> (sommet) au{" "}
            <span className="text-slate-300">{data.troughDate}</span> (creux).
          </div>

          <div className="text-[11px] text-slate-500">
            Repli = baisse depuis le dernier sommet, sur prix de clôture (hors dividendes réinvestis), dérivé de
            l'historique factuel.{source ? ` Source ${source}.` : ""} Pas un conseil.
          </div>
        </div>
      )}
    </div>
  );
}
