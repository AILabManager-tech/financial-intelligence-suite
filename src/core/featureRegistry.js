// Registre central des features (P0.1) — source unique de vérité du catalogue.
//
// Chaque feature montable (panel de la fiche actif, section du dashboard) est
// déclarée ici une seule fois. Le rendu (P0.3) et le store de layout (P0.2)
// liront ce registre au lieu de l'empilage en dur actuel de IntelligenceCard.jsx
// et de App.jsx.
//
// Choix d'architecture : le champ `componentKey` est une STRING stable, pas une
// référence au composant React. Le mapping componentKey -> composant se fera au
// niveau du rendu (P0.3). Ça garde ce module en données pures : testable en
// isolation, sans tirer recharts/katex/les panels (budget tests < 2s préservé).
//
// Convention (cf. CLAUDE.md) : toute nouvelle feature ajoutée après P0.1 DOIT
// s'enregistrer ici (id + label + category + surface + componentKey + dataDeps +
// defaultVisible + order). Un panel non enregistré n'est pas montable.

/**
 * @typedef {Object} FeatureDefinition
 * @property {string}   id             Identifiant stable, unique, kebab-case.
 * @property {string}   label          Libellé d'affichage (FR).
 * @property {string}   category       Catégorie de regroupement (UI Paramètres).
 * @property {'asset'|'dashboard'} surface  Surface où la feature se monte.
 * @property {string}   componentKey   Clé stable -> composant (résolue au rendu).
 * @property {string[]} dataDeps       Endpoints /api/* dont la feature dépend.
 * @property {boolean}  defaultVisible Visible par défaut (zéro régression = true).
 * @property {number}   order          Ordre canonique sur sa surface (croissant).
 */

export const VALID_SURFACES = Object.freeze(["asset", "dashboard"]);

// Ordre `order` = empilage actuel réel, pour que le défaut reproduise l'UI
// existante à l'identique (zéro régression quand P0.2/P0.3 prendront le relais).
const RAW_FEATURES = [
  // --- Surface fiche actif (IntelligenceCard, ordre d'empilage actuel) -------
  {
    id: "fundamentals",
    label: "Fondamentaux",
    category: "fundamentals",
    surface: "asset",
    componentKey: "FundamentalsPanel",
    dataDeps: ["fundamentals"],
    defaultVisible: true,
    order: 10,
  },
  {
    id: "buffett",
    label: "Analyse Buffett (DCF)",
    category: "fundamentals",
    surface: "asset",
    componentKey: "BuffettAnalysisPanel",
    dataDeps: ["fundamentals"],
    defaultVisible: true,
    order: 20,
  },
  {
    id: "analyst-ratings",
    label: "Recommandations analystes",
    category: "sentiment",
    surface: "asset",
    componentKey: "AnalystRatingsPanel",
    dataDeps: ["analyst-ratings"],
    defaultVisible: true,
    order: 30,
  },
  {
    id: "earnings",
    label: "Calendrier des résultats",
    category: "calendar",
    surface: "asset",
    componentKey: "EarningsCalendarPanel",
    dataDeps: ["earnings"],
    defaultVisible: true,
    order: 40,
  },
  {
    id: "dividends",
    label: "Historique des dividendes",
    category: "calendar",
    surface: "asset",
    componentKey: "DividendHistoryPanel",
    dataDeps: ["dividends"],
    defaultVisible: true,
    order: 50,
  },
  {
    id: "company-news",
    label: "Actualités société",
    category: "sentiment",
    surface: "asset",
    componentKey: "CompanyNewsPanel",
    dataDeps: ["company-news"],
    defaultVisible: true,
    order: 60,
  },
  {
    id: "sec-filings",
    label: "Dépôts SEC",
    category: "documents",
    surface: "asset",
    componentKey: "SecFilingsPanel",
    dataDeps: ["sec-filings"],
    defaultVisible: true,
    order: 70,
  },
  {
    id: "peers",
    label: "Comparaison sectorielle",
    category: "comparison",
    surface: "asset",
    componentKey: "PeersComparisonPanel",
    dataDeps: ["peers", "quotes"],
    defaultVisible: true,
    order: 80,
  },
  {
    id: "simulation",
    label: "Simulateur what-if",
    category: "simulation",
    surface: "asset",
    componentKey: "SimulationPanel",
    dataDeps: ["history"],
    defaultVisible: true,
    order: 90,
  },
  {
    id: "returns-matrix",
    label: "Rendements standards",
    category: "performance",
    surface: "asset",
    componentKey: "ReturnsMatrixPanel",
    dataDeps: ["history"],
    defaultVisible: true,
    order: 100,
  },
  {
    id: "returns-distribution",
    label: "Distribution des rendements",
    category: "performance",
    surface: "asset",
    componentKey: "ReturnsDistributionPanel",
    dataDeps: ["history"],
    defaultVisible: true,
    order: 110,
  },
  {
    id: "drawdown",
    label: "Analyse de repli (drawdown)",
    category: "performance",
    surface: "asset",
    componentKey: "DrawdownPanel",
    dataDeps: ["history"],
    defaultVisible: true,
    order: 120,
  },
  {
    id: "investment-journal",
    label: "Journal d'investissement",
    category: "decisions",
    surface: "asset",
    componentKey: "InvestmentJournalPanel",
    dataDeps: [],
    defaultVisible: true,
    order: 115,
  },
  {
    id: "insider-transactions",
    label: "Transactions d'initiés",
    category: "sentiment",
    surface: "asset",
    componentKey: "InsiderTransactionsPanel",
    dataDeps: ["insider-transactions"],
    defaultVisible: true,
    order: 35,
  },

  // --- Surface dashboard (bloc composable du tableau de bord, App.jsx) --------
  // `order` = empilage RÉEL du bloc central de App.jsx (vérifié 2026-05-29).
  // Encadrant ce bloc, des contrôles STRUCTURELS non catalogués : MarketLookup
  // (recherche, en tête) et le couple SearchFilter + AssetTable (filtre + grille
  // principale, en pied). Ce sont des chrome fixes — pas des panneaux qu'on
  // masque/déplace — donc hors registre. WatchlistPanel appartient à la route
  // /watchlist, pas au tableau de bord : elle n'est pas une feature de surface.
  {
    id: "top-performers",
    label: "Top performances",
    category: "overview",
    surface: "dashboard",
    componentKey: "TopPerformers",
    dataDeps: ["quotes"],
    defaultVisible: true,
    order: 10,
  },
  {
    id: "safety-badge",
    label: "Badge d'intégrité",
    category: "overview",
    surface: "dashboard",
    componentKey: "SafetyBadge",
    dataDeps: ["quotes"],
    defaultVisible: true,
    order: 20,
  },
  {
    id: "market-data-health",
    label: "État des fournisseurs",
    category: "monitoring",
    surface: "dashboard",
    componentKey: "MarketDataHealthPanel",
    dataDeps: ["health"],
    defaultVisible: true,
    order: 30,
  },
  {
    id: "operator-alerts",
    label: "Alertes opérateur",
    category: "monitoring",
    surface: "dashboard",
    componentKey: "OperatorAlerts",
    dataDeps: [],
    defaultVisible: true,
    order: 40,
  },
  {
    id: "alert-manager",
    label: "Alertes configurables",
    category: "monitoring",
    surface: "dashboard",
    componentKey: "AlertManager",
    dataDeps: [],
    defaultVisible: true,
    order: 50,
  },
  {
    id: "risk-command-center",
    label: "Centre de risque",
    category: "overview",
    surface: "dashboard",
    componentKey: "RiskCommandCenter",
    dataDeps: ["quotes"],
    defaultVisible: true,
    order: 60,
  },
  {
    id: "portfolio-manager",
    label: "Gestionnaire de positions",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "PortfolioManager",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 70,
  },
  {
    id: "currency-exposure",
    label: "Exposition devises",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "CurrencyExposurePanel",
    dataDeps: ["fx", "quotes"],
    defaultVisible: true,
    order: 80,
  },
  {
    id: "operational-stats",
    label: "Statistiques opérationnelles",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "OperationalStatsPanel",
    dataDeps: [],
    defaultVisible: true,
    order: 90,
  },
  {
    id: "portfolio-concentration",
    label: "Concentration & diversification",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "PortfolioConcentrationPanel",
    dataDeps: ["quotes"],
    defaultVisible: true,
    order: 100,
  },
  {
    id: "correlation-matrix",
    label: "Corrélation des positions",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "CorrelationMatrixPanel",
    dataDeps: ["history"],
    defaultVisible: true,
    order: 110,
  },
  {
    id: "twr",
    label: "Rendement pondéré-temps (TWR)",
    category: "performance",
    surface: "dashboard",
    componentKey: "TwrPanel",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 115,
  },
  {
    id: "portfolio-risk",
    label: "Risque — volatilité & repli",
    category: "performance",
    surface: "dashboard",
    componentKey: "PortfolioRiskPanel",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 120,
  },
  {
    id: "portfolio-ratios",
    label: "Ratios de risque ajusté",
    category: "performance",
    surface: "dashboard",
    componentKey: "PortfolioRatiosPanel",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 125,
  },
  {
    id: "portfolio-mwr",
    label: "Rendement pondéré-argent (MWR)",
    category: "performance",
    surface: "dashboard",
    componentKey: "PortfolioMwrPanel",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 117,
  },
  {
    id: "benchmark",
    label: "Comparaison au benchmark",
    category: "performance",
    surface: "dashboard",
    componentKey: "BenchmarkPanel",
    dataDeps: ["portfolio", "history"],
    defaultVisible: true,
    order: 130,
  },
  {
    id: "beta-correlation",
    label: "Beta & corrélation",
    category: "performance",
    surface: "dashboard",
    componentKey: "BetaCorrelationPanel",
    dataDeps: ["portfolio", "history"],
    defaultVisible: true,
    order: 135,
  },
  {
    id: "benchmark-ratios",
    label: "Ratios vs benchmark",
    category: "performance",
    surface: "dashboard",
    componentKey: "BenchmarkRatiosPanel",
    dataDeps: ["portfolio", "history"],
    defaultVisible: true,
    order: 140,
  },
  {
    id: "value-at-risk",
    label: "Valeur à risque (VaR)",
    category: "performance",
    surface: "dashboard",
    componentKey: "ValueAtRiskPanel",
    dataDeps: ["portfolio"],
    defaultVisible: true,
    order: 145,
  },
  {
    id: "compliance",
    label: "Conformité du mandat",
    category: "portfolio",
    surface: "dashboard",
    componentKey: "CompliancePanel",
    dataDeps: ["quotes"],
    defaultVisible: true,
    order: 105,
  },
];

/**
 * Registre gelé en profondeur (entrées + tableaux dataDeps immuables) afin
 * d'empêcher toute mutation accidentelle de la source de vérité au runtime.
 * @type {ReadonlyArray<Readonly<FeatureDefinition>>}
 */
export const FEATURE_REGISTRY = Object.freeze(
  RAW_FEATURES.map((feature) =>
    Object.freeze({ ...feature, dataDeps: Object.freeze([...feature.dataDeps]) }),
  ),
);

/**
 * Retourne la feature correspondant à l'id, ou undefined.
 * @param {string} id
 * @returns {Readonly<FeatureDefinition>|undefined}
 */
export function getFeatureById(id) {
  if (!id || typeof id !== "string") return undefined;
  return FEATURE_REGISTRY.find((feature) => feature.id === id);
}

/**
 * Retourne les features d'une surface, triées par `order` croissant.
 * @param {'asset'|'dashboard'} surface
 * @returns {ReadonlyArray<Readonly<FeatureDefinition>>}
 */
export function getFeaturesBySurface(surface) {
  return FEATURE_REGISTRY.filter((feature) => feature.surface === surface).sort(
    (a, b) => a.order - b.order,
  );
}

/**
 * Regroupe les features d'une surface par catégorie (pour l'UI Paramètres P0.4).
 * Chaque groupe conserve l'ordre canonique.
 * @param {'asset'|'dashboard'} surface
 * @returns {Record<string, ReadonlyArray<Readonly<FeatureDefinition>>>}
 */
export function groupFeaturesByCategory(surface) {
  const groups = {};
  for (const feature of getFeaturesBySurface(surface)) {
    (groups[feature.category] ??= []).push(feature);
  }
  return groups;
}

/**
 * Layout par défaut d'une surface : ids des features visibles par défaut, dans
 * l'ordre canonique. Sert de seed au store de layout (P0.2) — reproduit l'UI
 * actuelle à l'identique (zéro régression).
 * @param {'asset'|'dashboard'} surface
 * @returns {string[]}
 */
export function getDefaultLayout(surface) {
  return getFeaturesBySurface(surface)
    .filter((feature) => feature.defaultVisible)
    .map((feature) => feature.id);
}
