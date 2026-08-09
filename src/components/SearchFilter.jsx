import { useMemo, useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { getSectorFamily } from "../utils/portfolioAnalytics";

function buildReviewFilters(buffettSummaries) {
  return [
    { label: "Tous les statuts", test: () => true },
    // `null >= 0` vaut true : sans le garde, une variation INCONNUE serait
    // classée « positive ». Un filtre de variation ne retient que le connu.
    { label: "Variation négative", test: (asset) => Number.isFinite(asset.changePct) && asset.changePct < 0 },
    { label: "Variation positive", test: (asset) => Number.isFinite(asset.changePct) && asset.changePct >= 0 },
    { label: "Source Finnhub", test: (asset) => asset.marketData?.source === "finnhub.io" },
    { label: "Source fallback", test: (asset) => asset.marketData?.source && asset.marketData.source !== "finnhub.io" },
    { label: "Buffett complet", test: (asset) => buffettSummaries[asset.symbol]?.status === "ready" },
    { label: "Buffett incomplet", test: (asset) => ["incomplete", "unavailable"].includes(buffettSummaries[asset.symbol]?.status) },
    { label: "Buffett favorable", test: (asset) => buffettSummaries[asset.symbol]?.signal === "BUY" },
  ];
}

export default function SearchFilter({ assets, buffettSummaries = {}, onFilter }) {
  const reviewFilters = useMemo(() => buildReviewFilters(buffettSummaries), [buffettSummaries]);
  const sectors = useMemo(() => [
    "Tous les secteurs",
    ...Array.from(new Set(assets.map((asset) => getSectorFamily(asset.sector)))).sort((a, b) => a.localeCompare(b)),
  ], [assets]);

  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("Tous les secteurs");
  const [reviewFilter, setReviewFilter] = useState(reviewFilters[0]);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = query || sector !== sectors[0] || reviewFilter.label !== reviewFilters[0].label;

  const applyFilters = useCallback((q, sec, review) => {
    let filtered = assets;

    if (q.trim()) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (a) => a.symbol.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)
      );
    }

    if (sec !== sectors[0]) {
      filtered = filtered.filter((a) => getSectorFamily(a.sector) === sec);
    }

    filtered = filtered.filter(review.test);

    onFilter(filtered);
  }, [assets, onFilter, sectors]);

  const handleQuery = (value) => {
    setQuery(value);
    applyFilters(value, sector, reviewFilter);
  };

  const handleSector = (value) => {
    setSector(value);
    applyFilters(query, value, reviewFilter);
  };

  const handleReviewFilter = (value) => {
    const filter = reviewFilters.find((r) => r.label === value) || reviewFilters[0];
    setReviewFilter(filter);
    applyFilters(query, sector, filter);
  };

  const clearAll = () => {
    setQuery("");
    setSector(sectors[0]);
    setReviewFilter(reviewFilters[0]);
    onFilter(assets);
  };

  return (
    <div className="animate-slide-up space-y-3">
      {/* Search bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleQuery(e.target.value)}
            placeholder="Rechercher un actif (ex: NVDA, Apple...)"
            aria-label="Rechercher un actif par symbole ou nom"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-surface-800 border border-white/5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-colors"
          />
          {query && (
            <button
              onClick={() => handleQuery("")}
              aria-label="Effacer la recherche"
              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          )}
        </div>

        <button
          onClick={() => setShowFilters(!showFilters)}
          aria-expanded={showFilters}
          aria-label="Afficher les filtres"
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors cursor-pointer ${
            showFilters || hasActiveFilters
              ? "bg-violet-500/10 border-violet-500/30 text-violet-300"
              : "bg-surface-800 border-white/5 text-slate-400 hover:text-white"
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filtres
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-violet-400" />
          )}
        </button>
      </div>

      {/* Filter dropdowns */}
      {showFilters && (
        <div className="flex items-center gap-3 flex-wrap animate-slide-up">
          <select
            value={sector}
            onChange={(e) => handleSector(e.target.value)}
            aria-label="Filtrer par secteur"
            className="px-3 py-2 rounded-lg bg-surface-800 border border-white/5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={reviewFilter.label}
            onChange={(e) => handleReviewFilter(e.target.value)}
            aria-label="Filtrer par statut opérateur"
            className="px-3 py-2 rounded-lg bg-surface-800 border border-white/5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {reviewFilters.map((r) => (
              <option key={r.label} value={r.label}>{r.label}</option>
            ))}
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="px-3 py-2 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
            >
              Réinitialiser
            </button>
          )}
        </div>
      )}
    </div>
  );
}
