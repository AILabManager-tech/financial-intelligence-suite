import { useState, useCallback, lazy, Suspense } from "react";
import { Brain } from "lucide-react";
import { PORTFOLIO_ASSETS, MACRO_DATA, PIPELINE_HEALTH } from "./data/portfolioData";
import TopPerformers from "./components/TopPerformers";
import SafetyBadge from "./components/SafetyBadge";
import AssetTable from "./components/AssetTable";
import MarketPulse from "./components/MarketPulse";
import SearchFilter from "./components/SearchFilter";
import { getScoreColor } from "./utils/scoreTranslator";

const IntelligenceCard = lazy(() => import("./components/IntelligenceCard"));

function CardSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-surface-900 border border-white/5 animate-pulse">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-[72px] h-[72px] rounded-full bg-surface-700" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-48 rounded bg-surface-700" />
          <div className="h-4 w-32 rounded bg-surface-700" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="h-40 rounded-xl bg-surface-800" />
        <div className="h-40 rounded-xl bg-surface-800" />
      </div>
    </div>
  );
}

function PortfolioScore({ assets }) {
  const avg = Math.round(assets.reduce((s, a) => s + a.score, 0) / assets.length);
  const { text, ring } = getScoreColor(avg);

  return (
    <div className="flex items-center gap-3" role="status" aria-label={`Score portefeuille: ${avg} sur 100`}>
      <div className="relative w-14 h-14">
        <svg width={56} height={56} className="-rotate-90" aria-hidden="true">
          <circle cx={28} cy={28} r={24} fill="none" stroke="currentColor" className="text-white/5" strokeWidth={5} />
          <circle
            cx={28} cy={28} r={24} fill="none" stroke={ring} strokeWidth={5}
            strokeDasharray={2 * Math.PI * 24}
            strokeDashoffset={2 * Math.PI * 24 * (1 - avg / 100)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 1s ease-out" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-base font-bold ${text}`}>{avg}</span>
        </div>
      </div>
      <div className="hidden sm:block">
        <div className="text-sm text-slate-400">Score Portefeuille</div>
        <div className={`text-lg font-bold ${text}`}>
          {avg >= 80 ? "Excellent" : avg >= 65 ? "Bon" : "À surveiller"}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center animate-slide-up">
      <div className="w-16 h-16 rounded-2xl bg-surface-800 flex items-center justify-center mb-4">
        <span className="text-3xl" aria-hidden="true">🔍</span>
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Aucun actif trouvé</h3>
      <p className="text-sm text-slate-400 max-w-md">
        Aucun actif ne correspond à votre recherche ou aux filtres sélectionnés. Essayez d'ajuster vos critères.
      </p>
    </div>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [filtered, setFiltered] = useState(PORTFOLIO_ASSETS);

  const handleFilter = useCallback((results) => {
    setFiltered(results);
  }, []);

  const handleSelect = useCallback((asset) => {
    setSelected(asset);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="min-h-screen bg-surface-950">
      {/* Skip link for accessibility */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-violet-600 focus:text-white focus:rounded-lg">
        Aller au contenu principal
      </a>

      {/* Header */}
      <header className="border-b border-white/5 bg-surface-950/80 backdrop-blur-xl sticky top-0 z-50" role="banner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500/20 to-blue-500/20 border border-violet-500/20">
                <Brain className="w-6 h-6 text-violet-400" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Financial Intelligence Suite
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-500">
                  Analyse hybride IA + Quantitative — {PIPELINE_HEALTH.pipelinesActive} pipelines actifs
                </p>
              </div>
            </div>
            <PortfolioScore assets={PORTFOLIO_ASSETS} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8" role="main">
        {/* Detail panel (when asset selected) */}
        {selected && (
          <section aria-label="Analyse détaillée" className="p-4 sm:p-6 rounded-2xl bg-surface-900 border border-white/5 shadow-2xl shadow-black/30">
            <Suspense fallback={<CardSkeleton />}>
              <IntelligenceCard asset={selected} onClose={() => setSelected(null)} />
            </Suspense>
          </section>
        )}

        {/* Top performers */}
        <section aria-label="Meilleures opportunités">
          <TopPerformers assets={PORTFOLIO_ASSETS} onSelect={handleSelect} />
        </section>

        {/* Market Pulse + Safety */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
          <section aria-label="Indicateurs macroéconomiques">
            <MarketPulse macro={MACRO_DATA} />
          </section>
          <section aria-label="Intégrité et fiabilité">
            <SafetyBadge health={PIPELINE_HEALTH} assets={PORTFOLIO_ASSETS} />
          </section>
        </div>

        {/* Search & Filter */}
        <section aria-label="Recherche et filtres">
          <SearchFilter assets={PORTFOLIO_ASSETS} onFilter={handleFilter} />
        </section>

        {/* Full asset table or empty state */}
        <section aria-label="Liste des actifs">
          {filtered.length > 0 ? (
            <AssetTable assets={filtered} onSelect={handleSelect} />
          ) : (
            <EmptyState />
          )}
        </section>

        {/* Footer */}
        <footer className="pt-6 sm:pt-8 pb-4 border-t border-white/5 text-center" role="contentinfo">
          <p className="text-xs text-slate-600">
            Les analyses présentées sont générées automatiquement et ne constituent pas des conseils financiers.
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Financial Intelligence Suite v1.0 — Propulsé par 10 pipelines d'analyse
          </p>
        </footer>
      </main>
    </div>
  );
}
