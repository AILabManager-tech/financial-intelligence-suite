import { useState } from "react";
import { Search, X } from "lucide-react";
import { fetchLiveQuotes, normalizeQuote } from "../services/liveQuotes";
import { searchSymbols } from "../services/symbolSearch";

function buildLookupAsset(result, quote) {
  return {
    symbol: quote.symbol,
    name: quote.name || result.description || quote.symbol,
    sector: result.type ? `Recherche — ${result.type}` : "Recherche — Marché",
    price: quote.price,
    change: quote.change,
    changePct: quote.changePct,
    volume: quote.volume,
    position: { quantity: 0, averageCost: quote.price, targetWeight: 0 },
    marketData: {
      status: "live",
      source: quote.source,
      fetchedAt: quote.fetchedAt,
      asOf: quote.asOf,
      previousClose: quote.previousClose,
      message: "Valeur consultée depuis une recherche marché.",
    },
  };
}

export default function MarketLookup({ onSelect }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const runSearch = async (event) => {
    event.preventDefault();
    const cleanQuery = query.trim();
    if (cleanQuery.length < 2) return;

    setStatus("loading");
    setError("");

    try {
      const payload = await searchSymbols(cleanQuery);
      setResults(payload.results);
      setStatus("ready");
    } catch (searchError) {
      setResults([]);
      setStatus("error");
      setError(searchError.message);
    }
  };

  const openResult = async (result) => {
    setStatus("loading");
    setError("");

    try {
      const payload = await fetchLiveQuotes([result.symbol]);
      const quote = normalizeQuote(payload.quotes[0]);
      if (!quote) throw new Error("Quote indisponible pour ce symbole.");
      onSelect(buildLookupAsset(result, quote));
      setStatus("ready");
    } catch (quoteError) {
      setStatus("error");
      setError(quoteError.message);
    }
  };

  return (
    <div className="animate-slide-up space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-blue-500/10">
          <Search className="w-5 h-5 text-blue-400" />
        </div>
        <h2 className="text-lg font-semibold text-white">Recherche marché</h2>
        <span className="ml-auto text-xs text-slate-500">Finnhub + Twelve Data</span>
      </div>

      <form onSubmit={runSearch} className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Chercher une entreprise ou un symbole (ex: UnitedHealth, UNH, Nvidia...)"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-800 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
          {query && (
            <button type="button" onClick={() => { setQuery(""); setResults([]); }} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5 cursor-pointer" aria-label="Effacer la recherche marché">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
        <button type="submit" disabled={status === "loading"} className="px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50 cursor-pointer">
          Rechercher
        </button>
      </form>

      {error && <div className="text-xs text-amber-400">{error}</div>}

      {results.length > 0 && (
        <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
          {results.map((result) => (
            <button key={`${result.symbol}-${result.description}`} onClick={() => openResult(result)} className="w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="w-16 text-sm font-bold text-white">{result.symbol}</div>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200 truncate">{result.description}</div>
                  <div className="text-xs text-slate-500">{result.type || "Equity"}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
