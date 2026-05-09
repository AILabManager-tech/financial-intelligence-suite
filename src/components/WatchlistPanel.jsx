import { useEffect, useState } from "react";
import { Bookmark, RefreshCw, Star, Trash2 } from "lucide-react";
import { fetchLiveQuotes, mergeQuotesIntoAssets } from "../services/liveQuotes";

function WatchlistEmptyState() {
  return (
    <div className="p-6 rounded-xl bg-surface-800 border border-white/5 text-center">
      <div className="text-sm font-semibold text-white">Watchlist vide</div>
      <div className="text-xs text-slate-500 mt-1">
        Ajoute un actif depuis sa fiche pour le suivre sans l'inclure au portefeuille.
      </div>
    </div>
  );
}

export default function WatchlistPanel({ assets, favoriteSymbols = [], onSelect, onRemove, onToggleFavorite }) {
  const [quotedAssets, setQuotedAssets] = useState(assets);
  const [status, setStatus] = useState({ label: "Synchronisation watchlist", loading: true });
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    let active = true;

    if (!assets.length) {
      queueMicrotask(() => {
        if (!active) return;
        setQuotedAssets([]);
        setStatus({ label: "Watchlist vide", loading: false });
      });
      return () => {
        active = false;
      };
    }

    queueMicrotask(() => {
      if (!active) return;
      setStatus({ label: "Synchronisation watchlist", loading: true });
    });

    fetchLiveQuotes(assets.map((asset) => asset.symbol))
      .then((payload) => {
        if (!active) return;
        setQuotedAssets(mergeQuotesIntoAssets(assets, payload.quotes));
        setStatus({
          label: payload.cacheStatus === "hit" ? "Watchlist synchronisée depuis le cache" : "Watchlist synchronisée",
          loading: false,
          fetchedAt: payload.fetchedAt,
        });
      })
      .catch(() => {
        if (!active) return;
        setQuotedAssets(assets);
        setStatus({ label: "Watchlist synchronisée partiellement", loading: false });
      });

    return () => {
      active = false;
    };
  }, [assets, refreshTick]);

  const favoriteSet = new Set(favoriteSymbols);
  const sortedAssets = [...quotedAssets].sort((a, b) => {
    const aFavorite = favoriteSet.has(a.symbol) ? 0 : 1;
    const bFavorite = favoriteSet.has(b.symbol) ? 0 : 1;
    return aFavorite - bFavorite || a.symbol.localeCompare(b.symbol);
  });

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-violet-500/10">
          <Bookmark className="w-5 h-5 text-violet-400" aria-hidden="true" />
        </div>
        <h2 className="text-lg font-semibold text-white">Watchlist indépendante</h2>
        <span className="ml-auto text-xs text-slate-500">
          {favoriteSymbols.length} favori{favoriteSymbols.length > 1 ? "s" : ""} · {status.label}
        </span>
      </div>

      {!quotedAssets.length ? (
        <WatchlistEmptyState />
      ) : (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-surface-800/70 border-b border-white/5">
            <div className="text-xs text-slate-400">
              {status.fetchedAt ? `Mis à jour ${new Date(status.fetchedAt).toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" })}` : "Aucune mise à jour"}
            </div>
            <button
              type="button"
              onClick={() => setRefreshTick((current) => current + 1)}
              className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-white cursor-pointer"
              aria-label="Rafraîchir la watchlist"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${status.loading ? "animate-spin" : ""}`} aria-hidden="true" />
              Rafraîchir
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 bg-surface-800/80">
                <th className="px-4 py-3">Actif</th>
                <th className="px-4 py-3 text-right">Prix</th>
                <th className="px-4 py-3 text-right">Var.</th>
                <th className="px-4 py-3 text-right">Source</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sortedAssets.map((asset) => {
                const isUp = asset.changePct >= 0;
                const isFavorite = favoriteSet.has(asset.symbol);

                return (
                  <tr key={asset.symbol} className="bg-surface-900/60">
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-white">{asset.symbol}</div>
                      <div className="text-xs text-slate-500 truncate">{asset.name}</div>
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-semibold text-white">
                      ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right text-sm font-semibold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {isUp ? "+" : ""}{asset.changePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-slate-500">
                      {asset.marketData?.source ?? "source externe"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => onToggleFavorite?.(asset.symbol)}
                          className={`p-2 rounded-lg cursor-pointer ${isFavorite ? "bg-amber-500/15 text-amber-300" : "bg-surface-800 text-slate-400 hover:text-white hover:bg-white/5"}`}
                          aria-label={isFavorite ? `Retirer ${asset.symbol} des favoris` : `Marquer ${asset.symbol} favori`}
                        >
                          <Star className={`w-4 h-4 ${isFavorite ? "fill-current" : ""}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelect?.(asset)}
                          className="px-3 py-1.5 rounded-lg bg-surface-800 text-xs text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
                        >
                          Ouvrir
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemove?.(asset.symbol)}
                          className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/15 cursor-pointer"
                          aria-label={`Retirer ${asset.symbol} de la watchlist`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
