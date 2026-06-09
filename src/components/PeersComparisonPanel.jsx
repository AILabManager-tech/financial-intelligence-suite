import { useEffect, useMemo, useState } from "react";
import { Layers, RefreshCw } from "lucide-react";
import { fetchPeers, fetchPeerQuotes } from "../services/peers";
import {
  buildPeersTable,
  formatDeltaVsBase,
  rankPeersByChange,
} from "../utils/peersFormatters";

function ChangeChip({ value }) {
  if (value === null || !Number.isFinite(value)) {
    return <span className="text-slate-500 text-[11px]">—</span>;
  }
  const isUp = value >= 0;
  const tone = isUp ? "text-emerald-300 bg-emerald-500/10" : "text-rose-300 bg-rose-500/10";
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[11px] font-semibold tabular-nums ${tone}`}>
      {isUp ? "+" : ""}{value.toFixed(2)}%
    </span>
  );
}

function DeltaChip({ value }) {
  const formatted = formatDeltaVsBase(value);
  if (formatted === null) return <span className="text-slate-500 text-[11px]">—</span>;
  const tone = value > 0 ? "text-emerald-300" : value < 0 ? "text-rose-300" : "text-slate-400";
  return <span className={`text-[11px] tabular-nums ${tone}`}>{formatted}</span>;
}

export default function PeersComparisonPanel({ asset }) {
  const [state, setState] = useState({
    symbol: asset?.symbol ?? null,
    status: asset?.symbol ? "loading" : "idle",
    peers: [],
    quotes: [],
    fetchedAt: null,
    source: null,
    error: null,
  });

  if (asset?.symbol && state.symbol !== asset.symbol) {
    setState({
      symbol: asset.symbol,
      status: "loading",
      peers: [],
      quotes: [],
      fetchedAt: null,
      source: null,
      error: null,
    });
  }

  useEffect(() => {
    if (!asset?.symbol) return undefined;

    const controller = new AbortController();

    (async () => {
      try {
        const peersPayload = await fetchPeers(asset.symbol, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (peersPayload.peers.length === 0) {
          setState({
            symbol: asset.symbol,
            status: "ready",
            peers: [],
            quotes: [],
            fetchedAt: peersPayload.fetchedAt,
            source: peersPayload.source,
            error: null,
          });
          return;
        }
        const quotesPayload = await fetchPeerQuotes(peersPayload.peers, { signal: controller.signal });
        if (controller.signal.aborted) return;
        setState({
          symbol: asset.symbol,
          status: "ready",
          peers: peersPayload.peers,
          quotes: quotesPayload.quotes,
          fetchedAt: quotesPayload.fetchedAt ?? peersPayload.fetchedAt,
          source: peersPayload.source,
          error: null,
        });
      } catch (error) {
        if (controller.signal.aborted || error.name === "AbortError") return;
        setState({
          symbol: asset.symbol,
          status: "error",
          peers: [],
          quotes: [],
          fetchedAt: null,
          source: null,
          error: error.message,
        });
      }
    })();

    return () => controller.abort();
  }, [asset?.symbol]);

  const rows = useMemo(() => {
    const baseQuote = asset
      ? { symbol: asset.symbol, price: asset.price, change: asset.change, changePct: asset.changePct }
      : null;
    return rankPeersByChange(buildPeersTable(state.peers, state.quotes, baseQuote));
  }, [state.peers, state.quotes, asset]);

  if (!asset?.symbol) return null;

  return (
    <div className="p-4 rounded-xl bg-surface-800 border border-white/5 mt-4" role="region" aria-label="Comparaison sectorielle">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-blue-400" aria-hidden="true" />
          <span className="text-sm font-semibold text-white">Comparaison sectorielle</span>
        </div>
        {state.status === "ready" && state.source && (
          <span className="text-[11px] text-slate-500">{state.source}</span>
        )}
      </div>

      {state.status === "loading" && (
        <div className="flex items-center gap-2 text-sm text-slate-400 min-h-[80px]">
          <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
          Chargement de la comparaison sectorielle
        </div>
      )}

      {state.status === "error" && (
        <div className="text-sm text-amber-400">
          Comparaison sectorielle indisponible pour le moment.
          <div className="text-xs text-slate-500 mt-1">Aucun pair n'est listé pour éviter de présenter une donnée non vérifiée.</div>
        </div>
      )}

      {state.status === "ready" && rows.length === 0 && (
        <div className="text-sm text-slate-400">
          Aucun pair sectoriel publié pour {asset.symbol}.
          <div className="text-xs text-slate-500 mt-1">Les pairs sectoriels Finnhub ne couvrent pas tous les émetteurs (notamment hors US ou petites capitalisations).</div>
        </div>
      )}

      {state.status === "ready" && rows.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-[60px_1fr_70px_70px] sm:grid-cols-[60px_1fr_80px_80px_90px] gap-2 text-[11px] uppercase tracking-wide text-slate-500 px-1">
            <span>Symbole</span>
            <span className="hidden sm:block">Prix</span>
            <span className="sm:hidden">Var.</span>
            <span className="hidden sm:block">Var. abs.</span>
            <span className="hidden sm:block">Var. %</span>
            <span className="text-right">Δ vs {asset.symbol}</span>
          </div>
          <ul className="space-y-1">
            {rows.map((row) => (
              <li
                key={row.symbol}
                data-testid="peer-row"
                data-symbol={row.symbol}
                className={`grid grid-cols-[60px_1fr_70px_70px] sm:grid-cols-[60px_1fr_80px_80px_90px] gap-2 items-center px-1 py-1.5 rounded ${row.status === "missing" ? "opacity-60" : "hover:bg-white/5"}`}
              >
                <span className="text-sm font-semibold text-white truncate">{row.symbol}</span>
                {row.status === "missing" ? (
                  <span className="text-xs text-slate-500 col-span-3 sm:col-span-4">Cotation indisponible</span>
                ) : (
                  <>
                    <span className="hidden sm:inline text-sm text-slate-200 tabular-nums">${row.price.toFixed(2)}</span>
                    <span className="sm:hidden">
                      <ChangeChip value={row.changePct} />
                    </span>
                    <span className="hidden sm:inline text-xs text-slate-300 tabular-nums">
                      {row.change >= 0 ? "+" : ""}{row.change.toFixed(2)}
                    </span>
                    <span className="hidden sm:inline">
                      <ChangeChip value={row.changePct} />
                    </span>
                    <span className="text-right">
                      <DeltaChip value={row.deltaVsBasePct} />
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
          <div className="text-[11px] text-slate-500 pt-2 border-t border-white/5">
            Δ vs {asset.symbol} = écart en points de pourcentage entre la variation du jour du pair et celle du symbole de référence.
          </div>
        </div>
      )}
    </div>
  );
}
