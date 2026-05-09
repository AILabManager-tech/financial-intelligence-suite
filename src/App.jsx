import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import { AlertTriangle, Brain, RefreshCw, Wifi } from "lucide-react";
import { PORTFOLIO_ASSETS } from "./data/portfolioData";
import TopPerformers from "./components/TopPerformers";
import SafetyBadge from "./components/SafetyBadge";
import AssetTable from "./components/AssetTable";
import RiskCommandCenter from "./components/RiskCommandCenter";
import SearchFilter from "./components/SearchFilter";
import MarketLookup from "./components/MarketLookup";
import { fetchLiveQuotes, mergeQuotesIntoAssets } from "./services/liveQuotes";

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

function MarketBootScreen({ status }) {
  return (
    <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md p-6 rounded-xl bg-surface-900 border border-white/5 text-center">
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-violet-500/10 flex items-center justify-center">
          <RefreshCw className="w-5 h-5 text-violet-400 animate-spin" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-semibold text-white">Chargement des prix de marché</h1>
        <p className="text-sm text-slate-400 mt-2">
          Le tableau de bord s'affichera seulement après réception des valeurs actuelles.
        </p>
        {status.error && (
          <p className="text-xs text-amber-400 mt-3">{status.error}</p>
        )}
      </div>
    </div>
  );
}

function MarketDataStatus({ status, onRefresh }) {
  const isLive = status.mode === "live";
  const isLoading = status.mode === "loading";
  const Icon = isLive ? Wifi : AlertTriangle;
  const tone = isLive ? "text-emerald-400" : "text-amber-400";

  return (
    <div className="flex items-center gap-2 text-xs">
      <Icon className={`w-3.5 h-3.5 ${tone}`} aria-hidden="true" />
      <span className={tone}>{status.label}</span>
      {status.fetchedAt && (
        <span className="hidden sm:inline text-slate-600">
          {new Date(status.fetchedAt).toLocaleString("fr-CA", { dateStyle: "medium", timeStyle: "short" })}
        </span>
      )}
      <button
        type="button"
        onClick={onRefresh}
        disabled={isLoading}
        className="p-1 rounded-md hover:bg-white/5 disabled:opacity-50 cursor-pointer"
        aria-label="Rafraîchir les prix de marché"
      >
        <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

function HeaderSubtitle() {
  return (
    <p className="text-[11px] sm:text-xs text-slate-500">
      Observer le marché avec des données traçables
    </p>
  );
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [assets, setAssets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [marketStatus, setMarketStatus] = useState({
    mode: "booting",
    label: "Chargement prix live",
    fetchedAt: null,
  });

  const loadLiveQuotes = useCallback(async () => {
    setMarketStatus((current) => ({
      ...current,
      mode: "loading",
      label: "Chargement prix live",
    }));

    try {
      const symbols = PORTFOLIO_ASSETS.map((asset) => asset.symbol);
      const payload = await fetchLiveQuotes(symbols);
      const mergedAssets = mergeQuotesIntoAssets(PORTFOLIO_ASSETS, payload.quotes);
      const liveCount = mergedAssets.filter((asset) => asset.marketData?.status === "live").length;

      setAssets(mergedAssets);
      setFiltered(mergedAssets);
      setSelected((current) => {
        if (!current) return current;
        return mergedAssets.find((asset) => asset.symbol === current.symbol) ?? current;
      });
      setMarketStatus({
        mode: liveCount === mergedAssets.length ? "live" : "partial",
        label: liveCount === mergedAssets.length
          ? `Prix live · ${payload.primaryConfigured ? "Finnhub" : "Stooq fallback"}`
          : `${liveCount}/${mergedAssets.length} prix live`,
        fetchedAt: payload.fetchedAt,
      });
    } catch {
      setMarketStatus({
        mode: "error",
        label: "Prix indisponibles",
        fetchedAt: null,
        error: "Impossible de récupérer les prix de marché. Tableau masqué pour éviter d'afficher des valeurs statiques.",
      });
    }
  }, []);

  useEffect(() => {
    const refreshTimer = window.setTimeout(loadLiveQuotes, 0);
    return () => window.clearTimeout(refreshTimer);
  }, [loadLiveQuotes]);

  const handleFilter = useCallback((results) => {
    setFiltered(results);
  }, []);

  const handleSelect = useCallback((asset) => {
    setSelected(asset);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  if (!assets.length) {
    return <MarketBootScreen status={marketStatus} />;
  }

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
                <HeaderSubtitle />
              </div>
            </div>
            <MarketDataStatus status={marketStatus} onRefresh={loadLiveQuotes} />
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
        <section aria-label="Recherche marché globale">
          <MarketLookup onSelect={handleSelect} />
        </section>

        <section aria-label="Meilleures opportunités">
          <TopPerformers assets={assets} onSelect={handleSelect} />
        </section>

        <section aria-label="Intégrité et fiabilité">
          <SafetyBadge assets={assets} />
        </section>

        {/* Portfolio risk */}
        <section aria-label="Centre de risque portefeuille">
          <RiskCommandCenter assets={assets} />
        </section>

        {/* Search & Filter */}
        <section aria-label="Recherche et filtres">
          <SearchFilter assets={assets} onFilter={handleFilter} />
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
            Données de marché externes affichées avec provenance. Ne constitue pas un conseil financier.
          </p>
          <p className="text-xs text-slate-700 mt-1">
            Financial Intelligence Suite v1.0 — Mode factuel
          </p>
        </footer>
      </main>
    </div>
  );
}
