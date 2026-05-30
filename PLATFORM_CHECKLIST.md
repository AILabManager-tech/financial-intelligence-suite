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
- [ ] P&L réalisé
- [ ] Gestion des frais
- [ ] Gestion des devises
- [ ] Dividendes
- [ ] Lots fiscaux
- [x] Import CSV broker
  - Actuel: parser CSV générique (détection automatique des en-têtes EN/FR), preview avec lignes valides + erreurs ligne par ligne, upsert dans le portefeuille local et serveur.
- [x] Export CSV/JSON
  - Actuel: export depuis le gestionnaire de positions avec métriques portefeuille.
- [ ] Plusieurs portefeuilles par utilisateur
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
  - Actuel: sélecteur de thème dans le header (`ThemeSelector` + `themeStore`), persisté `localStorage` `fis:theme:v1` et appliqué avant le premier paint. Pas encore d'autres préférences (densité, devise, langue).
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
- [~] Migrations
  - Actuel: création automatique des tables au démarrage, pas encore système versionné.
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
- [x] `npm test` vert (395 tests)
- [x] `npm run build` vert
- [x] CI GitHub Actions (lint + test + build sur PR et push main, badge README)
- [~] Tests composants UI
  - Actuel: tests `@testing-library/react` sur AssetTable, BuffettAnalysisPanel, BuffettMathBreakdown, PeersComparisonPanel, SecFilingsPanel, ThemeSelector. Couverture partielle (les panels les plus logiques sont testés, pas tous).
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
- affichage provenance;
- courbe factuelle;
- build/test/lint propres.

Principaux manques pour devenir une plateforme complète:
- base de données réelle (au-delà du SQLite local de dev);
- authentification et portefeuilles multi-utilisateur;
- alertes avancées (volume inhabituel, notifications email/navigateur, jobs planifiés);
- repli Twelve Data sur les fondamentaux pour couvrir les non-US (V2 prévue);
- visualisations avancées (volume sous courbe, candlesticks OHLC, comparaison benchmark/multi-actifs, drawdown, volatilité, corrélation);
- rate limiting avancé, cache partagé et observabilité;
- CI/CD et monitoring production;
- conformité complète (politique confidentialité, mentions légales, conservation).
