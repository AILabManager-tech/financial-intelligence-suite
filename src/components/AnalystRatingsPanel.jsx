import { useEffect, useMemo, useState } from "react";
import { Users, RefreshCw } from "lucide-react";
import { fetchAnalystRatings } from "../services/analystRatings";
import {
  buildHistorySeries,
  computeConsensus,
  formatBreakdown,
  formatPeriod,
} from "../utils/analystRatingsFormatters";

const TONE_BG = {
  emerald: "bg-emerald-500/15 text-emerald-300",
  amber: "bg-amber-500/15 text-amber-300",
  rose: "bg-rose-500/15 text-rose-300",
};

const TONE_BAR = {
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
};

export default function AnalystRatingsPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    items: [],
    fetchedAt: null,
    source: null,
    error: null,
  });

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({
      symbol: asset.symbol,
      status: "loading",
      items: [],
      fetchedAt: null,
      source: null,
      error: null,
    });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;

    const controller = new AbortController();

    fetchAnalystRatings(asset.symbol, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({
          symbol: asset.symbol,
          status: "ready",
          items: payload.items,
          fetchedAt: payload.fetchedAt,
          source: payload.source,
          error: null,
        });
      })
      .catch((error) => {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({
          symbol: asset.symbol,
          status: "error",
          items: [],
          fetchedAt: null,
          source: null,
          error: error.message,
        });
      });

    return () => controller.abort();
  }, [asset?.symbol]);

  const latest = state.items[0] ?? null;
  const consensus = useMemo(() => computeConsensus(latest), [latest]);
  const breakdown = useMemo(() => formatBreakdown(latest), [latest]);
  const history = useMemo(() => buildHistorySeries(state.items, { limit: 6 }), [state.items]);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Recommandations analystes">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Recommandations analystes</span>
        </div>
        {state.status === "ready" && state.source && (
          <span className="text-[11px] text-slate-500">{state.source}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement des recommandations
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Recommandations indisponibles pour le moment.
        </div>
      )}

      {state.status === "ready" && !latest && (
        <div className="text-sm text-slate-400">
          Aucune recommandation publiée pour {asset?.symbol}.
        </div>
      )}

      {state.status === "ready" && latest && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <div className="text-[11px] uppercase tracking-wide text-slate-500">Consensus {formatPeriod(latest.period)}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TONE_BG[consensus?.tone ?? "amber"]}`}>
                  {consensus?.label ?? "—"}
                </span>
                {consensus && (
                  <span className="text-xs text-slate-400">Note moyenne {consensus.mean.toFixed(2)} / 5</span>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 text-right">
              {latest.total} analyste{latest.total > 1 ? "s" : ""}
            </div>
          </div>

          <ul className="space-y-1.5">
            {breakdown.map((row) => (
              <li key={row.key} className="grid grid-cols-[110px_1fr_auto] items-center gap-2 text-xs">
                <span className="text-slate-300">{row.label}</span>
                <span className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <span
                    className={`block h-full ${TONE_BAR[row.tone] ?? "bg-slate-400"}`}
                    style={{ width: `${row.pct}%` }}
                    aria-hidden="true"
                  />
                </span>
                <span className="text-slate-400 tabular-nums">
                  {row.count} <span className="text-slate-500">({row.pct}%)</span>
                </span>
              </li>
            ))}
          </ul>

          {history.length > 1 && (
            <div className="pt-3 border-t border-white/5">
              <div className="text-[11px] uppercase tracking-wide text-slate-500 mb-2">Tendance — 6 derniers relevés</div>
              <ul className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-[11px]">
                {history.map((entry) => (
                  <li key={entry.period} className="rounded-lg bg-surface-900/70 px-2 py-1.5 border border-white/5">
                    <div className="text-slate-500">{formatPeriod(entry.period)}</div>
                    <div className={`font-semibold ${entry.tone === "emerald" ? "text-emerald-300" : entry.tone === "rose" ? "text-rose-300" : "text-amber-300"}`}>
                      {entry.mean !== null ? entry.mean.toFixed(2) : "—"}
                    </div>
                    <div className="text-slate-500">n={entry.total}</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
