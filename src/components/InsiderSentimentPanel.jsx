import { useEffect, useState } from "react";
import { TrendingUp, RefreshCw } from "lucide-react";
import { fetchInsiderSentiment } from "../services/insiderSentiment";
import { formatMonthYear, formatMspr, msprSentiment, averageMspr } from "../utils/insiderSentimentFormatters";

const TONE = {
  emerald: "text-emerald-400",
  rose: "text-rose-400",
  slate: "text-slate-400",
};

export default function InsiderSentimentPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    items: [],
    source: null,
    error: null,
  });

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({ symbol: asset.symbol, status: "loading", items: [], source: null, error: null });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;
    const controller = new AbortController();
    fetchInsiderSentiment(asset.symbol, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({ symbol: asset.symbol, status: "ready", items: payload.items, source: payload.source, error: null });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({ symbol: asset.symbol, status: "error", items: [], source: null, error: error.message });
      });
    return () => controller.abort();
  }, [asset?.symbol]);

  if (!asset?.symbol) return null;

  const avg = state.status === "ready" ? averageMspr(state.items) : null;
  const avgSentiment = msprSentiment(avg);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Sentiment des initiés (MSPR)">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Sentiment des initiés (MSPR)</span>
        </div>
        {state.status === "ready" && state.source && <span className="text-[11px] text-slate-500">{state.source}</span>}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[60px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" /> Chargement
        </div>
      )}
      {state.status === "error" && (
        <div className="text-sm text-amber-400">Sentiment indisponible pour le moment.</div>
      )}
      {state.status === "ready" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun sentiment d'initié publié pour {asset.symbol}. Couvre les émetteurs cotés aux États-Unis.
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          {avg !== null && (
            <div className="mb-3">
              <span className="text-[11px] text-slate-500">MSPR moyen (12 mois)</span>
              <div className={`text-xl font-bold ${TONE[avgSentiment.tone]}`}>
                {formatMspr(avg)} <span className="text-sm font-medium">· {avgSentiment.label}</span>
              </div>
            </div>
          )}
          <ul className="space-y-1.5">
            {state.items.slice(0, 12).map((item) => {
              const s = msprSentiment(item.mspr);
              return (
                <li key={`${item.year}-${item.month}`} className="flex items-center justify-between text-sm">
                  <span className="text-slate-400 text-xs">{formatMonthYear(item.year, item.month)}</span>
                  <span className={`font-semibold ${TONE[s.tone]}`}>{formatMspr(item.mspr)}</span>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 text-[11px] text-slate-500">
            MSPR (monthly share purchase ratio) ∈ [−100, 100] : positif = achats nets d'initiés. Donnée factuelle, pas un conseil.
          </div>
        </>
      )}
    </div>
  );
}
