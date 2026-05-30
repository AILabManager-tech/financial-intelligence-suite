import { useEffect, useMemo, useState } from "react";
import { Coins, RefreshCw } from "lucide-react";
import { fetchDividends } from "../services/dividends";

function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-CA", { dateStyle: "medium" });
  } catch {
    return iso;
  }
}

function formatAmount(amount, currency) {
  if (typeof amount !== "number" || !Number.isFinite(amount)) return "—";
  const code = currency ?? "USD";
  return new Intl.NumberFormat("fr-CA", { style: "currency", currency: code, maximumFractionDigits: 4 }).format(amount);
}

function summarizeAnnual(items) {
  if (!items.length) return null;
  // Sum trailing-12-months actuals, only if we have at least one entry in window.
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 1);
  const sinceIso = since.toISOString().slice(0, 10);
  const trailing = items.filter((i) => i.exDate >= sinceIso);
  if (!trailing.length) return null;
  const total = trailing.reduce((acc, i) => acc + (Number.isFinite(i.amount) ? i.amount : 0), 0);
  if (!Number.isFinite(total) || total <= 0) return null;
  return { total, currency: trailing[0].currency ?? "USD", count: trailing.length };
}

export default function DividendHistoryPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    items: [],
    fetchedAt: null,
    source: null,
    providerStatus: null,
    reason: null,
    error: null,
  });

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({
      symbol: asset.symbol,
      status: "loading",
      items: [],
      fetchedAt: null,
      source: null,
      providerStatus: null,
      reason: null,
      error: null,
    });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;

    const controller = new AbortController();

    fetchDividends(asset.symbol, { signal: controller.signal })
      .then((payload) => {
        if (controller.signal.aborted) return;
        setState({
          symbol: asset.symbol,
          status: "ready",
          items: payload.items,
          fetchedAt: payload.fetchedAt,
          source: payload.source,
          providerStatus: payload.status,
          reason: payload.reason,
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
          providerStatus: null,
          reason: null,
          error: error.message,
        });
      });

    return () => controller.abort();
  }, [asset?.symbol]);

  const recent = useMemo(() => state.items.slice(0, 8), [state.items]);
  const ttm = useMemo(() => summarizeAnnual(state.items), [state.items]);

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Historique des dividendes">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Dividendes — 5 ans</span>
        </div>
        {state.status === "ready" && state.fetchedAt && (
          <span className="text-[11px] text-slate-500">{state.source ?? "finnhub.io"}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement de l'historique
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Dividendes indisponibles — {state.error}
        </div>
      )}

      {state.status === "ready" && state.providerStatus === "unavailable" && (
        <div className="text-sm text-amber-400">
          Historique dividendes indisponible — accès fournisseur refusé pour cette clé.
          <div className="text-xs text-slate-500 mt-1">
            Aucun dividende n'est affiché pour éviter de présenter une donnée non vérifiée.
          </div>
        </div>
      )}

      {state.status === "ready" && state.providerStatus !== "unavailable" && state.items.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun dividende publié pour {asset?.symbol} sur les 5 dernières années.
        </div>
      )}

      {state.status === "ready" && state.providerStatus !== "unavailable" && state.items.length > 0 && (
        <div className="space-y-3">
          {ttm && (
            <div className="text-xs text-slate-300">
              <span className="text-slate-500">Versé sur 12 mois :</span>{" "}
              <span className="font-semibold text-white">{formatAmount(ttm.total, ttm.currency)}</span>
              <span className="text-slate-500"> ({ttm.count} versement{ttm.count > 1 ? "s" : ""})</span>
            </div>
          )}
          <ul className="space-y-1">
            {recent.map((item) => (
              <li key={item.exDate} className="grid grid-cols-[auto_1fr_auto] items-baseline gap-3 text-sm">
                <span className="text-slate-200">{formatAmount(item.amount, item.currency)}</span>
                <span className="text-slate-500 text-xs">
                  Ex-date {formatDate(item.exDate)}
                  {item.payDate && <> · Paiement {formatDate(item.payDate)}</>}
                </span>
              </li>
            ))}
          </ul>
          {state.items.length > recent.length && (
            <div className="text-[11px] text-slate-500">{state.items.length - recent.length} autre(s) versement(s) plus ancien(s) non affiché(s).</div>
          )}
        </div>
      )}
    </div>
  );
}
