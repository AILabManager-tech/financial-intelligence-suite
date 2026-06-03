import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, Globe2, Search, Trash2, X } from "lucide-react";
import { fetchLiveQuotes, normalizeQuote } from "../services/liveQuotes";
import { searchSymbols } from "../services/symbolSearch";
import {
  clearSearchHistory,
  loadSearchHistory,
  recordSearch,
  removeSearchEntry,
  saveSearchHistory,
} from "../services/searchHistoryStore";
import { uniqueCountriesFromResults } from "../utils/symbolExchange";
import { collectLookupSymbols, indexQuotesBySymbol } from "../utils/lookupQuotes";

const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

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
  const [quotesBySymbol, setQuotesBySymbol] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [history, setHistory] = useState(() => loadSearchHistory());
  const [countryFilter, setCountryFilter] = useState(null);

  const showResults = query.trim().length >= MIN_QUERY_LENGTH;

  const availableCountries = useMemo(() => uniqueCountriesFromResults(results), [results]);

  const filteredResults = useMemo(() => {
    if (!countryFilter) return results;
    return results.filter((result) => result.country === countryFilter);
  }, [results, countryFilter]);

  const ambiguousDescriptions = useMemo(() => {
    const counts = new Map();
    results.forEach((result) => {
      const key = (result.description ?? "").toUpperCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return new Set([...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key));
  }, [results]);

  const persistHistory = useCallback((next) => {
    saveSearchHistory(next);
    setHistory(next);
  }, []);

  // Quotes are a bonus enrichment: fetched in one batch for the visible
  // results, never surfaced as an error if a market is uncovered.
  const enrichWithQuotes = useCallback(async (lookupResults, signal) => {
    const symbols = collectLookupSymbols(lookupResults, 12);
    if (!symbols.length) {
      setQuotesBySymbol({});
      return;
    }
    try {
      const payload = await fetchLiveQuotes(symbols, { signal });
      if (signal?.aborted) return;
      setQuotesBySymbol(indexQuotesBySymbol(payload.quotes));
    } catch (quoteError) {
      if (signal?.aborted || quoteError.name === "AbortError") return;
      setQuotesBySymbol({});
    }
  }, []);

  const runLookup = useCallback(async (rawQuery, signal) => {
    const cleanQuery = rawQuery.trim();
    if (cleanQuery.length < MIN_QUERY_LENGTH) return;

    setStatus("loading");
    setError("");

    try {
      const payload = await searchSymbols(cleanQuery, { signal });
      if (signal?.aborted) return;
      setResults(payload.results);
      setQuotesBySymbol({});
      setCountryFilter(null);
      setStatus("ready");
      enrichWithQuotes(payload.results, signal);
    } catch (searchError) {
      if (signal?.aborted || searchError.name === "AbortError") return;
      setResults([]);
      setStatus("error");
      setError(searchError.message);
    }
  }, [enrichWithQuotes]);

  // Live autocomplete: debounce the typed query, cancel stale in-flight requests.
  useEffect(() => {
    if (query.trim().length < MIN_QUERY_LENGTH) return undefined;
    const controller = new AbortController();
    const handle = setTimeout(() => runLookup(query, controller.signal), DEBOUNCE_MS);
    return () => {
      clearTimeout(handle);
      controller.abort();
    };
  }, [query, runLookup]);

  const handleQueryChange = (event) => {
    const value = event.target.value;
    setQuery(value);
    if (value.trim().length < MIN_QUERY_LENGTH) {
      setResults([]);
      setQuotesBySymbol({});
      setStatus("idle");
      setError("");
    }
  };

  const runSearch = (event) => {
    event.preventDefault();
    // Explicit submit: search immediately (bypass the debounce).
    const controller = new AbortController();
    runLookup(query, controller.signal);
  };

  const replaySearch = (entry) => {
    setQuery(entry.query); // triggers the debounced effect
  };

  const removeHistoryEntry = (normalizedQuery) => {
    persistHistory(removeSearchEntry(history, normalizedQuery));
  };

  const clearAllHistory = () => {
    persistHistory(clearSearchHistory());
  };

  const clearQuery = () => {
    setQuery("");
    setResults([]);
    setQuotesBySymbol({});
    setStatus("idle");
    setError("");
  };

  const openResult = async (result) => {
    // Record the intent at selection time — the most meaningful moment.
    persistHistory(
      recordSearch(history, { query: query.trim() || result.symbol, resultsCount: results.length }),
    );
    setStatus("loading");
    setError("");

    try {
      const payload = await fetchLiveQuotes([result.symbol]);
      const quote = normalizeQuote(payload.quotes[0]);
      if (!quote) {
        const market = result.exchange ?? "ce marché";
        const where = result.country ? ` (${result.country})` : "";
        throw new Error(
          `Cotation indisponible pour ${result.symbol} — ${market}${where} n'est pas couvert par notre source de données gratuite.`,
        );
      }
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
            onChange={handleQueryChange}
            placeholder="Chercher une entreprise ou un symbole (ex: UnitedHealth, UNH, Nvidia...)"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-surface-800 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
          {query && (
            <button type="button" onClick={clearQuery} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5 cursor-pointer" aria-label="Effacer la recherche marché">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>
        <button type="submit" disabled={status === "loading"} className="px-4 py-2.5 rounded-xl bg-violet-500/15 border border-violet-500/30 text-sm font-medium text-violet-200 hover:bg-violet-500/20 disabled:opacity-50 cursor-pointer">
          Rechercher
        </button>
      </form>

      {error && <div className="text-xs text-amber-400">{error}</div>}

      {!showResults && history.length > 0 && (
        <div className="rounded-xl border border-white/5 bg-surface-900/40 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 bg-surface-800/70 border-b border-white/5">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock className="w-3.5 h-3.5" aria-hidden="true" />
              Recherches récentes ({history.length})
            </div>
            <button
              type="button"
              onClick={clearAllHistory}
              className="text-[11px] text-slate-500 hover:text-rose-300 cursor-pointer"
            >
              Effacer tout
            </button>
          </div>
          <ul className="divide-y divide-white/5">
            {history.map((entry) => (
              <li key={entry.normalizedQuery} className="flex items-center gap-2 px-4 py-2">
                <button
                  type="button"
                  onClick={() => replaySearch(entry)}
                  className="flex-1 text-left flex items-center justify-between gap-3 hover:text-white text-slate-300 cursor-pointer"
                  aria-label={`Relancer la recherche "${entry.query}"`}
                >
                  <span className="text-sm">{entry.query}</span>
                  <span className="text-[11px] text-slate-500">
                    {entry.resultsCount} résultat{entry.resultsCount > 1 ? "s" : ""} ·{" "}
                    {new Date(entry.recordedAt).toLocaleString("fr-CA", { dateStyle: "short", timeStyle: "short" })}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => removeHistoryEntry(entry.normalizedQuery)}
                  className="p-1 rounded hover:bg-white/5 text-slate-500 hover:text-rose-400 cursor-pointer"
                  aria-label={`Retirer "${entry.query}" de l'historique`}
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {showResults && results.length > 0 && (
        <div className="space-y-2">
          {availableCountries.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Globe2 className="w-4 h-4 text-slate-500" aria-hidden="true" />
              <button
                type="button"
                onClick={() => setCountryFilter(null)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                  countryFilter === null ? "bg-violet-500/20 text-violet-200" : "bg-surface-800 text-slate-400 hover:text-white hover:bg-white/5"
                }`}
                aria-pressed={countryFilter === null}
              >
                Tous ({results.length})
              </button>
              {availableCountries.map((country) => {
                const count = results.filter((result) => result.country === country).length;
                const isActive = countryFilter === country;
                return (
                  <button
                    key={country}
                    type="button"
                    onClick={() => setCountryFilter(country)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium cursor-pointer ${
                      isActive ? "bg-violet-500/20 text-violet-200" : "bg-surface-800 text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                    aria-pressed={isActive}
                  >
                    {country} ({count})
                  </button>
                );
              })}
            </div>
          )}

          <div className="rounded-xl border border-white/5 divide-y divide-white/5 overflow-hidden">
            {filteredResults.length === 0 ? (
              <div className="px-4 py-3 text-xs text-slate-500">
                Aucun résultat pour ce filtre pays. Réinitialise pour voir tous les marchés.
              </div>
            ) : (
              filteredResults.map((result) => {
                const isAmbiguous = ambiguousDescriptions.has((result.description ?? "").toUpperCase());
                const quote = quotesBySymbol[(result.symbol ?? "").toUpperCase()];
                return (
                  <button
                    key={result.symbol}
                    onClick={() => openResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-white/[0.03] transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-20 flex-shrink-0">
                        <div className="text-sm font-bold text-white">{result.base || result.symbol}</div>
                        {result.suffix && (
                          <div className="text-[10px] text-slate-500 font-mono">{result.suffix}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-sm font-medium text-slate-200 truncate">{result.description}</div>
                          {isAmbiguous && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 flex-shrink-0"
                              title="Plusieurs marchés cotent ce titre"
                            >
                              Multi-marché
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                          <span>{result.type || "Equity"}</span>
                          <span className="text-slate-600">·</span>
                          <span className={result.exchange ? "text-slate-400" : "text-amber-400"}>
                            {result.exchange ?? "Marché inconnu"}
                          </span>
                          {result.country && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px] font-medium">
                              {result.country}
                            </span>
                          )}
                        </div>
                      </div>
                      {quote && (
                        <div className="flex-shrink-0 text-right">
                          <div className="text-sm font-semibold text-white tabular-nums">
                            {quote.price.toFixed(2)}
                          </div>
                          {quote.changePct !== null && (
                            <div
                              className={`text-[11px] tabular-nums ${
                                quote.changePct >= 0 ? "text-emerald-400" : "text-rose-400"
                              }`}
                            >
                              {quote.changePct >= 0 ? "+" : ""}
                              {quote.changePct.toFixed(2)}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
