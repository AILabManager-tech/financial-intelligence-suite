import { useState, useMemo } from "react";
import { ArrowUpRight, ArrowDownRight, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getScoreColor, getScoreLabel, formatPercent } from "../utils/scoreTranslator";

const SORT_COLUMNS = {
  symbol: (a, b) => a.symbol.localeCompare(b.symbol),
  price: (a, b) => a.price - b.price,
  changePct: (a, b) => a.changePct - b.changePct,
  score: (a, b) => a.score - b.score,
};

function SortIcon({ column, sortBy, sortDir }) {
  if (sortBy !== column) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 text-violet-400" />
    : <ArrowDown className="w-3 h-3 text-violet-400" />;
}

export default function AssetTable({ assets, onSelect }) {
  const [sortBy, setSortBy] = useState("score");
  const [sortDir, setSortDir] = useState("desc");

  const sorted = useMemo(() => {
    const fn = SORT_COLUMNS[sortBy];
    if (!fn) return assets;
    const result = [...assets].sort(fn);
    return sortDir === "desc" ? result.reverse() : result;
  }, [assets, sortBy, sortDir]);

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
        <table className="w-full min-w-[600px]" role="grid">
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
              <th className="text-center text-xs font-medium text-slate-400 px-4 py-3">
                <button onClick={() => toggleSort("score")} className="flex items-center gap-1 mx-auto cursor-pointer hover:text-white transition-colors" aria-label="Trier par score">
                  Score <SortIcon column="score" sortBy={sortBy} sortDir={sortDir} />
                </button>
              </th>
              <th className="text-left text-xs font-medium text-slate-400 px-4 py-3 hidden md:table-cell">Verdict</th>
              <th className="text-right text-xs font-medium text-slate-400 px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {sorted.map((asset) => {
              const { bg, text } = getScoreColor(asset.score);
              const isUp = asset.changePct >= 0;

              return (
                <tr
                  key={asset.symbol}
                  onClick={() => onSelect(asset)}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                  role="row"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && onSelect(asset)}
                  aria-label={`${asset.symbol} — Score ${asset.score}, ${formatPercent(asset.changePct)}`}
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
                    <span className={`inline-flex items-center gap-0.5 text-sm font-medium ${isUp ? "text-emerald-400" : "text-rose-400"}`}>
                      {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                      {formatPercent(asset.changePct)}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${bg} ${text}`}>
                      {asset.score}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 hidden md:table-cell">
                    <span className={`text-xs font-medium ${text}`}>{getScoreLabel(asset.score)}</span>
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
