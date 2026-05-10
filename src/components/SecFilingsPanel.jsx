import { useEffect, useMemo, useState } from "react";
import { FileText, RefreshCw, ExternalLink } from "lucide-react";
import { fetchSecFilings } from "../services/secFilings";
import {
  formatFiledDate,
  groupByForm,
  resolveFilingUrl,
} from "../utils/secFilingsFormatters";

const TONE_BG = {
  violet: "bg-violet-500/15 text-violet-300",
  sky: "bg-sky-500/15 text-sky-300",
  amber: "bg-amber-500/15 text-amber-300",
  rose: "bg-rose-500/15 text-rose-300",
  emerald: "bg-emerald-500/15 text-emerald-300",
  indigo: "bg-indigo-500/15 text-indigo-300",
  slate: "bg-slate-500/15 text-slate-300",
};

export default function SecFilingsPanel({ asset }) {
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

    fetchSecFilings(asset.symbol, { signal: controller.signal })
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

  const groups = useMemo(() => groupByForm(state.items), [state.items]);

  if (!asset?.symbol) return null;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Dépôts SEC">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Dépôts SEC</span>
        </div>
        {state.status === "ready" && state.source && (
          <span className="text-[11px] text-slate-500">{state.source}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement des dépôts SEC
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Dépôts SEC indisponibles — {state.error}
          <div className="text-xs text-slate-500 mt-1">Aucune ligne n'est affichée pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && groups.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun dépôt SEC publié pour {asset.symbol}.
          <div className="text-xs text-slate-500 mt-1">Les dépôts SEC ne couvrent que les émetteurs cotés aux États-Unis.</div>
        </div>
      )}

      {state.status === "ready" && groups.length > 0 && (
        <ul className="space-y-4">
          {groups.map((group) => (
            <li key={group.key}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${TONE_BG[group.tone] ?? TONE_BG.slate}`}>
                  {group.key}
                </span>
                <span className="text-xs text-slate-300">{group.label}</span>
                <span className="text-[11px] text-slate-500">
                  {group.items.length} dépôt{group.items.length > 1 ? "s" : ""}
                </span>
              </div>
              <ul className="space-y-1.5">
                {group.items.map((item) => {
                  const href = resolveFilingUrl(item);
                  const filed = formatFiledDate(item.filedDate);
                  const key = item.accessNumber ?? `${group.key}-${item.filedDate}`;
                  return (
                    <li key={key} className="flex items-center gap-2 text-xs">
                      <span className="text-slate-500 tabular-nums w-[88px] flex-shrink-0">{filed ?? item.filedDate}</span>
                      {href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-200 hover:text-violet-300 inline-flex items-center gap-1 truncate"
                          title={item.accessNumber ?? ""}
                        >
                          <span className="truncate">{item.accessNumber ?? "Voir le dépôt"}</span>
                          <ExternalLink className="w-3 h-3 flex-shrink-0 opacity-60" aria-hidden="true" />
                        </a>
                      ) : (
                        <span className="text-slate-400 truncate">{item.accessNumber ?? "—"}</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
