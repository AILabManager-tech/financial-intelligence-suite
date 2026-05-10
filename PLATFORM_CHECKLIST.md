# Financial Intelligence Suite — checklist plateforme cible

Statut au 2026-05-09. Objectif: mesurer l'écart entre l'application actuelle et une plateforme financière complète, factuelle, exploitable et déployable.

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
  - Actuel: fallback quotes seulement.
- [x] Masquage des données simulées au chargement initial
  - Actuel: dashboard masqué tant que les quotes ne sont pas reçues.
- [~] Normalisation multi-sources
  - Actuel: normalisation minimale quote/historique.
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
  - Actuel: `/api/health/market-data` vérifie Finnhub, Twelve Data et Stooq avec cache TTL.

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
- [ ] Market cap
- [ ] P/E, EPS, revenus, marges sourcés
- [ ] Earnings calendar
- [ ] Dividendes sourcés
- [ ] Analyst ratings sourcés
- [ ] News sourcées
- [ ] Documents SEC / filings
- [ ] Comparaison sectorielle
- [ ] Score interne explicable basé sur données réelles
- [ ] Audit de provenance par champ

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
- [ ] Préférences utilisateur
- [ ] Mode clair/sombre

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
- [x] Fonctions API compatibles Vercel pour quotes/history/search
- [~] Variables d'environnement préparées
  - Actuel: `.env.example`, mais pas encore configurées côté hébergeur.
- [ ] Déploiement production explicite
- [ ] Environnements preview/staging/prod
- [ ] CI GitHub Actions
- [ ] Tests automatiques sur PR
- [ ] Monitoring uptime
- [ ] Monitoring erreurs frontend/API
- [ ] Rollback documenté

## 12. Tests et qualité

- [x] Tests unitaires utilitaires existants
- [x] Tests portfolio store
- [x] Tests watchlist/favoris store
- [x] Tests live quotes normalization
- [x] Tests validation serveur portefeuille
- [x] `npm run lint` vert
- [x] `npm test` vert
- [x] `npm run build` vert
- [ ] Tests composants UI
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
- affichage provenance;
- courbe factuelle;
- build/test/lint propres.

Principaux manques pour devenir une plateforme complète:
- base de données réelle;
- authentification;
- portefeuilles multi-utilisateur;
- alertes;
- fondamentaux/news/filings sourcés;
- rate limiting avancé, cache partagé et observabilité;
- CI/CD et monitoring production;
- conformité complète.
