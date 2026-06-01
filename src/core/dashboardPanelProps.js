// Dashboard panel props mapping — pure. Extracted from App.jsx so a test can
// assert that EVERY registered dashboard panel receives a props entry: a missing
// entry means the panel mounts with no data and silently shows its empty state
// (the P4.12 OperationalStatsPanel regression this module guards against). App
// builds the `deps` object from its state/handlers and passes it here verbatim.

export function buildDashboardPanelProps(deps) {
  const {
    assets,
    buffettSummaries,
    onSelect,
    alertTriggers,
    alerts,
    availableSymbols,
    onAddAlert,
    onRemoveAlert,
    onToggleAlert,
    snapshots,
    onSavePosition,
    onRemoveAsset,
    onImportPositions,
    baseCurrency,
    transactions,
    activePortfolioId,
  } = deps;

  return {
    TopPerformers: { assets, buffettSummaries, onSelect },
    SafetyBadge: { assets },
    MarketDataHealthPanel: {},
    OperatorAlerts: { assets, userTriggers: alertTriggers },
    AlertManager: { alerts, availableSymbols, onAddAlert, onRemoveAlert, onToggleAlert },
    RiskCommandCenter: { assets, snapshots },
    PortfolioManager: { assets, onSavePosition, onRemoveAsset, onImportPositions },
    CurrencyExposurePanel: { assets, baseCurrency },
    OperationalStatsPanel: { transactions, method: "fifo" },
    PortfolioConcentrationPanel: { assets },
    CorrelationMatrixPanel: { assets },
    TwrPanel: { snapshots, transactions },
    PortfolioRiskPanel: { snapshots, transactions },
    PortfolioRatiosPanel: { snapshots, transactions },
    PortfolioMwrPanel: { snapshots, transactions },
    BenchmarkPanel: { snapshots, transactions },
    BetaCorrelationPanel: { snapshots, transactions },
    BenchmarkRatiosPanel: { snapshots, transactions },
    ValueAtRiskPanel: { snapshots, transactions },
    CompliancePanel: { assets, portfolioId: activePortfolioId ?? "default" },
    RebalancePanel: { assets },
  };
}
