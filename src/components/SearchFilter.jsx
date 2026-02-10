import { useState, useCallback } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

const SECTORS = [
  "Tous les secteurs",
  "Technologie",
  "Automobile",
  "Finance",
  "Santé",
  "Consommation",
];

const SCORE_RANGES = [
  { label: "Tous les scores", min: 0, max: 100 },
  { label: "Opportunité Forte (90+)", min: 90, max: 100 },
  { label: "Opportunité Modérée (75-89)", min: 75, max: 89 },
  { label: "Surveiller (60-74)", min: 60, max: 74 },
  { label: "Prudence / Risque (<60)", min: 0, max: 59 },
];

export default function SearchFilter({ assets, onFilter }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState(SECTORS[0]);
  const [scoreRange, setScoreRange] = useState(SCORE_RANGES[0]);
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters = query || sector !== SECTORS[0] || scoreRange !== SCORE_RANGES[0];

  const applyFilters = useCallback((q, sec, range) => {
    let filtered = assets;

    if (q.trim()) {
      const lower = q.toLowerCase();
      filtered = filtered.filter(
        (a) => a.symbol.toLowerCase().includes(lower) || a.name.toLowerCase().includes(lower)
      );
    }

    if (sec !== SECTORS[0]) {
      filtered = filtered.filter((a) => a.sector.toLowerCase().includes(sec.toLowerCase()));
    }

    filtered = filtered.filter((a) => a.score >= range.min && a.score <= range.max);

    onFilter(filtered);
  }, [assets, onFilter]);

  const handleQuery = (value) => {
    setQuery(value);
    applyFilters(value, sector, scoreRange);
  };

  const handleSector = (value) => {
    setSector(value);
    applyFilters(query, value, scoreRange);
  };

  const handleScoreRange = (value) => {
    const range = SCORE_RANGES.find((r) => r.label === value) || SCORE_RANGES[0];
    setScoreRange(range);
    applyFilters(query, sector, range);
  };

  const clearAll = () => {
    setQuery("");
    setSector(SECTORS[0]);
    setScoreRange(SCORE_RANGES[0]);
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
            {SECTORS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={scoreRange.label}
            onChange={(e) => handleScoreRange(e.target.value)}
            aria-label="Filtrer par score"
            className="px-3 py-2 rounded-lg bg-surface-800 border border-white/5 text-sm text-slate-300 focus:outline-none focus:border-violet-500/50 cursor-pointer"
          >
            {SCORE_RANGES.map((r) => (
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
