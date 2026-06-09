import { useEffect, useState } from "react";
import { CalendarClock, RefreshCw } from "lucide-react";
import { fetchEarningsCalendar } from "../services/earningsCalendar";
import { formatLargeUsd } from "../utils/fundamentalsFormatters";

function formatEps(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `$${value.toFixed(2)}`;
}

function formatSurprise(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function surpriseTone(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "text-slate-400";
  if (value > 0) return "text-emerald-400";
  if (value < 0) return "text-rose-400";
  return "text-slate-300";
}

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString("fr-CA", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

export default function EarningsCalendarPanel({ asset }) {
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

    fetchEarningsCalendar(asset.symbol, { signal: controller.signal })
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

  const upcoming = state.items.filter((i) => i.when === "upcoming");
  const past = state.items.filter((i) => i.when === "past").slice(0, 4);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Calendrier des résultats">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Résultats trimestriels</span>
        </div>
        {state.status === "ready" && state.fetchedAt && (
          <span className="text-[11px] text-slate-500">{state.source ?? "finnhub.io"}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement du calendrier
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Calendrier indisponible pour le moment.
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun résultat trimestriel publié par Finnhub pour {asset?.symbol}.
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <div className="space-y-3">
          {upcoming.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-500 mb-1">À venir</div>
              <ul className="space-y-1">
                {upcoming.map((item) => (
                  <li key={`${item.date}-${item.period}`} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-slate-200">{item.period}</span>
                    <span className="text-slate-400 text-xs">{formatDate(item.date)}</span>
                    <span className="text-slate-300 text-xs">est. BPA {formatEps(item.epsEstimate)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <div className="text-[11px] text-slate-500 mb-1">Historique récent</div>
              <ul className="space-y-1">
                {past.map((item) => {
                  const surprise = formatSurprise(item.surprisePct);
                  return (
                    <li key={`${item.date}-${item.period}`} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 text-sm">
                      <span className="text-slate-200">{item.period}</span>
                      <span className="text-slate-400 text-xs">
                        {formatDate(item.date)} · BPA {formatEps(item.epsActual)} vs {formatEps(item.epsEstimate)}
                        {item.revenueActual !== null && item.revenueActual !== undefined && (
                          <> · CA {formatLargeUsd(item.revenueActual) ?? "n/d"}</>
                        )}
                      </span>
                      {surprise && (
                        <span className={`text-xs font-medium ${surpriseTone(item.surprisePct)}`}>{surprise}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
