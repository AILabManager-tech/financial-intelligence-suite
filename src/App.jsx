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
import {
  fetchPortfolioFromApi,
  savePortfolioToApi,
  savePortfolioMandateToApi,
  deletePortfolioMandateFromApi,
} from "./services/portfolioApi";
import {
  loadPortfolioList,
  savePortfolioList,
  createPortfolio,
  updatePortfolio,
  removePortfolio,
  setActivePortfolio,
  getActivePortfolio,
} from "./services/portfolioListStore";
import PortfolioSelector from "./components/PortfolioSelector";
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
import TransactionJournalPanel from "./components/TransactionJournalPanel";
import CurrencyExposurePanel from "./components/CurrencyExposurePanel";
import OperationalStatsPanel from "./components/OperationalStatsPanel";
import PortfolioConcentrationPanel from "./components/PortfolioConcentrationPanel";
import CorrelationMatrixPanel from "./components/CorrelationMatrixPanel";
import TwrPanel from "./components/TwrPanel";
import PortfolioRiskPanel from "./components/PortfolioRiskPanel";
import PortfolioRatiosPanel from "./components/PortfolioRatiosPanel";
import PortfolioMwrPanel from "./components/PortfolioMwrPanel";
import BenchmarkPanel from "./components/BenchmarkPanel";
import BetaCorrelationPanel from "./components/BetaCorrelationPanel";
import BenchmarkRatiosPanel from "./components/BenchmarkRatiosPanel";
import ValueAtRiskPanel from "./components/ValueAtRiskPanel";
import CompliancePanel from "./components/CompliancePanel";
import {
  addTransaction,
  loadTransactions,
  removeTransaction,
  saveTransactions,
} from "./services/transactionStore";
import { fetchTransactionsFromApi, saveTransactionsToApi } from "./services/transactionApi";
import { useLayout } from "./core/layoutContext";
import { buildDashboardPanelProps } from "./core/dashboardPanelProps";
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
  CurrencyExposurePanel,
  OperationalStatsPanel,
  PortfolioConcentrationPanel,
  CorrelationMatrixPanel,
  TwrPanel,
  PortfolioRiskPanel,
  PortfolioRatiosPanel,
  PortfolioMwrPanel,
  BenchmarkPanel,
  BetaCorrelationPanel,
  BenchmarkRatiosPanel,
  ValueAtRiskPanel,
  CompliancePanel,
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
  const [portfolioList, setPortfolioList] = useState(() => loadPortfolioList());
  const activeId = portfolioList.activeId;
  const [portfolioAssets, setPortfolioAssets] = useState(() => loadPortfolioAssets([], portfolioList.activeId));
  const [transactions, setTransactions] = useState(() => loadTransactions(portfolioList.activeId));
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
  const isTransactionsRoute = currentPath === "/transactions";
  const isDashboardRoute = !isWatchlistRoute && !isSettingsRoute && !isDemoRoute && !isTransactionsRoute;
  const layout = useLayout();

  useEffect(() => {
    let active = true;

    // Dev SQLite mirrors every mandate (P3.2c+); hydrate the active one.
    fetchPortfolioFromApi(activeId)
      .then((remoteAssets) => {
        if (active && remoteAssets.length > 0) {
          setPortfolioAssets(remoteAssets);
        }
      })
      .catch(() => {
        // localStorage remains the offline fallback.
      });

    // Transactions are mirrored server-side too (Phase 3 closure).
    fetchTransactionsFromApi(activeId)
      .then((remoteTransactions) => {
        if (active && remoteTransactions.length > 0) {
          setTransactions(remoteTransactions);
        }
      })
      .catch(() => {
        // localStorage (transactionStore) is the offline fallback.
      });

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    fetchPortfolioSnapshots(120, activeId)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistPortfolio = useCallback((nextAssets) => {
    savePortfolioAssets(nextAssets, activeId);
    // Dev SQLite mirrors the active mandate (P3.2c).
    savePortfolioToApi(nextAssets, activeId).catch(() => {
      // Browser storage is the durable fallback in local/dev mode.
    });
  }, [activeId]);

  // --- Multi-portfolio (mandates, P3.2) --------------------------------------
  const persistPortfolioList = useCallback((nextState) => {
    savePortfolioList(nextState);
    setPortfolioList(nextState);
  }, []);

  // Load a mandate's positions and reset the live view so quotes refetch
  // (loadLiveQuotes is keyed on portfolioAssets).
  const activateMandate = useCallback((nextState) => {
    persistPortfolioList(nextState);
    const id = nextState.activeId;
    setPortfolioAssets(loadPortfolioAssets([], id));
    setTransactions(loadTransactions(id));
    setAssets([]);
    setFiltered([]);
    setSelected(null);
    // In dev, positions/snapshots are mirrored per mandate in SQLite (P3.2c);
    // re-hydrate the activated mandate from the API.
    fetchPortfolioFromApi(id)
      .then((remoteAssets) => {
        if (remoteAssets.length > 0) setPortfolioAssets(remoteAssets);
      })
      .catch(() => {});
    fetchTransactionsFromApi(id)
      .then((remoteTransactions) => {
        if (remoteTransactions.length > 0) setTransactions(remoteTransactions);
      })
      .catch(() => {});
    fetchPortfolioSnapshots(120, id)
      .then(setPortfolioSnapshots)
      .catch(() => setPortfolioSnapshots([]));
  }, [persistPortfolioList]);

  const handleSwitchPortfolio = useCallback((id) => {
    if (id === portfolioList.activeId) return;
    activateMandate(setActivePortfolio(portfolioList, id));
  }, [portfolioList, activateMandate]);

  const handleCreatePortfolio = useCallback((draft) => {
    const next = createPortfolio(portfolioList, draft);
    if (next === portfolioList) return; // empty name ignored
    const mandate = next.portfolios.find((p) => p.id === next.activeId);
    if (mandate) savePortfolioMandateToApi(mandate).catch(() => {});
    activateMandate(next);
  }, [portfolioList, activateMandate]);

  const handleRenamePortfolio = useCallback((id, fields) => {
    const next = updatePortfolio(portfolioList, id, fields);
    const mandate = next.portfolios.find((p) => p.id === id);
    if (mandate) savePortfolioMandateToApi(mandate).catch(() => {});
    persistPortfolioList(next);
  }, [portfolioList, persistPortfolioList]);

  const handleDeletePortfolio = useCallback((id) => {
    const next = removePortfolio(portfolioList, id);
    if (next === portfolioList) return; // last mandate protected
    deletePortfolioMandateFromApi(id).catch(() => {});
    if (next.activeId !== portfolioList.activeId) {
      activateMandate(next);
    } else {
      persistPortfolioList(next);
    }
  }, [portfolioList, activateMandate, persistPortfolioList]);

  // --- Transactions journal (tax lots, P3.3b) --------------------------------
  // Scoped by mandate like positions (localStorage only; the dev SQLite mirror
  // is deferred with the rest of the server-side mandate scope, P3.2c).
  const persistTransactions = useCallback((next) => {
    saveTransactions(next, activeId);
    setTransactions(next);
    // Dev SQLite mirrors the active mandate's journal (Phase 3 closure).
    saveTransactionsToApi(next, activeId).catch(() => {
      // Browser storage is the durable fallback in local/dev mode.
    });
  }, [activeId]);

  const handleAddTransaction = useCallback((draft) => {
    persistTransactions(addTransaction(transactions, draft));
  }, [persistTransactions, transactions]);

  const handleRemoveTransaction = useCallback((id) => {
    persistTransactions(removeTransaction(transactions, id));
  }, [persistTransactions, transactions]);

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
  // Accrual journalier des snapshots : dernier jour capturé par mandat (évite de
  // POST un snapshot à chaque tick de cotation 20 s — un point par jour suffit).
  const snapshotDayRef = useRef(new Map());

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
        const captureDay = (payload.fetchedAt ?? new Date().toISOString()).slice(0, 10);
        // Un seul snapshot par mandat par jour calendaire. Le serveur upsert de
        // toute façon (dernière capture du jour gagne) ; ce garde évite de POST à
        // chaque tick. Valeur RÉELLE (positions × cotations), jamais fabriquée ;
        // pas de backfill des jours passés (les quantités ont changé).
        if (snapshotDayRef.current.get(activeId) !== captureDay) {
          savePortfolioSnapshot({
            capturedAt: payload.fetchedAt,
            totalMarketValue: analytics.totalMarketValue,
            totalCost: analytics.totalCost,
            unrealizedPnl: analytics.unrealizedPnl,
            unrealizedPnlPct: analytics.unrealizedPnlPct,
            positionsCount: mergedAssets.length,
            liveQuotesCount: liveCount,
          }, activeId)
            .then((snapshot) => {
              snapshotDayRef.current.set(activeId, captureDay);
              setPortfolioSnapshots((current) => {
                const day = (snapshot.capturedAt ?? "").slice(0, 10);
                const withoutToday = current.filter(
                  (entry) => (entry.capturedAt ?? "").slice(0, 10) !== day,
                );
                return [...withoutToday, snapshot].slice(-120);
              });
            })
            .catch(() => {
              // Snapshot history must never block live market display.
            });
        }
      }
    } catch {
      setMarketStatus({
        mode: "error",
        label: "Prix indisponibles",
        fetchedAt: null,
        error: "Impossible de récupérer les prix de marché. Tableau masqué pour éviter d'afficher des valeurs statiques.",
      });
    }
  }, [portfolioAssets, evaluateAndPersistAlerts, activeId]);

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
  const dashboardPanelProps = buildDashboardPanelProps({
    assets,
    buffettSummaries,
    onSelect: handleSelect,
    alertTriggers,
    alerts,
    availableSymbols: portfolioAssets.map((asset) => asset.symbol),
    onAddAlert: handleAddAlert,
    onRemoveAlert: handleRemoveAlert,
    onToggleAlert: handleToggleAlert,
    snapshots: portfolioSnapshots,
    onSavePosition: handleSavePosition,
    onRemoveAsset: handleRemoveAsset,
    onImportPositions: handleImportPositions,
    baseCurrency: getActivePortfolio(portfolioList).baseCurrency,
    transactions,
    activePortfolioId: portfolioList.activeId,
  });

  // Settings and the demo simulator don't depend on live quotes — keep them
  // reachable while prices load.
  if (!assets.length && portfolioAssets.length > 0 && !isSettingsRoute && !isDemoRoute && !isTransactionsRoute) {
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
                  onClick={() => navigateTo("/transactions")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isTransactionsRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Transactions
                </button>
                <button
                  type="button"
                  onClick={() => navigateTo("/settings")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium ${isSettingsRoute ? "bg-white/10 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  Paramètres
                </button>
              </div>
              <PortfolioSelector
                state={portfolioList}
                onSwitch={handleSwitchPortfolio}
                onCreate={handleCreatePortfolio}
                onRename={handleRenamePortfolio}
                onDelete={handleDeletePortfolio}
              />
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
        ) : isTransactionsRoute ? (
          <TransactionJournalPanel
            transactions={transactions}
            onAdd={handleAddTransaction}
            onRemove={handleRemoveTransaction}
          />
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
