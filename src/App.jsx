import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { AlertTriangle, Brain, RefreshCw, Wifi } from "lucide-react";
import TopPerformers from "./components/TopPerformers";
import SafetyBadge from "./components/SafetyBadge";
import AssetTable from "./components/AssetTable";
import RiskCommandCenter from "./components/RiskCommandCenter";
import SearchFilter from "./components/SearchFilter";
import MarketLookup from "./components/MarketLookup";
import MarketDataHealthPanel from "./components/MarketDataHealthPanel";
import OperatorAlerts from "./components/OperatorAlerts";
import WatchlistPanel from "./components/WatchlistPanel";
import PortfolioManager from "./components/PortfolioManager";
import { fetchLiveQuotes, mergeQuotesIntoAssets } from "./services/liveQuotes";
import { fetchBuffettSummaries } from "./services/buffettReadiness";
import { calculatePortfolioAnalytics } from "./utils/portfolioAnalytics";
import {
  isPortfolioAsset,
  loadPortfolioAssets,
  removePortfolioAsset,
  savePortfolioAssets,
  upsertPortfolioAsset,
} from "./services/portfolioStore";
import { fetchPortfolioFromApi, savePortfolioToApi } from "./services/portfolioApi";
import { fetchPortfolioSnapshots, savePortfolioSnapshot } from "./services/portfolioSnapshots";
import {
  isWatchlisted,
  loadWatchlistAssets,
  removeWatchlistAsset,
  saveWatchlistAssets,
  upsertWatchlistAsset,
} from "./services/watchlistStore";
import {
  isFavoriteSymbol,
  loadFavoriteSymbols,
  saveFavoriteSymbols,
  toggleFavoriteSymbol,
} from "./services/favoriteStore";
import {
  addAlert,
  loadAlerts,
  markAlertTriggered,
  removeAlert,
  saveAlerts,
  toggleAlertEnabled,
} from "./services/alertStore";
import { evaluateAlerts } from "./utils/alertEvaluator";
import AlertManager from "./components/AlertManager";
import ThemeSelector from "./components/ThemeSelector";
import LayoutSurface from "./components/LayoutSurface";
import SettingsPage from "./components/SettingsPage";
import DemoPortfolioPanel from "./components/DemoPortfolioPanel";
import { useLayout } from "./core/layoutContext";
import { applyTheme, loadTheme } from "./services/themeStore";

// Maps the registry componentKeys of the "dashboard" surface to their
// components. Render order + visibility come from the layout store (P0.2) via
// LayoutSurface. The dashboard chrome (MarketLookup search, SearchFilter +
// AssetTable grid) is intentionally NOT here — it frames the composable block
// at fixed positions (see featureRegistry dashboard comment).
const DASHBOARD_FEATURE_COMPONENTS = {
  TopPerformers,
  SafetyBadge,
  MarketDataHealthPanel,
  OperatorAlerts,
  AlertManager,
  RiskCommandCenter,
  PortfolioManager,
};

// Apply persisted theme synchronously at module load so the first paint
// already reflects the user's choice — avoids a flash of FIS default when
// they previously selected Matrix/Cyber/Light.
applyTheme(loadTheme());

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
  const [portfolioAssets, setPortfolioAssets] = useState(() => loadPortfolioAssets([]));
  const [watchlistAssets, setWatchlistAssets] = useState(() => loadWatchlistAssets([]));
  const [favoriteSymbols, setFavoriteSymbols] = useState(() => loadFavoriteSymbols([]));
  const [alerts, setAlerts] = useState(() => loadAlerts());
  const [alertTriggers, setAlertTriggers] = useState([]);
  const [assets, setAssets] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [buffettSummaries, setBuffettSummaries] = useState({});
  const [portfolioSnapshots, setPortfolioSnapshots] = useState([]);
  const [currentPath, setCurrentPath] = useState(() => window.location.pathname || "/");
  const [marketStatus, setMarketStatus] = useState({
    mode: "booting",
    label: "Chargement prix live",
    fetchedAt: null,
  });

  const isWatchlistRoute = currentPath === "/watchlist";
  const isSettingsRoute = currentPath === "/settings";
  const isDemoRoute = currentPath === "/demo";
  const isDashboardRoute = !isWatchlistRoute && !isSettingsRoute && !isDemoRoute;
  const layout = useLayout();

  useEffect(() => {
    let active = true;

    fetchPortfolioFromApi()
      .then((remoteAssets) => {
        if (active && remoteAssets.length > 0) {
          setPortfolioAssets(remoteAssets);
        }
      })
      .catch(() => {
        // localStorage remains the offline fallback.
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname || "/");
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  useEffect(() => {
    let active = true;

    fetchPortfolioSnapshots()
      .then((snapshots) => {
        if (active) {
          setPortfolioSnapshots(snapshots);
        }
      })
      .catch(() => {
        if (active) {
          setPortfolioSnapshots([]);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const persistPortfolio = useCallback((nextAssets) => {
    savePortfolioAssets(nextAssets);
    savePortfolioToApi(nextAssets).catch(() => {
      // Browser storage is the durable fallback in local/dev mode.
    });
  }, []);

  const persistWatchlist = useCallback((nextAssets) => {
    saveWatchlistAssets(nextAssets);
    setWatchlistAssets(nextAssets);
  }, []);

  const persistFavorites = useCallback((nextSymbols) => {
    saveFavoriteSymbols(nextSymbols);
    setFavoriteSymbols(nextSymbols);
  }, []);

  const alertsRef = useRef(alerts);
  const assetsRef = useRef(assets);

  useEffect(() => {
    alertsRef.current = alerts;
  }, [alerts]);

  useEffect(() => {
    assetsRef.current = assets;
  }, [assets]);

  useEffect(() => {
    if (!assets.length) {
      return undefined;
    }

    const controller = new AbortController();

    fetchBuffettSummaries(assets, { signal: controller.signal })
      .then((summaries) => {
        if (!controller.signal.aborted) {
          setBuffettSummaries(summaries);
        }
      });

    return () => controller.abort();
  }, [assets]);

  const evaluateAndPersistAlerts = useCallback((sourceAlerts, sourceAssets, evaluatedAt) => {
    if (!sourceAssets?.length || !sourceAlerts?.length) {
      setAlertTriggers([]);
      return sourceAlerts ?? [];
    }
    const triggers = evaluateAlerts(sourceAlerts, sourceAssets, evaluatedAt);
    setAlertTriggers(triggers);

    let stamped = sourceAlerts;
    triggers.forEach((trigger) => {
      stamped = markAlertTriggered(stamped, trigger.alertId, trigger.triggeredAt);
    });
    if (stamped !== sourceAlerts) {
      saveAlerts(stamped);
      setAlerts(stamped);
    }
    return stamped;
  }, []);

  const persistAlerts = useCallback((nextAlerts) => {
    saveAlerts(nextAlerts);
    setAlerts(nextAlerts);
    evaluateAndPersistAlerts(nextAlerts, assetsRef.current, new Date().toISOString());
  }, [evaluateAndPersistAlerts]);

  const handleAddAlert = useCallback((draft) => {
    persistAlerts(addAlert(alertsRef.current, draft));
  }, [persistAlerts]);

  const handleRemoveAlert = useCallback((alertId) => {
    persistAlerts(removeAlert(alertsRef.current, alertId));
  }, [persistAlerts]);

  const handleToggleAlert = useCallback((alertId) => {
    persistAlerts(toggleAlertEnabled(alertsRef.current, alertId));
  }, [persistAlerts]);

  const navigateTo = useCallback((nextPath) => {
    if (window.location.pathname === nextPath) return;
    window.history.pushState({}, "", nextPath);
    setCurrentPath(nextPath);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const loadLiveQuotes = useCallback(async () => {
    setMarketStatus((current) => ({
      ...current,
      mode: "loading",
      label: "Chargement prix live",
    }));

    if (!portfolioAssets.length) {
      setAssets([]);
      setFiltered([]);
      setMarketStatus({
        mode: "live",
        label: "Aucun actif suivi",
        fetchedAt: new Date().toISOString(),
      });
      return;
    }

    try {
      const symbols = portfolioAssets.map((asset) => asset.symbol);
      const payload = await fetchLiveQuotes(symbols);
      const mergedAssets = mergeQuotesIntoAssets(portfolioAssets, payload.quotes);
      const liveCount = mergedAssets.filter((asset) => asset.marketData?.status === "live").length;
      const analytics = calculatePortfolioAnalytics(mergedAssets);

      setAssets(mergedAssets);
      setFiltered(mergedAssets);
      setSelected((current) => {
        if (!current) return current;
        return mergedAssets.find((asset) => asset.symbol === current.symbol) ?? current;
      });
      setMarketStatus({
        mode: liveCount === mergedAssets.length ? "live" : "partial",
        label: liveCount === mergedAssets.length
          ? `Prix live · ${payload.primaryConfigured ? "Finnhub" : "Stooq fallback"}${payload.cacheStatus === "hit" ? " · cache" : ""}`
          : `${liveCount}/${mergedAssets.length} prix live`,
        fetchedAt: payload.fetchedAt,
        cacheStatus: payload.cacheStatus,
      });

      if (liveCount > 0) {
        evaluateAndPersistAlerts(alertsRef.current, mergedAssets, payload.fetchedAt);
      }

      if (liveCount > 0 && analytics.totalMarketValue > 0) {
        savePortfolioSnapshot({
          capturedAt: payload.fetchedAt,
          totalMarketValue: analytics.totalMarketValue,
          totalCost: analytics.totalCost,
          unrealizedPnl: analytics.unrealizedPnl,
          unrealizedPnlPct: analytics.unrealizedPnlPct,
          positionsCount: mergedAssets.length,
          liveQuotesCount: liveCount,
        })
          .then((snapshot) => {
            setPortfolioSnapshots((current) => [...current, snapshot].slice(-120));
          })
          .catch(() => {
            // Snapshot history must never block live market display.
          });
      }
    } catch {
      setMarketStatus({
        mode: "error",
        label: "Prix indisponibles",
        fetchedAt: null,
        error: "Impossible de récupérer les prix de marché. Tableau masqué pour éviter d'afficher des valeurs statiques.",
      });
    }
  }, [portfolioAssets, evaluateAndPersistAlerts]);

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

  const handleSavePosition = useCallback((asset, position) => {
    const updatedPortfolio = upsertPortfolioAsset(portfolioAssets, asset, position);
    persistPortfolio(updatedPortfolio);
    setPortfolioAssets(updatedPortfolio);

    const updatedAssets = upsertPortfolioAsset(assets, asset, position);
    setAssets(updatedAssets);
    setFiltered(updatedAssets);
    setSelected((current) => current?.symbol === asset.symbol
      ? upsertPortfolioAsset([current], asset, position)[0]
      : current);
  }, [assets, persistPortfolio, portfolioAssets]);

  const handleImportPositions = useCallback((importedPositions) => {
    if (!Array.isArray(importedPositions) || importedPositions.length === 0) return;

    let nextPortfolio = portfolioAssets;
    importedPositions.forEach((position) => {
      const existing = nextPortfolio.find((asset) => asset.symbol === position.symbol);
      const baseAsset = existing ?? {
        symbol: position.symbol,
        name: position.symbol,
        sector: "Portefeuille — Importé",
        price: position.averageCost,
        change: 0,
        changePct: 0,
        volume: 0,
      };
      nextPortfolio = upsertPortfolioAsset(nextPortfolio, baseAsset, {
        quantity: position.quantity,
        averageCost: position.averageCost,
        targetWeight: position.targetWeight,
      });
    });

    persistPortfolio(nextPortfolio);
    setPortfolioAssets(nextPortfolio);
  }, [persistPortfolio, portfolioAssets]);

  const handleRemoveAsset = useCallback((symbol) => {
    const updatedPortfolio = removePortfolioAsset(portfolioAssets, symbol);
    persistPortfolio(updatedPortfolio);
    setPortfolioAssets(updatedPortfolio);
    setAssets((current) => removePortfolioAsset(current, symbol));
    setFiltered((current) => removePortfolioAsset(current, symbol));
    setSelected((current) => current?.symbol === symbol ? null : current);
  }, [persistPortfolio, portfolioAssets]);

  const handleToggleWatchlist = useCallback((asset) => {
    const normalizedAsset = {
      ...asset,
      addedAt: asset.addedAt ?? new Date().toISOString(),
    };
    const nextAssets = isWatchlisted(watchlistAssets, normalizedAsset.symbol)
      ? removeWatchlistAsset(watchlistAssets, normalizedAsset.symbol)
      : upsertWatchlistAsset(watchlistAssets, normalizedAsset);
    persistWatchlist(nextAssets);
  }, [persistWatchlist, watchlistAssets]);

  const handleToggleFavorite = useCallback((symbol) => {
    persistFavorites(toggleFavoriteSymbol(favoriteSymbols, symbol));
  }, [favoriteSymbols, persistFavorites]);

  // Per-component props for the layout-driven dashboard block. Keyed by the
  // registry componentKey; LayoutSurface feeds each visible panel its slice.
  const dashboardPanelProps = {
    TopPerformers: { assets, buffettSummaries, onSelect: handleSelect },
    SafetyBadge: { assets },
    MarketDataHealthPanel: {},
    OperatorAlerts: { assets, userTriggers: alertTriggers },
    AlertManager: {
      alerts,
      availableSymbols: portfolioAssets.map((asset) => asset.symbol),
      onAddAlert: handleAddAlert,
      onRemoveAlert: handleRemoveAlert,
      onToggleAlert: handleToggleAlert,
    },
    RiskCommandCenter: { assets, snapshots: portfolioSnapshots },
    PortfolioManager: {
      assets,
      onSavePosition: handleSavePosition,
      onRemoveAsset: handleRemoveAsset,
      onImportPositions: handleImportPositions,
    },
  };

  // Settings and the demo simulator don't depend on live quotes — keep them
  // reachable while prices load.
  if (!assets.length && portfolioAssets.length > 0 && !isSettingsRoute && !isDemoRoute) {
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
          <div className="flex items-center justify-between gap-4">
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
            <div className="flex items-center gap-2 flex-wrap justify-end">
              <div className="flex items-center gap-1 rounded-xl border border-white/5 bg-surface-900/70 p-1">
                <button
                  type="button"
                  onClick={() => navigateTo("/")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDashboardRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Tableau de bord
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/watchlist")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isWatchlistRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Watchlist
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/demo")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isDemoRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Démo
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isSettingsRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Paramètres
                </button>
              </div>
              <ThemeSelector />
              <MarketDataStatus status={marketStatus} onRefresh={loadLiveQuotes} />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8" role="main">
        {isSettingsRoute ? (
          <SettingsPage />
        ) : isDemoRoute ? (
          <DemoPortfolioPanel />
        ) : isWatchlistRoute ? (
          <>
            <section aria-label="Recherche marché globale">
              <MarketLookup onSelect={handleSelect} />
            </section>

            {selected && (
              <section aria-label="Analyse détaillée" className="p-4 sm:p-6 rounded-2xl bg-surface-900 border border-white/5 shadow-2xl shadow-black/30">
                <Suspense fallback={<CardSkeleton />}>
                  <IntelligenceCard
                    asset={selected}
                    onClose={() => setSelected(null)}
                    onSavePosition={handleSavePosition}
                    onToggleWatchlist={handleToggleWatchlist}
                    onToggleFavorite={handleToggleFavorite}
                    isInPortfolio={isPortfolioAsset(portfolioAssets, selected.symbol)}
                    isInWatchlist={isWatchlisted(watchlistAssets, selected.symbol)}
                    isFavorite={isFavoriteSymbol(favoriteSymbols, selected.symbol)}
                  />
                </Suspense>
              </section>
            )}

            <section aria-label="Watchlist indépendante">
              <WatchlistPanel
                assets={watchlistAssets}
                favoriteSymbols={favoriteSymbols}
                onSelect={handleSelect}
                onRemove={(symbol) => persistWatchlist(removeWatchlistAsset(watchlistAssets, symbol))}
                onToggleFavorite={handleToggleFavorite}
              />
            </section>
          </>
        ) : (
          <>
            {/* Detail panel (when asset selected) */}
            {selected && (
              <section aria-label="Analyse détaillée" className="p-4 sm:p-6 rounded-2xl bg-surface-900 border border-white/5 shadow-2xl shadow-black/30">
                <Suspense fallback={<CardSkeleton />}>
                  <IntelligenceCard
                    asset={selected}
                    onClose={() => setSelected(null)}
                    onSavePosition={handleSavePosition}
                    onToggleWatchlist={handleToggleWatchlist}
                    onToggleFavorite={handleToggleFavorite}
                    isInPortfolio={isPortfolioAsset(portfolioAssets, selected.symbol)}
                    isInWatchlist={isWatchlisted(watchlistAssets, selected.symbol)}
                    isFavorite={isFavoriteSymbol(favoriteSymbols, selected.symbol)}
                  />
                </Suspense>
              </section>
            )}

            {/* Top performers */}
            <section aria-label="Recherche marché globale">
              <MarketLookup onSelect={handleSelect} />
            </section>

            {/* Composable dashboard block — order & visibility from the layout
                store (P0.2), driven by the feature registry (P0.1). */}
            <LayoutSurface
              surface="dashboard"
              layout={layout}
              components={DASHBOARD_FEATURE_COMPONENTS}
              propsFor={(feature) => dashboardPanelProps[feature.componentKey] ?? {}}
              wrapItem={(feature, node) => (
                <section aria-label={feature.label}>{node}</section>
              )}
            />

            {/* Search & Filter */}
            <section aria-label="Recherche et filtres">
              <SearchFilter assets={assets} buffettSummaries={buffettSummaries} onFilter={handleFilter} />
            </section>

            {/* Full asset table or empty state */}
            <section aria-label="Liste des actifs">
              {filtered.length > 0 ? (
                <AssetTable assets={filtered} buffettSummaries={buffettSummaries} onSelect={handleSelect} />
              ) : (
                <EmptyState />
              )}
            </section>
          </>
        )}

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
