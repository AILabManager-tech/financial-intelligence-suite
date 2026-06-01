import { useEffect, useState } from "react";
import { UserCog, RefreshCw } from "lucide-react";
import { fetchInsiderTransactions } from "../services/insiderTransactions";
import {
  describeTransactionCode,
  transactionDirection,
  directionTone,
  formatShareChange,
  formatInsiderDate,
  formatTransactionValue,
  summarizeInsiderActivity,
} from "../utils/insiderTransactionsFormatters";

const TONE_CLASSES = {
  emerald: "bg-emerald-500/15 text-emerald-300",
  rose: "bg-rose-500/15 text-rose-300",
  slate: "bg-surface-900 text-slate-300 border border-white/5",
};

function toneClass(tone) {
  return TONE_CLASSES[tone] ?? TONE_CLASSES.slate;
}

export default function InsiderTransactionsPanel({ asset }) {
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

    fetchInsiderTransactions(asset.symbol, { signal: controller.signal, limit: 20 })
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

  if (!asset?.symbol) return null;

  const summary = state.status === "ready" ? summarizeInsiderActivity(state.items) : { hasData: false };

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Transactions d'initiés">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <UserCog className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Transactions d'initiés</span>
        </div>
        {state.status === "ready" && state.source && (
          <span className="text-[11px] text-slate-500">{state.source}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement des transactions d'initiés
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Transactions d'initiés indisponibles — {state.error}
          <div className="text-xs text-slate-500 mt-1">Aucune transaction n'est affichée pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucune transaction d'initié publiée pour {asset.symbol}. Les déclarations d'initiés (SEC Form 3/4/5) ne couvrent que les émetteurs cotés aux États-Unis.
        </div>
      )}

      {state.status === "ready" && state.items.length > 0 && (
        <>
          {summary.hasData && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              <div className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">Achats</div>
                <div className="text-sm font-semibold text-emerald-400">{summary.buyCount}</div>
              </div>
              <div className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">Ventes</div>
                <div className="text-sm font-semibold text-rose-400">{summary.sellCount}</div>
              </div>
              <div className="rounded-lg bg-surface-900 border border-white/5 p-2">
                <div className="text-[11px] text-slate-500">Solde net (titres)</div>
                <div className={`text-sm font-semibold ${summary.netDirection === "acquired" ? "text-emerald-400" : summary.netDirection === "disposed" ? "text-rose-400" : "text-slate-300"}`}>
                  {formatShareChange(summary.netShares) ?? "0"}
                </div>
              </div>
            </div>
          )}

          <ul className="space-y-2">
            {state.items.map((item, index) => {
              const direction = transactionDirection(item.change);
              const tone = directionTone(direction);
              const code = describeTransactionCode(item.transactionCode);
              const sharesLabel = formatShareChange(item.change);
              const dateLabel = formatInsiderDate(item.transactionDate);
              const valueLabel = formatTransactionValue(item.change, item.transactionPrice);
              return (
                <li key={`${item.name}-${item.transactionDate}-${index}`} className="flex items-start justify-between gap-3 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{item.name}</div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5 flex-wrap">
                      {dateLabel && <span>{dateLabel}</span>}
                      <span className={`px-1.5 py-0.5 rounded ${toneClass(tone)}`}>{code.label}</span>
                      {item.transactionPrice && <span>@ ${item.transactionPrice.toFixed(2)}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {sharesLabel && (
                      <div className={`text-sm font-semibold ${tone === "emerald" ? "text-emerald-400" : tone === "rose" ? "text-rose-400" : "text-slate-300"}`}>
                        {sharesLabel}
                      </div>
                    )}
                    {valueLabel && <div className="text-[11px] text-slate-500">{valueLabel}</div>}
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 text-[11px] text-slate-500">
            Déclarations SEC Form 3/4/5 (initiés et détenteurs &gt; 10 %). Donnée factuelle de transactions passées — pas un conseil.
          </div>
        </>
      )}
    </div>
  );
}
