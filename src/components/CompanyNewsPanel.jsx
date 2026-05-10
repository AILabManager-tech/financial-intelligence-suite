import { useEffect, useState } from "react";
import { Newspaper, RefreshCw, ExternalLink } from "lucide-react";
import { fetchCompanyNews } from "../services/companyNews";

function formatDate(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

export default function CompanyNewsPanel({ asset }) {
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

    fetchCompanyNews(asset.symbol, { signal: controller.signal, limit: 10 })
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

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Actualités société">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Newspaper className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Actualités — 14 derniers jours</span>
        </div>
        {state.status === "ready" && state.fetchedAt && (
          <span className="text-[11px] text-slate-500" title={`Récupéré le ${formatDate(state.fetchedAt)}`}>
            {state.source ?? "finnhub.io"}
          </span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement des actualités
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Actualités indisponibles — {state.error}
          <div className="text-xs text-slate-500 mt-1">Aucun titre n'est affiché pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucune actualité publiée pour {asset?.symbol} sur les 14 derniers jours.
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <ul className="space-y-3">
          {state.items.map((item) => (
            <li key={item.id ?? `${item.date}-${item.url}`} className="border-b border-white/5 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                <span title={formatDate(item.date)}>{formatDate(item.date)}</span>
                {item.source && (
                  <span className="px-1.5 py-0.5 rounded bg-surface-900 border border-white/5">{item.source}</span>
                )}
                {item.category && item.category !== "company" && (
                  <span className="text-slate-600">— {item.category}</span>
                )}
              </div>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-white hover:text-violet-300 inline-flex items-start gap-1"
              >
                <span>{item.headline}</span>
                <ExternalLink className="w-3 h-3 mt-1 flex-shrink-0 opacity-60" aria-hidden="true" />
              </a>
              {item.summary && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{item.summary}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
