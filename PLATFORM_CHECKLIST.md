# Financial Intelligence Suite — checklist plateforme cible

Statut au 2026-05-10 (post-bloc cleanup audit F4 + F5). Objectif: mesurer l'écart entre l'application actuelle et une plateforme financière complète, factuelle, exploitable et déployable.

Légende:
- [x] Programmé dans le modèle actuel
- [~] Partiel / prototype fonctionnel
- [ ] Non programmé

## 1. Données marché

- [x] Quotes live par symbole via fournisseur externe
  - Actuel: Finnhub primaire, Stooq fallback pour quotes.
- [x] Historique de prix factuel pour les courbes
  - Actuel: Twelve Data via `/api/history`.
- [x] Provenance visible dans l'interface
  - Actuel: source et horodatage affichés par actif.
- [x] Fallback contrôlé si source primaire échoue
  - Actuel: fallback quotes (Finnhub → Stooq) et dividendes (cascade Finnhub → Alpha Vantage → Twelve Data via `firstSuccessfulProvider`, payload `unavailable` caché si tout échoue).
- [x] Masquage des données simulées au chargement initial
  - Actuel: dashboard masqué tant que les quotes ne sont pas reçues.
- [~] Normalisation multi-sources
  - Actuel: normalisation minimale quote/historique ; dividendes normalisés sur 3 sources (Finnhub/Alpha Vantage/Twelve Data) avec provenance taguée par item.
- [~] Gestion avancée des rate limits
  - Actuel: réduction des appels par cache TTL en mémoire, pas encore quotas par fournisseur.
- [~] Cache serveur robuste avec TTL par fournisseur
  - Actuel: cache mémoire pour quotes, historique et recherche; non partagé et non persistant.
- [x] Détection automatique de données stale
  - Actuel: quote marquée stale si l'horodatage marché dépasse le seuil de fraîcheur.
- [ ] Gestion splits/dividendes
- [ ] Données pre-market / after-hours
- [ ] Support multi-devises
- [ ] Mapping officiel symboles/exchanges
- [x] Healthcheck détaillé par fournisseur
  - Actuel: `/api/health/market-data` vérifie Finnhub quote, Finnhub fundamentals (`/stock/metric`), Finnhub company news (`/company-news`), Twelve Data et Stooq avec cache TTL.

## 2. Recherche marché

- [x] Recherche globale par entreprise ou ticker
  - Actuel: Finnhub `/search`.
- [x] Ouverture d'une fiche hors portefeuille
- [x] Ajout d'un titre recherché au portefeuille
- [x] Résultats multi-exchanges
  - Actuel: chaque résultat porte exchange + pays + suffixe parsés depuis le symbole Finnhub.
- [x] Filtre par pays/exchange
  - Actuel: chips de filtre par pays au-dessus des résultats, avec compte par marché.
- [x] Désambiguïsation visuelle des symboles similaires
  - Actuel: badge "Multi-marché" sur les titres cotés sur plusieurs places, suffixe et pays affichés sur chaque résultat.
- [x] Historique des recherches
  - Actuel: 20 dernières recherches persistées localement, dédupliquées, relançables ou effaçables individuellement.
- [x] Watchlist indépendante du portefeuille
  - Actuel: route `"/watchlist"` avec stockage local et quotes synchronisées.

## 3. Portefeuille

- [x] Positions modifiables
  - Actuel: quantité, coût moyen, allocation cible.
- [x] Ajout/suppression de titres
- [x] Sauvegarde locale navigateur
  - Actuel: `localStorage`.
- [x] API locale préparatoire
  - Actuel: `/api/portfolio`, repository SQLite local en dev.
- [x] Valeur de marché par position
- [x] P&L latent
- [x] Poids réel dans portefeuille
- [x] Drift vs allocation cible
- [x] Suggestions de rééquilibrage
- [x] Persistance serveur locale
  - Actuel: SQLite local avec tables `portfolios` et `positions`.
- [x] P&L réalisé
  - Actuel: journal de transactions (P3.3b), réalisé FIFO/LIFO par symbole via `lotEngine` (`applyTransactions`+`summarize`).
- [x] Gestion des frais
  - Actuel: frais d'achat capitalisés au coût, frais de vente déduits du réalisé (journal P3.3b).
- [x] Gestion des devises
  - Actuel: conversion multi-devises (P3.4) — `CurrencyExposurePanel` convertit valeur/coût/P&L latent de l'USD (devise de reporting) vers la devise base du mandat via taux ECB live (`/api/fx`, Frankfurter keyless + fallback exchangerate.host), source + date affichées, valeur masquée si taux manquant.
- [x] Dividendes
  - Actuel: saisis dans le journal de transactions, suivis par symbole (P3.3b).
- [x] Lots fiscaux
  - Actuel: moteur de lots FIFO/LIFO (P3.3a) branché au journal de transactions (P3.3b).
- [x] Import CSV broker
  - Actuel: parser CSV générique (détection automatique des en-têtes EN/FR), preview avec lignes valides + erreurs ligne par ligne, upsert dans le portefeuille local et serveur.
- [x] Export CSV/JSON
  - Actuel: export depuis le gestionnaire de positions avec métriques portefeuille.
- [x] Plusieurs portefeuilles par utilisateur
  - Actuel: mandats multiples (P3.2) — sélecteur header (switch/créer/renommer/supprimer), positions scopées par mandat (localStorage `fis:portfolios:v1` + clé positions namespacée). Prod via localStorage ; parité dev SQLite faite (P3.2c) — `portfolioRepository` mandate-aware + API dev `/api/portfolios` (CRUD) et `/api/portfolio[/snapshots]?portfolio=<id>` scopés, dev-only.
- [x] Snapshots historiques du portefeuille
  - Actuel: snapshots locaux SQLite via `/api/portfolio/snapshots`.

## 4. Visualisations

- [x] Courbe historique de prix factuelle
- [x] Tooltip de clôture par date
- [x] Min/max et variation période
- [x] Couleur hausse/baisse
- [x] Table des actifs triable
  - Actuel: tri par symbole/valeur/variation + colonne « Buffett » triable (score /6 + signal BUY/SELL par actif via `buffettReadiness`, « Fondamentaux requis » si données insuffisantes).
- [x] Vue top movers
- [x] Graphique portefeuille
  - Actuel: courbe de valeur portefeuille basée sur snapshots SQLite.
- [x] Sélecteur de période: 1D, 5D, 1M, 6M, YTD, 1Y, 5Y
  - Actuel: sélecteur dans la fiche actif, intraday 1h/30min, daily, weekly via Twelve Data avec interval visible.
- [ ] Volume sous la courbe
- [ ] Candlesticks OHLC
- [ ] Comparaison benchmark
- [ ] Comparaison multi-actifs
- [ ] Drawdown réel
- [ ] Volatilité réalisée
- [ ] Corrélation entre actifs

## 5. Analyse financière factuelle

- [x] Prix actuel, variation absolue et variation %
- [x] Volume quand fourni par source
- [x] Historique OHLCV daily
- [x] Market cap
  - Actuel: `marketCapitalization` Finnhub `/stock/profile2` converti en USD bruts.
- [x] P/E, EPS, revenus, marges sourcés
  - Actuel: `peTTM`, `epsTTM`, `revenuePerShareTTM × shareOutstanding`, `grossMarginTTM`, `operatingMarginTTM`, `netProfitMarginTTM`, `dividendYieldIndicatedAnnual`, `beta` Finnhub `/stock/metric` exposés via `/api/fundamentals` (cache TTL 6h) et affichés dans `FundamentalsPanel` sous la fiche actif.
- [x] Earnings calendar
  - Actuel: `/api/earnings` (cache TTL 6h) renvoie passé 12 mois + à venir 90 jours, surprise EPS calculée; `EarningsCalendarPanel` sépare visuellement à venir vs historique.
- [x] Dividendes sourcés
  - Actuel: `/api/dividends` (cache TTL 24h) renvoie historique 5 ans; `DividendHistoryPanel` affiche montant + ex-date + paiement, somme TTM mise en évidence.
- [x] Analyst ratings sourcés
  - Actuel: `/api/analyst-ratings` Finnhub `/stock/recommendation` (cache TTL 6h); `AnalystRatingsPanel` rend le consensus le plus récent (Achat fort/Achat/Conserver/Vendre/Vendre fort + note moyenne /5), distribution % par bucket et tendance des 6 derniers relevés.
- [x] News sourcées
  - Actuel: `/api/company-news` Finnhub (cache TTL 30 min, 14 jours, top 10); `CompanyNewsPanel` rend titre + source + date + lien externe + summary.
- [x] Documents SEC / filings
  - Actuel: `/api/sec-filings` Finnhub `/stock/filings` (cache TTL 24h); `SecFilingsPanel` empilé en bas de la fiche actif, dépôts groupés par type (10-K, 10-Q, 8-K, 4 insider, DEF 14A, S-1, 13F, etc.) avec libellés FR + lien direct vers le report SEC (fallback `filingUrl`). Couvre uniquement les émetteurs cotés aux États-Unis (limitation source).
- [x] Comparaison sectorielle
  - Actuel: `/api/peers` Finnhub `/stock/peers` (cache TTL 24h); `PeersComparisonPanel` empilé en bas de la fiche actif, table classée par variation % desc, livre prix + variation absolue + variation % + écart en points de pourcentage vs symbole de référence pour chaque pair (jusqu'à 10). Quotes pairs récupérés via le batch `/api/quotes` existant; pairs sans cotation marqués explicitement « Cotation indisponible ».
- [x] Score interne explicable basé sur données réelles
  - Actuel: `BuffettAnalysisPanel` empilé sous `FundamentalsPanel` rend la valeur intrinsèque DCF (Gordon-Shapiro 10y), la marge de sécurité live, 6 critères qualitatifs déterministes (ROE, croissance EPS, dette/equity, FCF, P/E, moat heuristique) et une règle de décision Acheter/Conserver/Vendre, avec décomposition mathématique KaTeX. Calculs purs côté client à partir de `/api/fundamentals` (ROE TTM, EPS growth 5y, debt/equity, P/FCF), aucune valeur inventée — affiche « Données insuffisantes » si un champ requis manque.
- [x] Audit de provenance par champ
  - Actuel: chaque KPI fondamental porte son propre `{value, source, asOf}` rendu en chip + tooltip; les champs absents sont strictement masqués.
- [x] Rendements standards (P4.1)
  - Actuel: `ReturnsMatrixPanel` (feature surface actif, registre catégorie `performance`) rend le rendement cumulé, le CAGR, une matrice par période (1M/3M/6M/YTD/1Y/3Y/origine) et les rendements mensuels, calculés par `src/utils/returnsCalculator.js` (pur) depuis l'historique factuel `/api/history` (days=1825 → ~18 mois de quotidien en free tier). Rendements de prix (hors dividendes réinvestis), mention affichée. Toute période hors de la portée des données est masquée (tiret), jamais un 0 inventé. Première feature analytique de la Phase 4.
- [x] Distribution des rendements (P4.10)
  - Actuel: `ReturnsDistributionPanel` (feature surface actif distincte, registre catégorie `performance`, activable/positionnable séparément de la matrice) rend la part de mois positifs, le meilleur/pire mois, le rendement mensuel moyen, l'écart-type, un histogramme (Recharts) des rendements mensuels et les mesures de forme (asymétrie / aplatissement excès, masquées si non calculables), calculés par `src/utils/returnsDistribution.js` (pur) sur les rendements mensuels produits par `returnsCalculator`. Même série factuelle `/api/history`, aucune nouvelle source serveur. Hors dividendes réinvestis (mention affichée), insuffisant ⇒ masqué.
- [x] Statistiques opérationnelles (P4.12)
  - Actuel: `OperationalStatsPanel` (feature surface **dashboard**, registre catégorie `portfolio`) rend les statistiques de négociation réalisées du mandat actif — transactions clôturées, taux de réussite, ratio gain/perte, détention moyenne pondérée par quantité, rotation (part du capital au coût déjà revendu), rendement sur coût (dividendes cumulés / coût ouvert), P&L réalisé et dividendes, calculés par `src/utils/operationalStats.js` (pur) via le moteur de lots P3.3a enrichi (`closedLots`: round-trips datés entrée/sortie avec quantité et P&L). Dérivé **uniquement des transactions saisies** — aucune API, aucun snapshot. Factualité stricte: mandat vide = état vide honnête, mesures de clôture masquées (—) tant qu'aucune vente (jamais un 0 inventé), survente signalée en ambre. Première feature de performance côté tableau de bord composable; dernière brique Phase 4 dérivable sans snapshots. **Câblage corrigé 2026-05-31** : le panel était enregistré + dans la map composants mais absent de `dashboardPanelProps` (recevait `{}` → état vide permanent); les props dashboard sont désormais construites par `src/core/dashboardPanelProps.js` (pur) qui lui passe `{ transactions, method:"fifo" }`, avec un test de complétude vérifiant que chaque panel dashboard du registre a bien une entrée (garde anti-récurrence).
- [x] Journal d'investissement par position (P5.1)
  - Actuel: `InvestmentJournalPanel` (feature surface **fiche actif**, registre nouvelle catégorie `decisions`, order 115, `layoutEngine` priorité 25) — pour le symbole affiché, le gestionnaire saisit sa thèse d'investissement, une conviction 1-5, un prix cible, un stop et une date de revue. Persistance `src/services/investmentJournalStore.js` (localStorage `fis:investment-journal:v1`, map par symbole, mutateurs purs; une note vidée est supprimée, jamais de note blanche). Formatters purs `src/utils/investmentJournalFormatters.js`: conviction `n/5` + label FR, `reviewStatus` (en retard / imminente ≤14 j / planifiée, `today` injecté donc testable). **Zéro fichier serveur** (modèle watchlist — donnée utilisateur globale par symbole). Factualité stricte: données saisies par l'utilisateur (pas un signal), champs absents masqués (—), prix cible/stop étiquetés « tes objectifs, pas un conseil ». Première feature Phase 5; reload sur changement de symbole via garde de rendu (pas d'effet, conforme `react-hooks/set-state-in-effect`). +30 tests (14 store + 9 formatters + 7 panel).
- [x] Concentration & diversification du portefeuille (P5.8)
  - Actuel: `PortfolioConcentrationPanel` (feature surface **dashboard**, registre catégorie `portfolio`, order 100, dataDeps `["quotes"]`) — indice HHI (somme des carrés des poids en %, échelle 0-10000) avec bandes standards DOJ/FTC (< 1500 diversifié / 1500-2500 modéré / > 2500 concentré), nombre effectif de positions (10000/HHI), plus grosse position, concentration top-5, nombre de positions/secteurs, secteur principal, et barres de poids par position + par secteur. Calcul `src/utils/portfolioConcentration.js` (pur, pondéré par valeur de marché des positions détenues, agrégation sectorielle par famille via `getSectorFamily` de `portfolioAnalytics`). **Zéro API, zéro snapshot, zéro fichier serveur** — dérivé des positions déjà mergées avec quotes live. Factualité stricte: portefeuille sans valeur = état vide honnête, alerte ambre si concentré, « pas un conseil ». Complète le teaser top-4 secteurs de `RiskCommandCenter` sans le dupliquer. +12 tests (7 util + 5 panel).
- [x] Analyse de repli / drawdown niveau actif (P5.9)
  - Actuel: `DrawdownPanel` (feature surface **fiche actif**, registre catégorie `performance`, order 120, dataDeps `["history"]`) — repli maximal (pic→creux) avec dates et durée, repli courant depuis le sommet courant, statut récupéré / sous l'eau. Calcul `src/utils/assetDrawdown.js` (pur, `computeDrawdown(points)` sur la série de clôtures factuelle, même `/api/history` days=1825 que `ReturnsMatrixPanel`/`ReturnsDistributionPanel`). **Zéro fichier serveur.** Niveau ACTIF uniquement — distinct du drawdown PORTEFEUILLE (P4.4) qui exige la série de snapshots. Factualité stricte: série insuffisante = masquée (jamais de valeur inventée), série monotone montante = 0 % réel, prix de clôture hors dividendes, « pas un conseil ». +9 tests (5 util + 4 panel).
- [x] Matrice de corrélation des positions (P5.10)
  - Actuel: `CorrelationMatrixPanel` (feature surface **dashboard**, registre catégorie `portfolio`, order 110, dataDeps `["history"]`) — matrice symétrique des corrélations de Pearson entre les rendements mensuels des positions détenues, heatmap colorée (rose ≥ 0,7 co-mouvement / amber 0,3-0,7 / emerald faible / blue inverse), KPIs corrélation moyenne + paire la plus / la moins corrélée + positions analysées. Calcul `src/utils/correlationMatrix.js` (pur, `computeCorrelationMatrix(seriesBySymbol, {minOverlap=6})` — Pearson par paire sur les **mois communs**, cellule `null` si overlap insuffisant ou variance nulle, clamp ±1, `hasData:false` si < 2 symboles utilisables). Fetch `/api/history` days=1825 par symbole via `Promise.allSettled` (dégrade si un fetch échoue), cap 10 symboles. **Point d'efficacité**: l'effet est clé sur la liste de symboles (pas `assets`) pour ne pas refetcher tout l'historique à chaque tick de cotation. **Zéro fichier serveur** — réutilise `/api/history` + `computeMonthlyReturns`. Complète la concentration P5.8 (poids) par le co-mouvement: deux titres de faible poids peuvent bouger à l'unisson. Factualité stricte: cellule masquée si historique chevauchant insuffisant (jamais de corrélation inventée), « pas un conseil ». +13 tests (8 util + 5 panel).

## 6. Interface opérateur

- [x] Dashboard factuel sans mock visible
- [x] Header avec statut source/date/heure
- [x] Recherche globale marché
- [x] Gestionnaire de positions
- [x] Export opérateur CSV/JSON
- [x] Panneau état fournisseurs
- [x] Fiche détail actif
- [x] Source et horodatage visibles
- [x] Nom d'entreprise visible près du ticker
- [x] Présentation prix + pastille % + variation absolue
- [x] États d'erreur
  - Actuel: erreurs source, stale, fournisseur et validation visibles.
- [x] Navigation par pages/routes
  - Actuel: routes locales `"/"` et `"/watchlist"` avec navigation opérateur.
- [x] Mode watchlist
  - Actuel: watchlist indépendante du portefeuille via stockage local.
- [x] Favoris
  - Actuel: favoris persistés localement, disponibles depuis la fiche actif et la watchlist.
- [x] Alertes configurables
  - Actuel: alertes opérateur configurables prix ≥/≤, variation % ≥/≤ et drift allocation, persistées localement et déclenchées sur le tick de quotes.
- [ ] UX mobile avancée
- [~] Préférences utilisateur
  - Actuel: (1) sélecteur de thème dans le header (`ThemeSelector` + `themeStore`), persisté `localStorage` `fis:theme:v1` et appliqué avant le premier paint ; (2) **store de layout** (`layoutStore`, P0.2) persisté `fis:layout:v1` — visibilité/ordre/colonnage par feature et par surface, réconcilié contre `featureRegistry` ; (3) **rendu piloté par le layout** (P0.3) : `IntelligenceCard` (surface asset, 8 panels) et le bloc composable du dashboard dans `App.jsx` (7 panneaux) sont rendus via `LayoutSurface` à partir du registre + du store (ordre + visibilité), défaut pixel-identique. (4) **UI d'édition** route `/settings` (P0.4) : par surface, toggle visibilité + sélecteur colonnage 1/2 + réordonnancement (drag-and-drop natif + boutons monter/descendre) + réinitialiser ; layout réactif (contexte) → les éditions re-rendent les surfaces live ; (5) **profils** (P0.5) : 4 presets intégrés (Vue d'ensemble / Value / Trader / Conseiller client) applicables en 1 clic + profils custom sauvegardables/supprimables (`fis:profiles:v1`). **🏁 Noyau personnalisable (Phase 0 roadmap) complet.** Manque : rendu effectif du colonnage 1/2 en grille (persisté, pas encore gridé dans `LayoutSurface`), moteur d'agencement déterministe (P1.1) + suggestion IA (P1.2). Pas encore de préférences densité/devise/langue.
- [~] Mode clair/sombre
  - Actuel: thème FIS sombre par défaut + option Clair via `:root[data-theme="light"]` (override CSS-vars). Inversion fonctionnelle mais expérimentale — quelques utilities Tailwind hardcodées (`text-white`, `text-slate-300/400`) restent telles quelles, le rendu sur fond clair est lisible mais sous-optimal.

## 7. Alertes et automatisation

- [x] Alertes prix
  - Actuel: alertes configurables prix ≥/≤ seuil par symbole, persistées localement et évaluées à chaque tick.
- [x] Alertes variation %
  - Actuel: alertes opérateur dérivées (>=5%) + alertes configurables variation ≥/≤ seuil par symbole.
- [ ] Alertes volume inhabituel
- [x] Alertes drift allocation
  - Actuel: alertes opérateur dérivées (>=5 pts) + alertes configurables drift ≥ seuil (par symbole ou portefeuille).
- [x] Alertes source stale
  - Actuel: alertes opérateur si une quote est stale.
- [ ] Notifications email
- [ ] Notifications navigateur
- [ ] Jobs planifiés côté serveur
- [ ] Résumé quotidien automatique

## 8. Backend et architecture

- [x] Endpoints API locaux pour quotes, historique, recherche
- [x] Endpoint API local pour portefeuille
- [~] Séparation modules domaine/services/UI
  - Actuel: amorcée avec `services/`, `api/`, composants spécialisés.
- [x] Base de données locale
  - Actuel: SQLite local pour portefeuille.
- [x] Couche repository
  - Actuel: `server/portfolioRepository.js`.
- [x] Migrations
  - Actuel: système versionné `server/migrations/NNN_*.sql` + runner `server/migrate.js` (table `schema_migrations`, application transactionnelle des migrations en attente, idempotent). 001 = schéma initial. `portfolioRepository` exécute `runMigrations(db)` au lieu du `CREATE TABLE` inline.
- [~] API REST/typed stable
  - Actuel: contrats JSON locaux clarifiés pour portefeuille et snapshots, pas encore typage partagé frontend/backend.
- [x] Validation de schéma côté serveur
  - Actuel: validation positions et snapshots avant écriture SQLite.
- [ ] Rate limiting
- [ ] Queue/jobs
- [ ] Cache partagé
- [ ] Logs structurés
- [ ] Observabilité

## 9. Authentification et multi-utilisateur

- [ ] Comptes utilisateurs
- [ ] Sessions sécurisées
- [ ] Rôles/permissions
- [ ] Portefeuilles privés par utilisateur
- [ ] Audit trail utilisateur
- [ ] Gestion organisation/équipe
- [ ] Invitations
- [ ] SSO/OAuth

## 10. Sécurité

- [x] Secrets exclus du git
  - Actuel: `.env` ignoré, `.env.example` versionné.
- [x] Clés API utilisées côté serveur/proxy local
- [x] Validation inputs API
  - Actuel: validation symboles/query/positions/snapshots côté API locale.
- [ ] Rate limiting API
- [ ] Protection abuse/scraping
- [ ] Sanitization stricte
- [ ] Rotation secrets
- [ ] Gestion erreurs sans fuite de secrets
- [ ] Security headers
- [ ] Tests sécurité automatisés

## 11. Déploiement

- [x] Build Vite production fonctionnel
- [x] Fonctions API compatibles Vercel pour les 10 endpoints (quotes, history, search, fundamentals, company-news, earnings, dividends, analyst-ratings, sec-filings, peers)
- [x] `vercel.json` configuré (framework vite, outputDirectory dist, functions memory/maxDuration/includeFiles, security headers, ignoreCommand pour skip les changements documentaires)
- [x] `better-sqlite3` déplacé en `devDependencies` pour éviter la compilation native inutile au build Vercel (le module n'est pas chargé en runtime serverless)
- [x] Stratégie SQLite documentée: pas de gating nécessaire, le repository SQLite reste 100% dev (jamais importé par les handlers `api/`); en prod Vercel les routes `/api/portfolio` et `/api/portfolio/snapshots` retournent 404 et le client retombe sur `localStorage` (fallback déjà en place dans `App.jsx`)
- [x] Variables d'environnement documentées
  - Actuel: `.env.example` placeholders + `DEPLOYMENT.md` § ENV vars + README § stack — `FINNHUB_API_KEY` et `TWELVE_DATA_API_KEY` à configurer dans le dashboard Vercel pour les 3 environnements.
- [x] Procédure de déploiement documentée
  - Actuel: `DEPLOYMENT.md` à la racine — premier deploy CLI, redeploy auto via push GitHub, vérifications post-deploy, rollback (`vercel rollback`).
- [x] Rollback documenté
- [ ] Déploiement production explicite (action utilisateur, hard-stop pour Claude Code)
- [ ] Environnements preview/staging/prod (auto via Vercel + GitHub, à valider à la première promotion)
- [x] CI GitHub Actions (tests automatiques sur PR)
  - Actuel: `.github/workflows/ci.yml` enchaîne lint + test + build sur Node 20 LTS, déclenché à chaque pull request et à chaque push sur `main`, avec cache npm et concurrency cancel-in-progress. Badge live affiché dans le README.
- [x] Tests automatiques sur PR
  - Actuel: même workflow, événement `pull_request` couvre les PR depuis n'importe quelle branche.
- [ ] Monitoring uptime
- [ ] Monitoring erreurs frontend/API

## 12. Tests et qualité

- [x] Tests unitaires utilitaires existants
- [x] Tests portfolio store
- [x] Tests watchlist/favoris store
- [x] Tests live quotes normalization
- [x] Tests validation serveur portefeuille
- [x] `npm run lint` vert
- [x] `npm test` vert (714 tests)
- [x] `npm run build` vert
- [x] CI GitHub Actions (lint + test + build sur PR et push main, badge README)
- [~] Tests composants UI
  - Actuel: tests `@testing-library/react` sur AssetTable, BuffettAnalysisPanel, BuffettMathBreakdown, PeersComparisonPanel, SecFilingsPanel, ThemeSelector, LayoutSurface, MarketDataHealthPanel, SettingsPage, layoutContext (provider réactif). Couverture partielle (les panels les plus logiques sont testés, pas tous).
- [ ] Tests API endpoints
- [ ] Tests e2e Playwright
- [ ] Tests accessibilité
- [ ] Tests responsive screenshots
- [ ] Tests de non-régression visuelle

## 13. Conformité et information utilisateur

- [x] Disclaimer financier minimal
- [x] Provenance des sources affichée
- [x] Avertissement de données stale dans l'interface
- [ ] Politique confidentialité complète
- [ ] Mentions légales
- [ ] Gestion consentement cookies si tracking
- [ ] Conditions d'utilisation
- [ ] Avertissement détaillé sur données différées
- [ ] Politique de conservation des données
- [ ] Export/suppression données utilisateur

## 14. Documentation produit et technique

- [x] README existant
- [x] Checklist plateforme cible
- [ ] Architecture Decision Records
- [ ] Documentation API interne
- [ ] Guide configuration fournisseurs de données
- [ ] Guide déploiement
- [ ] Guide ajout d'un fournisseur market data
- [ ] Guide modèle portefeuille
- [ ] Runbook incident source externe

## Synthèse état actuel

Programmé aujourd'hui:
- données de quotes live sourcées;
- historique factuel via Twelve Data;
- recherche globale;
- navigation dashboard/watchlist;
- watchlist indépendante du portefeuille;
- favoris persistés localement;
- portefeuille modifiable;
- persistance locale + API locale préparatoire;
- snapshots historiques SQLite du portefeuille;
- graphique de performance portefeuille basé sur snapshots;
- cache TTL mémoire pour quotes, historique et recherche;
- validation serveur des positions et snapshots;
- détection automatique des quotes stale;
- export CSV/JSON du portefeuille;
- healthcheck fournisseurs Finnhub/Twelve Data/Stooq;
- alertes opérateur variation/drift/stale;
- alertes configurables prix/variation/drift persistées localement et déclenchées sur tick;
- sélecteur de période 1D/5D/1M/6M/YTD/1Y/5Y sur la courbe historique;
- historique des recherches (20 dernières, dédupliquées, relançables);
- enrichissement résultats de recherche avec exchange/pays + filtre par pays + désambiguïsation multi-marché;
- import CSV broker avec détection automatique du mapping et preview ligne par ligne;
- fondamentaux sourcés Finnhub (market cap, P/E, EPS, revenus, marges, dividende, bêta, pays, secteur) avec audit de provenance par champ et cache TTL 6h;
- earnings calendar Finnhub (passé + à venir) avec surprise EPS visible;
- historique des dividendes Finnhub sur 5 ans + somme TTM mise en évidence;
- actualités société Finnhub sur 14 jours (titre + source + date + lien externe);
- recommandations analystes Finnhub (consensus + distribution + tendance 6 mois);
- analyse Buffett DCF empilée sous fiche actif (port du module standalone fin_tech_buffet_module): valeur intrinsèque + marge de sécurité live + 6 critères + règle de décision + décomposition mathématique KaTeX, sourcée des fondamentaux Finnhub (ROE TTM, EPS growth 5y, dette/equity, price/FCF), curseurs r/g pour sensibilité;
- thèmes visuels optionnels (Matrix / Cyber / Clair) en plus du thème FIS par défaut, persistés localement, basés sur override de variables CSS — apparence FIS originale conservée à l'identique tant que l'utilisateur ne change pas;
- dépôts SEC Finnhub `/stock/filings` empilés en bas de la fiche actif, groupés par type avec libellés FR (rapports annuels/trimestriels, événements 8-K, transactions insider, procurations, inscriptions, positions institutionnelles…) et lien direct vers le PDF SEC, cache TTL 24h;
- comparaison sectorielle Finnhub `/stock/peers` empilée tout en bas de la fiche actif, table de pairs avec quote live (prix + variation absolue + variation %) et écart en points de pourcentage vs symbole de référence, classement par variation % desc, cache TTL 24h sur la liste de pairs et batch via `/api/quotes` pour les cotations;
- déploiement Vercel préparé: `vercel.json` (framework vite, functions includeFiles `server/**`, security headers, ignoreCommand sur les fichiers documentaires), `DEPLOYMENT.md` complet (ENV vars + procédure CLI + checklist post-deploy + rollback + coûts), `better-sqlite3` déplacé en devDependencies pour build serverless propre, README mis à jour. Aucun `vercel deploy` autonome (hard-stop session) — l'opérateur déclenche manuellement;
- CI GitHub Actions: `.github/workflows/ci.yml` enchaîne lint + test + build sur Node 20 LTS à chaque pull request et à chaque push sur `main`, avec cache npm, concurrency cancel-in-progress et permissions minimales `contents: read`. Badge live dans le README;
- cleanup audit F4 + F5: retrait de `src/data/portfolioData.js` (seed mock avec valeurs fictives `aiVerdict`/`score`/`recommendation`/`aiAnalysis`/`deterministic` non rendues dans l'UI), suppression du code mort dans `portfolioAnalytics.js` (`avgScore`, `riskScore`, `riskLabel`, `scoreVolatility`, `maxDrawdown`, `weakAssets`, `highConviction`, `driftedAssets`, `alerts`, `buildStressScenarios` et tous les helpers internes associés — jamais consommés par la UI vérifié par grep), portefeuille par défaut désormais vide (factualité maximale, l'utilisateur ajoute via `MarketLookup` ou import CSV broker), retrait du dossier orphelin `n8n_batch-ops_diagnose/` (5 fichiers Python sans rapport avec FIS). Tests portfolioAnalytics ré-écrits pour les API restantes (totalMarketValue, sectorExposure, rebalanceActions, empty-portfolio safety).
- journal de transactions (P3.3b): route `/transactions`, saisie achat/vente/dividende/frais scopée par mandat (`fis:transactions:v1`), synthèse réalisé/lots ouverts par symbole (FIFO/LIFO) via le moteur de lots P3.3a, survente signalée, migration `003_transactions.sql` (parité dev);
- parité dev SQLite multi-portefeuille (P3.2c): migration `002_portfolio_mandate_columns.sql` (colonnes mandat), `portfolioRepository` mandate-aware (positions/snapshots/mandats scopés par `portfolio_id`), API dev `/api/portfolios` + `/api/portfolio[/snapshots]?portfolio=<id>` scopés, client + App branchés sur tous les mandats — dev-only, prod reste localStorage;
- conversion multi-devises (P3.4): provider de taux ECB live (`server/fx.js` Frankfurter keyless + fallback exchangerate.host), endpoint dev+prod `/api/fx?base=<ccy>` (cache 6h), `CurrencyExposurePanel` (dashboard) convertit les totaux portefeuille USD vers la devise base du mandat, taux jamais inventé (valeur masquée si manquant), sonde healthcheck `fx_rates`;
- parité serveur du journal de transactions (clôture Phase 3): migration `004_transactions_composite_key.sql` (clé composite `(portfolio_id, id)`), `portfolioRepository` `listTransactions`/`saveTransactions` scopés par mandat, API dev `/api/transactions?portfolio=<id>` (GET+PUT), client `transactionApi`, App hydrate+mirror — dev-only, localStorage reste le fallback durable;
- rendements standards (P4.1, première feature analytique Phase 4): `ReturnsMatrixPanel` sur la fiche actif (registre catégorie `performance`, priorité haute dans le moteur d'agencement), rendement cumulé + CAGR + matrice par période (1M→origine) + rendements mensuels, calculés par `returnsCalculator` pur depuis `/api/history` factuel; périodes hors-données masquées (jamais de 0 inventé), mention « rendements de prix (hors dividendes réinvestis) »;
- distribution des rendements (P4.10, feature catalogue distincte de la matrice): `ReturnsDistributionPanel` sur la fiche actif, % mois positifs + meilleur/pire mois + moyenne + écart-type + histogramme + asymétrie/aplatissement (masqués si non sûrs), calculés par `returnsDistribution` pur sur les rendements mensuels de `returnsCalculator`; même série `/api/history`, activable/positionnable indépendamment de P4.1;
- statistiques opérationnelles (P4.12, première feature de performance côté dashboard): `OperationalStatsPanel` (registre catégorie `portfolio`) — transactions clôturées, taux de réussite, ratio gain/perte, détention moyenne pondérée, rotation, rendement sur coût, P&L réalisé, dividendes, via `operationalStats` pur sur le moteur de lots P3.3a (closedLots round-trips datés); dérivé des transactions saisies seulement (zéro API, zéro snapshot), état vide honnête, mesures de clôture masquées tant qu'aucune vente;
- journal d'investissement (P5.1, première feature Phase 5, catégorie `decisions`): `InvestmentJournalPanel` sur la fiche actif — thèse, conviction 1-5, prix cible, stop, date de revue par symbole; persistance localStorage par symbole (modèle watchlist, zéro fichier serveur); formatters purs (conviction labellisée, statut de revue en retard/imminente/planifiée); données saisies par l'utilisateur, champs absents masqués, cible/stop étiquetés « pas un conseil »;
- concentration & diversification (P5.8, feature dashboard catégorie `portfolio`): `PortfolioConcentrationPanel` — HHI + bandes standards, nombre effectif de positions, plus grosse position, top-5, spread sectoriel, via `portfolioConcentration` pur pondéré par valeur de marché des positions détenues; zéro API/snapshot/fichier serveur, état vide honnête, alerte ambre si concentré, « pas un conseil »; complète le teaser sectoriel de RiskCommandCenter;
- analyse de repli / drawdown (P5.9, feature fiche actif catégorie `performance`): `DrawdownPanel` — repli maximal pic→creux (dates + durée), repli courant, statut récupéré/sous l'eau, via `assetDrawdown` pur sur la série `/api/history`; niveau actif distinct du drawdown portefeuille P4.4 (snapshots); zéro fichier serveur, série insuffisante masquée, « pas un conseil »;
- matrice de corrélation des positions (P5.10, feature dashboard catégorie `portfolio`): `CorrelationMatrixPanel` — heatmap des corrélations de Pearson entre rendements mensuels des positions, corrélation moyenne + paires la plus/moins corrélée, via `correlationMatrix` pur (alignement sur mois communs, cellule masquée si overlap insuffisant ou variance nulle); fetch `/api/history` par symbole (`Promise.allSettled`, cap 10), effet clé sur la liste de symboles pour éviter le refetch à chaque tick; zéro fichier serveur, complète la concentration P5.8 (poids) par le co-mouvement, « pas un conseil »;
- valeur à risque VaR/CVaR (P4.11, feature dashboard catégorie `performance`): `ValueAtRiskPanel` — VaR paramétrique gaussienne (μ−z·σ, toujours dès 2 obs) + VaR et CVaR historiques (quantile empirique + moyenne de queue, dès 10 obs sinon masqués) aux niveaux 95 %/99 %, via `computeValueAtRisk` pur sur les rendements flux-neutralisés ; base « par période de la série » (horizons 1j/10j écartés car snapshots irréguliers), « estimation, pas un conseil »;
- ratios étendus vs benchmark (P4.8, feature dashboard catégorie `performance`): `BenchmarkRatiosPanel` — alpha de Jensen (annualisé), tracking error (annualisée), information ratio, Treynor, up/down capture, via `computeBenchmarkStats` (réutilise la régression P4.7) ; chaque ratio null→tiret si dénominateur nul, taux sans risque = hypothèse étiquetée ; sélecteur SPY/QQQ/DIA, « estimation, pas un conseil »;
- beta & corrélation vs benchmark (P4.7, feature dashboard catégorie `performance`): `BetaCorrelationPanel` — régression OLS du portefeuille (TWR flux-neutralisé) sur le benchmark (beta, corrélation de Pearson, R²) via `computeBenchmarkStats`/`pairBenchmarkReturns` purs (apparie chaque rendement de sous-période portefeuille au rendement de prix benchmark du même intervalle ; beta/corrélation null si variance benchmark nulle) ; sélecteur SPY/QQQ/DIA, fetch `/api/history`. La matrice Pearson inter-positions est livrée séparément (P5.10). « Estimation, pas un conseil »;
- comparaison au benchmark (P4.6, feature dashboard catégorie `performance`): `BenchmarkPanel` — TWR du portefeuille vs rendement de prix d'un indice de référence (sélecteur SPY/QQQ/DIA) sur la **même fenêtre**, excès de rendement, via `computeBenchmarkComparison` pur (clôture on-or-before pour aligner les dates, rendement/excès masqués si la série benchmark ne couvre pas la fenêtre) ; fetch `/api/history` du benchmark keyé sur le symbole, « rendement de prix hors dividendes, pas un conseil ». Ouvre P4.7-4.9;
- rendement pondéré-argent / MWR-IRR (P4.3, feature dashboard catégorie `performance`): `PortfolioMwrPanel` — MWR de période (toujours, non extrapolé) + IRR annualisé (masqué tant que série < 1 an) via `computeMoneyWeightedReturn` pur : résout la VAN=0 des flux investisseur datés (−valeur de départ, −apports/+retraits dérivés des transactions, +valeur finale) par Newton-Raphson avec repli bisection ; flux des jours départ/fin ignorés (déjà dans la valeur de marché), valeurs masquées si pas de convergence. Capture l'**effet timing du client**, à comparer au TWR (effet du gérant). Dogfood réel : MWR +1,38 % = TWR (série sans flux, cohérence confirmée);
- ratios de risque ajusté Sharpe/Sortino/Calmar (P4.5, feature dashboard catégorie `performance`): `PortfolioRatiosPanel` — Sharpe (excès/σ ×√périodes), Sortino (excès/déviation à la baisse), Calmar (rendement annualisé/|repli max|, masqué tant que série < 1 an), via `computePortfolioRatios` pur réutilisant `computeSubPeriodReturns` (flux-neutralisés) + `computePortfolioRisk` (repli max) ; taux sans risque = **hypothèse étiquetée** (défaut 0 %, paramétrable), ratio masqué (null → tiret) si dénominateur nul (σ=0, aucune baisse) ; estimation annualisée sur la série accumulée, « pas un conseil ». Dogfood réel : Sharpe 1,79 / Sortino 2,80 (rf=0), 1,37 / 2,08 (rf=4 %);
- risque portefeuille / volatilité + repli (P4.4, feature dashboard catégorie `performance`): `PortfolioRiskPanel` — volatilité annualisée (σ d'échantillon des rendements de sous-période flux-neutralisés, rééchelonnée ×√(252/jours moyens) pour l'espacement réel des snapshots) + repli maximal pic→creux avec dates, durée de récupération, repli courant et statut « au sommet / sous l'eau », via `computePortfolioRisk` pur réutilisant le primitif `computeSubPeriodReturns` (apports/retraits neutralisés, jamais de faux rendement) ; fenêtre inception (fenêtres 30j/90j/1a = refinement futur quand la série s'allonge), « pas un conseil ». Dogfood réel : σ 9,42 %, DD max −1,69 % récupéré en 9 j;
- rendement pondéré-temps / TWR (P4.2, feature dashboard catégorie `performance`): `TwrPanel` — TWR cumulé + annualisé (masqué tant que < 1 an) via `computeTimeWeightedReturn` pur, qui chaîne les rendements de sous-période entre snapshots journaliers en **neutralisant les flux de capital** (buy = apport, sell = retrait, dérivés des transactions ; flux supposé en début de sous-période) ; saute les sous-périodes à base nulle, ne calcule que sur les jours réellement accumulés (zéro fabrication, pas de backfill), « pas un conseil ». Premier consommateur de l'accrual de snapshots. Dogfood réel : +1,38 % sur 21 j (série dev 9 sous-périodes);
- rééquilibrage vers les cibles (P5.3, feature dashboard catégorie `portfolio`): `RebalancePanel` — pour chaque position, dérive (poids actuel − cible `targetWeight`) et ordre achat/vente en $ pour rejoindre la cible, via `computeRebalance` pur (seuil de dérive = proxy de coûts qui supprime les micro-ajustements ; cibles prises telles quelles, cash implicite signalé si Σ cibles < 100 %) ; sans cible définie → invite à en poser une. « Hypothèse à partir de données factuelles, pas un conseil »;
- indicateurs macro (P5.6, feature dashboard catégorie `monitoring`): `MacroPanel` — taux directeur Fed, Trésor US 2 ans/10 ans, spread 10A−2A (indicateur de récession) via FRED `/series/observations` (dernier point publié, `Promise.allSettled` → dégrade si une série échoue), `api/macro` + middleware dev cache 6h ; `FRED_API_KEY` optionnelle (gratuite, documentée `.env.example`) — sans clé, état « indisponible » honnête, jamais de valeur fabriquée. « Donnée factuelle, pas un conseil »;
- conformité du mandat (P5.2, feature dashboard catégorie `portfolio`): `CompliancePanel` — éditeur de règles par mandat (poids max/titre, poids max/secteur, titres exclus, persistés via `complianceStore`) + liste des violations courantes via `checkCompliance` pur (pondéré valeur de marché des positions détenues ; règle non renseignée non évaluée — garde anti-`Number(null)`=0). Contrôle indicatif (affichage), pas de blocage dur de l'ajout/import (mute le flux central, reporté) ; cash floor N/A (pas de compte cash). « Pas un conseil »;
- accrual journalier des snapshots de portefeuille (socle Phase 4): migration `005_snapshots_daily_accrual.sql` (colonne `snapshot_date` + index unique `(portfolio_id, snapshot_date)` + collapse des lignes intraday préexistantes), `portfolioRepository.saveSnapshot` devient un **upsert par jour** (dernière capture du jour gagne, plus d'empilage à chaque tick 20 s), `App.jsx` capture **un point par mandat par jour** (garde `snapshotDayRef`) avec dé-duplication par jour côté state. Donne une **série de valeur journalière** factuelle (positions × cotations réelles, jamais de backfill des jours passés) consommable par TWR/MWR/vol/Sharpe portefeuille (P4.2-4.5, désormais débloqués). Snapshots dev-only (prod reste localStorage);
- générateur de scaffolding `scripts/new-feature.sh`: produit les fichiers squelettes d'une nouvelle feature (couche domaine/api/service/formatters/panel + tests) fidèles au pattern, avec TODO(jugement) explicites et snippets de câblage (registre/vite.config/IntelligenceCard) à coller — ne touche pas aux orchestrateurs par sécurité. Outil anti-fastidieux déterministe, le jugement reste humain;
- sentiment des initiés / MSPR (P5.7 sous-bloc, feature fiche actif catégorie `sentiment`): `InsiderSentimentPanel` — MSPR mensuel (monthly share purchase ratio ∈ [−100,100]) via Finnhub `/stock/insider-sentiment` (free tier, cache TTL 6h), moyenne 12 mois + label accumulation/distribution/neutre, lignes mensuelles ; pattern 7-fichiers, état vide US-only, « donnée factuelle, pas un conseil ». Short interest (Finnhub premium) et ESG (Yahoo, scraping fragile) restent bloqués-données, non fabriqués;
- transactions d'initiés (P5.7 sous-bloc, feature fiche actif catégorie `sentiment`): `InsiderTransactionsPanel` — déclarations SEC Form 3/4/5 Finnhub `/stock/insider-transactions` (cache TTL 6h), synthèse achats/ventes/solde net + lignes par initié (nom, date, code de transaction labellisé FR, variation de titres, valeur estimée), direction dérivée du SIGNE de la variation de titres (achat emerald / vente rose), via `insiderTransactionsFormatters` purs; zéro source neuve (clé Finnhub partagée, healthcheck couvert), état vide US-only honnête, « donnée factuelle de transactions passées, pas un conseil »;
- affichage provenance;
- courbe factuelle;
- build/test/lint propres.

Principaux manques pour devenir une plateforme complète:
- base de données réelle (au-delà du SQLite local de dev);
- authentification et portefeuilles multi-utilisateur;
- alertes avancées (volume inhabituel, notifications email/navigateur, jobs planifiés);
- repli Twelve Data sur les fondamentaux pour couvrir les non-US (V2 prévue);
- visualisations avancées (volume sous courbe, candlesticks OHLC, comparaison benchmark/multi-actifs, volatilité);
- rate limiting avancé, cache partagé et observabilité;
- CI/CD et monitoring production;
- conformité complète (politique confidentialité, mentions légales, conservation).
