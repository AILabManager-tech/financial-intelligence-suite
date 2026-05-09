import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { formatCurrency, formatPercent } from "../utils/scoreTranslator";
import { enrichAssetsWithPositionMetrics } from "../utils/portfolioAnalytics";

const SORT_COLUMNS = {
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  price: (a, b) => a.price - b.price,
  changePct: (a, b) => a.changePct - b.changePct,
  marketValue: (a, b) => a.positionMetrics.marketValue - b.positionMetrics.marketValue,
  unrealizedPnlPct: (a, b) => a.positionMetrics.unrealizedPnlPct - b.positionMetrics.unrealizedPnlPct,
  targetDrift: (a, b) => Math.abs(a.positionMetrics.targetDrift) - Math.abs(b.positionMetrics.targetDrift),
  source: (a, b) => (a.marketData?.source ?? "").localeCompare(b.marketData?.source ?? ""),
};

function SortIcon({ column, sortBy, sortDir }) {
  if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-violet-400" />
    : <ArrowDown className="w-3 h-3 text-violet-400" />;
}

export default function AssetTable({ assets, onSelect }) {
  const [sortBy, setSortBy] = useState("changePct");
  const [sortDir, setSortDir] = useState("desc");
  const positionedAssets = useMemo(() => enrichAssetsWithPositionMetrics(assets), [assets]);

  const sorted = useMemo(() => {
    const fn = SORT_COLUMNS[sortBy];
    if (!fn) return positionedAssets;
    const result = [...positionedAssets].sort(fn);
    return sortDir === "desc" ? result.reverse() : result;
  }, [positionedAssets, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-lg font-semibold text-white">Tous les Actifs</h2>
        <span className="ml-auto text-xs text-slate-500">{assets.length} actifs suivis</span>
      </div>

      <div className="rounded-xl border border-white/5 overflow-x-auto">
        <table className="w-full min-w-[820px]" role="grid">
          <thead>
            <tr className="bg-surface-800/80">
              <th className="text-left text-xs font-medium text-slate-400 px-4 py-3">
                <button onClick={() => toggleSort("symbol")} className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors" aria-label="Trier par actif">
                  Actif <SortIcon column="symbol" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">
                <button onClick={() => toggleSort("price")} className="flex items-center gap-1 ml-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par prix">
                  Prix <SortIcon column="price" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">
                <button onClick={() => toggleSort("changePct")} className="flex items-center gap-1 ml-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par variation">
                  Variation <SortIcon column="changePct" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3">
                <button onClick={() => toggleSort("marketValue")} className="flex items-center gap-1 ml-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par valeur de position">
                  Position <SortIcon column="marketValue" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 hidden lg:table-cell">
                <button onClick={() => toggleSort("unrealizedPnlPct")} className="flex items-center gap-1 ml-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par gain latent">
                  P&L <SortIcon column="unrealizedPnlPct" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 hidden xl:table-cell">
                <button onClick={() => toggleSort("targetDrift")} className="flex items-center gap-1 ml-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par dérive cible">
                  Drift <SortIcon column="targetDrift" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden md:table-cell">
                <button onClick={() => toggleSort("source")} className="flex items-center gap-1 cursor-pointer hover:text-white transition-colors" aria-label="Trier par source">
                  Source <SortIcon column="source" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((asset) => {
              const isUp = asset.changePct >= 0;
              const pnlUp = asset.positionMetrics.unrealizedPnl >= 0;
              const driftAbs = Math.abs(asset.positionMetrics.targetDrift);

              return (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelect(asset)}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(asset)}
                  aria-label={`${asset.symbol} — ${formatPercent(asset.changePct)}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-surface-700 flex items-center justify-center text-sm font-bold text-white flex-shrink-0">
                        {asset.symbol.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-white">{asset.symbol}</div>
                        <div className="text-xs text-slate-500 truncate">{asset.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <span className="text-sm font-medium text-white">
                      ${asset.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="inline-flex items-center justify-end gap-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${isUp ? "bg-emerald-500/25 text-emerald-300" : "bg-rose-500/25 text-rose-300"}`}>
                      {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {formatPercent(asset.changePct)}
                      </span>
                      <span className={`text-xs font-bold ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                        {isUp ? "+" : "-"}${Math.abs(asset.change).toFixed(2)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="text-sm font-medium text-white">{formatCurrency(asset.positionMetrics.marketValue)}</div>
                    <div className="text-[11px] text-slate-500">{asset.positionMetrics.weight.toFixed(1)}% du portefeuille</div>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden lg:table-cell">
                    <div className={`text-sm font-semibold ${pnlUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {formatPercent(asset.positionMetrics.unrealizedPnlPct)}
                    </div>
                    <div className="text-[11px] text-slate-500">{formatCurrency(asset.positionMetrics.unrealizedPnl)}</div>
                  </td>
                  <td className="px-4 py-3.5 text-right hidden xl:table-cell">
                    <div className={`text-sm font-semibold ${driftAbs >= 2.5 ? "text-amber-400" : "text-slate-300"}`}>
                      {formatPercent(asset.positionMetrics.targetDrift)}
                    </div>
                    <div className="text-[11px] text-slate-500">cible {asset.positionMetrics.targetWeight.toFixed(1)}%</div>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <div className="text-xs font-medium text-slate-300">{asset.marketData?.source ?? "source externe"}</div>
                    <div className="text-[11px] text-slate-500">
                      {asset.marketData?.asOf ? new Date(asset.marketData.asOf).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" }) : "Horodatage API"}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
