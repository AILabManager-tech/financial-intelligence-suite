# Reprise checkpoint — Financial Intelligence Suite

Mot magique: `FIS-REPRISE-FD01815`

## Instruction pour nouvelle session

**Plug-and-play** : `CLAUDE.md` à la racine est auto-chargé à chaque session ouverte dans ce dossier — conventions modulaires + factualité + sécurité + cache TTL + hard-stops y sont déjà encodées.

Lecture obligatoire au démarrage :

1. `CLAUDE.md` (auto-chargé, déjà en contexte)
2. `REPRISE_CHECKPOINT.md` (ce fichier — état post-dernière livraison + candidats)
3. Synthèse de `PLATFORM_CHECKLIST.md`

Quand l'utilisateur tape `FIS-REPRISE-FD01815` (ou simplement « on continue »), choisir SEUL le bloc le plus logique parmi les candidats ci-dessous et l'achever. Ne pas redemander quel axe attaquer (mémoire `feedback_no_decision_outsourcing.md`).

`/home/gear-code/02_projects/financial-intelligence-suite` — ne modifier aucun fichier hors de ce dossier.

---

## 🟢 ÉTAT ACTUEL — DÉMARRER ICI (mis à jour 2026-05-31)

- **Session autonome 2026-06-01 (user absent) : Phase 4 finie au complet puis Phase 5 — commit par bloc, push aux jalons.** `origin/main` = `ea124ca` (jusqu'à P4.5 poussé). ⚠️ **commits locaux devant origin NON poussés** : P4.3 MWR `d97d642`, P4.6 benchmark, + suite. Push après simple avertissement, jamais `--force`. Branche `main`.
- **881 tests verts**. 🏁 Phase 4 poussée (`6d791b7`), Phase 5 partielle poussée (`febe5fe`). **Phase 5 livré : P5.2 `8eb40d1` ✅ + P5.3 `05339ca` ✅ + P5.7b `d8df925` ✅ + P5.6 `febe5fe` ✅ + P5.4 watchlists thématiques ✅ + P5.5 couverture canadienne (factuel) ✅ — POUSSÉS, `origin/main` = `4a738dc`.** ➡️ **Phase 5 quasi close.** Restent **bloqués-données** (non fabriqués, documentés) : P5.5 SEDAR+ & modélisation compte-enregistré/retenue 15 % US ; P5.7 short-interest (Finnhub premium) + ESG (Yahoo scraping). Prochains candidats : autre feature de catalogue dérivable des données existantes, ou Phase 6.
- **P5.5 en bref (couverture canadienne — partie factuelle)** : ne livre QUE le factuel suffixe-dérivable, le reste documenté bloqué-données (jamais fabriqué). `src/utils/canadianListing.js` pur — `isCanadianListing`/`describeCanadianListing` (mapping **déterministe** suffixe→place via `parseSymbolExchange` : `.TO`=TSX, `.V`=TSX-V, `.CN`=CSE, `.NE`=Cboe Canada/NEO ; `{listed:false}` sinon ; expose place + pays + **devise de cotation usuelle CAD**). `.CN`/`.NE` **ajoutés à `symbolExchange.KNOWN_SUFFIXES`** → le filtre pays/exchange de la recherche les tague Canada (`.TO`/`.V` y étaient déjà). `src/components/CanadianListingPanel.jsx` (fiche actif, registre id `canadian-listing` catégorie `documents` order **65** — juste avant `sec-filings` qui doit rester dernier des documents, sinon `layoutEngine.test` casse) : rend `null` pour les non-canadiens (idiome `CurrencyExposurePanel`), affiche place/pays/devise + **section « Non disponible (bloqué sur données) » explicite** (SEDAR+ sans API gratuite ; dividendes CAD brut/net + retenue 15 % US comptes enregistrés REER/CELI = modélisation type-de-compte inexistante). Devise = celle **usuelle de la place**, pas une donnée par titre (interlistées TSX en USD existent), « pas un conseil ». **Zéro fichier serveur, zéro source externe → aucun risque factuel.** +8 tests. Palette FIS gelée.
- **P5.4 en bref (watchlists thématiques)** : décision UX tranchée par l'utilisateur = le bouton « ajouter à la watchlist » par actif cible la **liste nommée ACTIVE**, pattern calqué sur `PortfolioSelector`/mandats. `src/services/watchlistListStore.js` (pur, miroir de `portfolioListStore`) = métadonnées `{id,name}` + liste active, persistées `fis:watchlists:v1` ; mutateurs `createWatchlist`/`updateWatchlist`/`removeWatchlist` (dernière liste protégée)/`setActiveWatchlist`/`getActiveWatchlist`, `makeWatchlistId` slug déterministe sans `Date.now`/`random`. `src/services/watchlistStore.js` étendu : `loadWatchlistAssets`/`saveWatchlistAssets` prennent un `watchlistId` optionnel, **namespacent par liste** (`::id`) ; la liste **« Défaut » réutilise la clé legacy** `financial-intelligence-suite.watchlist.v1` → **migration backward-compat transparente** de la watchlist v1 existante (zéro déplacement de données, exactement le pattern `portfolioStore` `default`→legacy). `src/components/WatchlistSelector.jsx` (miroir de `PortfolioSelector`, icône Bookmark violet) dans le header de `/watchlist` : switch/créer/renommer/supprimer. `App.jsx` : state `watchlistList` + actifs chargés namespacés par liste active, `persistWatchlist` écrit dans la liste active, handlers `handleSwitch/Create/Rename/DeleteWatchlist` (calqués sur les handlers mandats, `activateWatchlist` recharge les actifs de la liste). **Client-only, zéro fichier serveur, zéro source externe → aucun risque factuel.** +20 tests (12 `watchlistListStore` + 2 namespacing/migration `watchlistStore` + 6 `WatchlistSelector`). Palette FIS gelée.
- **⏸️ ARRÊT AUTONOME DÉLIBÉRÉ (HISTORIQUE — P5.4 désormais livré) sur P5.4 et P5.5 (2026-06-01, session autonome très longue).** Raison = principe qualité>complétude (endorsé par l'utilisateur, cf. `~/.claude/CLAUDE.md` § Hermès + feedback no-yes-man) : ne pas précipiter, en fin de session à contexte très long, les 2 blocs les plus risqués. (1) **P5.4 watchlists thématiques** = refactor *en place* de la watchlist existante, profondément intégrée à `App.jsx` (toggle par actif, route `/watchlist`, `isInWatchlist` dans ~10 points de rendu) → demande une **décision UX** (le toggle par actif cible-t-il la liste nommée active ? pattern à calquer sur `PortfolioSelector`/mandats) avant un refacto sûr. (2) **P5.5 Couverture canadienne (L)** = large + partiellement **bloqué-données** (SEDAR+, retenue 15 % US sur comptes enregistrés = modélisation type-de-compte inexistante ; `.TO/.V/.CN` faisable mais le reste non sans sources). Les attaquer en rafale = risque de régression silencieuse (exactement le `--yolo` déconseillé). **Recommandation : reprendre P5.4 puis P5.5 en session fraîche**, P5.4 avec la décision UX ci-dessus. ⏸️ P5.7 short-interest (premium) + ESG (Yahoo scraping) = bloqués-données. **🏁 PHASE 4 COMPLÈTE** (sauf P4.9 Brinson bloqué-données). Blocs session autonome 2026-06-01 : P4.3 `d97d642`, P4.6 `8be14bc`, P4.7 `df81bcd`, P4.8 `9b3a7d1`, P4.11 (commit en cours). ⚠️ **P4.9 Brinson DÉLIBÉRÉMENT NON LIVRÉ** : exige poids+rendements sectoriels du benchmark, aucune source factuelle (Finnhub free ne donne pas la composition d'un indice) → fabriquer violerait la factualité stricte. Documenté bloqué-sur-données, jamais de mock. ➡️ **Suite : PHASE 5** (P5.2 compliance, P5.3 rééquilibrage, P5.4 watchlists, P5.5 Canada, P5.6 macro FRED, P5.7 short-interest/ESG — compléter le sous-bloc initiés). lint + build verts. Node v24 via nvm : `export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH"`.
- **Avancement** : 🏁 Phase 0 (noyau personnalisable) · Phase 1 P1.1 (agencement déterministe ; **P1.2 IA gelé**) · 🏁 Phase 2 (simulateur de démo) · 🏁 Phase 3 (socle données PM) · **Phase 4 : P4.1 ✅ + P4.10 ✅ + P4.12 ✅ + 🔓 accrual snapshots ✅ + 🏁 QUATUOR RENDEMENT/RISQUE COMPLET (P4.2 TWR ✅ + P4.3 MWR/IRR ✅ + P4.4 vol/drawdown ✅ + P4.5 Sharpe/Sortino/Calmar ✅) → restent P4.6 benchmark, P4.7 beta/corr, P4.8 ratios vs benchmark, P4.9 Brinson, P4.11 VaR** · **Phase 5 : P5.1 ✅ + P5.2 ✅ + P5.3 ✅ + P5.4 ✅ + P5.5 (factuel) ✅ + P5.6 ✅ + P5.7 initiés (partiel) ✅ + P5.8 ✅ + P5.9 ✅ + P5.10 ✅** (reste bloqués-données : P5.5 SEDAR+/compte enregistré, P5.7 short-interest/ESG).
- **Outillage** : `scripts/new-feature.sh` — générateur de scaffolding déterministe (7-fichiers + snippets de câblage). Tue le fastidieux de la plomberie SANS risque factuel ; le jugement (source, anti-chevauchement, factualité) reste manuel. **Décision actée** : ne PAS mandater un agent autonome (ex. Hermès `--yolo`) pour pondre les blocs — goulot = jugement + relecture, pas frappe ; dérive silencieuse sur règles strictes. Cf. `~/.claude/CLAUDE.md` § Hermès.
- **Primitif partagé** : `src/utils/timeWeightedReturn.js` exporte `computeSubPeriodReturns(snapshots, transactions)` (rendements de sous-période flux-neutralisés) + `daysBetween` — source de vérité unique du rendement de marché ; consommé par P4.2 (produit → TWR) ET P4.4 (σ + courbe de drawdown). P4.3 MWR/P4.5 Sharpe devraient le réutiliser aussi.
- **➡️ PROCHAIN BLOC (choisir SEUL)** : le quatuor rendement/risque est complet. Suite logique = **P4.6 benchmark** (1er bloc qui ouvre P4.7-4.9) : choisir un symbole de référence (S&P 500 SPY / TSX), fetch sa série via `/api/history`, calculer son TWR sur la même fenêtre que le portefeuille, exposer l'excess return ; overlay sur la courbe. Réutilise le pattern `/api/history` (returns-matrix/corrélation) + `computeSubPeriodReturns`. Puis P4.7 beta/corrélation PF↔benchmark, P4.8 ratios vs benchmark (information ratio, tracking error), P4.9 Brinson. **Défaut : P4.6 benchmark.** Alternative : P4.11 VaR/CVaR (sur les rendements de `computeSubPeriodReturns`, historique + paramétrique), ou catalogue additif (P5.7 short-interest, P5.6 macro FRED). Note : P4.2/4.3/4.4/4.5 partagent `computeSubPeriodReturns`/`computeFlowsByDay` — primitifs factuels uniques, réutiliser pour tout calcul de rendement.
- **P4.3 MWR/IRR en bref (effet timing client)** : `src/utils/moneyWeightedReturn.js` (pur) — `computeMoneyWeightedReturn(snapshots, transactions)` résout la VAN=0 des flux investisseur datés (−V_début à t0, −apport/+retrait à chaque jour de flux strictement entre départ et fin via `computeFlowsByDay`, +V_fin à la date finale) par **Newton-Raphson** (100 itér, tol 1e-9) avec **repli bisection** sur [−0,9999 ; 100] si changement de signe. MWR de période = (1+IRR)^années−1 **toujours** donné (non extrapolé) ; IRR annualisé **gated ≥ 365 j** ; `converged:false` + valeurs `null` si échec (jamais de chiffre non fiable). Flux des jours départ/fin **ignorés** (déjà dans la valeur de marché → pas de double-comptage). `hasData:false` si < 2 snapshots ou V_début ≤ 0. +5 tests (dont IRR 3,30 % vérifié à la main sur −100@0/−100@1an/+210@2ans). `src/components/PortfolioMwrPanel.jsx` (dashboard, props `{snapshots, transactions}`, registre `portfolio-mwr` `performance` order 117) : MWR période + IRR annualisé (tiret « série < 1 an »), nb flux, comparaison TWR (effet gérant), message honnête si non convergé, « pas un conseil ». +3 tests. **Zéro fichier serveur**. **Dogfood vite-node** : MWR **+1,38 % = TWR** (série dev sans flux → MWR≡TWR, cohérence théorique confirmée). **Clôt le quatuor rendement/risque** (TWR effet gérant / MWR effet client / vol-DD / ratios).
- **P4.5 ratios en bref (Sharpe/Sortino/Calmar)** : `src/utils/portfolioRatios.js` (pur) — `computePortfolioRatios(snapshots, transactions, {annualRiskFreePct=0})` réutilise `computeSubPeriodReturns` + `computePortfolioRisk` : **Sharpe** = (rendt moyen − rf_période)/σ × √(périodes/an) ; **Sortino** = excès / déviation à la baisse (carrés des écarts négatifs vs MAR=rf, /N) × √(périodes/an) ; **Calmar** = rendement annualisé / |repli max|, **gated ≥ 365 j** (sinon `null` — annualiser quelques semaines serait trompeur). `null` si dénominateur nul (σ=0 → Sharpe null ; aucune baisse → Sortino null). Taux sans risque = **hypothèse étiquetée** (défaut 0 %). +5 tests. `src/components/PortfolioRatiosPanel.jsx` (dashboard, props `{snapshots, transactions}`, registre `portfolio-ratios` catégorie `performance` order 125) : 3 cartes (tiret + raison si masqué), rendt annualisé si dispo, mention hypothèse rf + « pas un conseil ». +2 tests. **Zéro fichier serveur**. **Dogfood vite-node sur la vraie série dev** : Sharpe **1,79** / Sortino **2,80** (rf=0), **1,37 / 2,08** (rf=4 %), Calmar `null` (< 1 an). Cohérent avec TWR +1,38 % / σ 9,42 %.
- **P4.4 risque PF en bref (vol + drawdown)** : `src/utils/portfolioRisk.js` (pur) — `computePortfolioRisk(snapshots, transactions)` réutilise `computeSubPeriodReturns` (flux-neutralisés) : **volatilité** = σ d'échantillon (n-1) des rendements, annualisée `× √(252 / jours_moyens_période)` (gère l'espacement réel des snapshots, pas un naïf ×√252) ; **drawdown** = courbe d'indice base 1 (∏ growth), repli max pic→creux + dates + `recoveryDays` (1er retour au pic après le creux) + repli courant vs sommet historique + `atHigh`. `hasData:false` si < 2 rendements. +4 tests. `src/components/PortfolioRiskPanel.jsx` (dashboard, props `{snapshots, transactions}`, registre `portfolio-risk` catégorie `performance` order 120, câblé props + map) : vol annualisée + σ période, repli max + dates, repli courant/statut, récupération, mention méthode + « pas un conseil ». +3 tests. **Zéro fichier serveur**. **Dogfood vite-node sur la vraie série dev** (9 rendements, 09→30 mai) : σ **9,42 %**, DD max **−1,69 %** (05-15→05-19), **récupéré en 9 j**, au sommet — cohérent avec TWR +1,38 %. Fenêtre = inception (fenêtres 30j/90j/1a = refinement futur). **Réutilise le primitif P4.2 → zéro modif fonctionnelle de TWR** (refactor additif `computeSubPeriodReturns`, 9 tests TWR toujours verts).
- **P4.2 TWR en bref (1er consommateur de l'accrual)** : `src/utils/timeWeightedReturn.js` (pur) — `computeTimeWeightedReturn(snapshots, transactions)` chaîne le **facteur de croissance** `(valeur_fin − flux)/valeur_début` de chaque sous-période entre snapshots journaliers, **neutralisant les flux de capital** (`computeFlowsByDay` : buy = +(qty×prix+frais), sell = −(qty×prix−frais) ; dividend/fee ignorés car ne touchent pas la valeur des positions ; flux supposé en **début de sous-période**). TWR cumulé = ∏(croissance)−1 ; annualisé = cumulé^(365/jours)−1 **seulement si série ≥ 365 j** (sinon `null`) ; saute les sous-périodes à base ≤ 0 (portefeuille parti de zéro) ; `hasData:false` si < 2 snapshots utilisables. ⚠️ **Piège corrigé en cours de route** : j'avais nommé `hpr` le facteur de croissance (qui vaut déjà 1+r) puis fait `*= 1+hpr` → décalage de +100 pts ; corrigé en `cumulative *= growth`. +9 tests. `src/components/TwrPanel.jsx` (dashboard, props `{snapshots, transactions}`, registre `twr` catégorie `performance` order 115, câblé `dashboardPanelProps` + `DASHBOARD_FEATURE_COMPONENTS`) : TWR cumulé + annualisé (tiret « série < 1 an » tant que masqué), période/couverture, mention méthode + « pas un conseil ». +4 tests. **Zéro fichier serveur** (lit la série + transactions déjà en state). **Dogfood node sur la vraie série dev** (10 points 09→30 mai, sans flux) : **+1,38 % / 21 j / 9 sous-périodes**, annualisé `null`. Factualité : performance de marché réelle, flux neutralisés, jamais de backfill. **Débloqué par l'accrual**, débloque la lecture GIPS du factsheet.
- **Accrual de snapshots en bref (socle Phase 4)** : le constat = un snapshot était écrit à **chaque tick de cotation (20 s)** et le state client ne gardait que les 120 derniers (~40 min) → flot intraday inexploitable pour TWR/vol/Sharpe. Fix = série **journalière idempotente**. (1) `server/migrations/005_snapshots_daily_accrual.sql` : `ADD COLUMN snapshot_date`, backfill `substr(captured_at,1,10)`, **collapse des lignes intraday préexistantes** (`DELETE … WHERE id NOT IN (SELECT MAX(id) GROUP BY portfolio_id, snapshot_date)`), `UNIQUE INDEX (portfolio_id, snapshot_date)`. (2) `portfolioRepository` : `normalizeSnapshot` calcule `snapshotDate = capturedAt.slice(0,10)` ; `insertSnapshot` devient **upsert `ON CONFLICT(portfolio_id, snapshot_date) DO UPDATE`** (dernière capture du jour gagne) ; `saveSnapshot` re-lit la ligne via `getSnapshotByDayStmt` (lastInsertRowid=0 sur update) ; `rowToSnapshot`+SELECT exposent `snapshot_date`. (3) `App.jsx` : garde `snapshotDayRef` (Map mandat→jour) = **un POST par mandat par jour** (plus de spam 20 s), state dé-dupliqué par jour. **Factualité STRICTE** : valeur = positions × cotations réelles, **jamais de backfill** des jours passés (quantités changées = fabrication). (4) Tests : migrate 005 (index unique bloque 2e ligne même jour), repo (2 captures même jour → 1 ligne maj ; multi-jours → série chrono) — l'ancien test « chronologically » réécrit pour le nouveau contrat. **Dogfood curl réel** (dev :20000) : 2 POST le 2026-05-31 → 1 ligne (id 122, 1000→1080) ; **la migration a réduit ~121 lignes intraday de la DB dev à 1 point/jour** (série 05-10→05-31 propre). Débloque P4.2-4.5. Snapshots dev-only (prod = localStorage, inchangé).
- **P5.7 en bref (sous-bloc transactions d'initiés)** : pattern 7-fichiers canonique, **zéro modif des features existantes**. `server/insiderTransactions.js` (pur — `fetchInsiderTransactions(symbol,{finnhubApiKey,limit})` sur Finnhub `/stock/insider-transactions`, normalise `{name,change,share,transactionDate,filingDate,transactionCode,transactionPrice}`, **drop si name/date manquant ou `change` non fini** — jamais de 0 fabriqué, `transactionPrice`/`share` → `null` si invalide, tri date desc, cap 20/max 50, fetcher injectable, no-leak token) + `api/insider-transactions.js` (Vercel, mémo-cache 6h) + middleware dev `/api/insider-transactions` (`readThroughCache` TTL 6h, `cacheTtlMs.insiderTransactions`) + `src/services/insiderTransactions.js` (client AbortSignal) + `src/utils/insiderTransactionsFormatters.js` (purs — `describeTransactionCode` map FR des codes SEC P/S/A/M/G…, `transactionDirection` dérivée du **signe de `change`**, `directionTone`, `formatShareChange`/`formatInsiderDate`/`formatTransactionValue` null-safe, `summarizeInsiderActivity` → achats/ventes/solde net/initiés uniques, `hasData:false` si vide) + `src/components/InsiderTransactionsPanel.jsx` (fiche actif, synthèse + lignes par initié, idiome `.then/.catch`+AbortController, état vide US-only honnête, « pas un conseil »). Registre id `insider-transactions` catégorie `sentiment` order 35 (juste après analyst-ratings), dataDeps `["insider-transactions"]`. **Healthcheck non étendu** (clé Finnhub partagée, probe existant suffit). **Dogfood curl réel** (dev :20000, AAPL) : 5 lignes, Levinson (prés. CA) vend/donne (S @311,02 / G prix `null`), normalisation + tri OK. **Zéro source neuve.**
- **✅ DETTE P4.12 CORRIGÉE (bloc P5.10)** : `OperationalStatsPanel` était dans `DASHBOARD_FEATURE_COMPONENTS` mais absent de `dashboardPanelProps` → recevait `{}` → état vide permanent. Cause : oubli de câblage (les `transactions` étaient pourtant dans le scope de App, ligne 198). Fix : construction des props extraite dans `src/core/dashboardPanelProps.js` (pur) + `OperationalStatsPanel: { transactions, method: "fifo" }` ajouté. **Garde anti-récurrence** : test `dashboardPanelProps.test.js` qui vérifie que **chaque** panel dashboard du registre a une entrée de props (un futur panel oublié casse le test).
- **P5.10 en bref** : `src/utils/correlationMatrix.js` (pur — `computeCorrelationMatrix(seriesBySymbol, {minOverlap=6})` : corrélation de Pearson des rendements mensuels par paire, alignée sur les **mois communs** ; cellule `null` si overlap < minOverlap ou série à variance nulle — **jamais un 0 fabriqué** ; clamp ±1 contre l'overshoot flottant ; `hasData:false` si < 2 symboles utilisables ; retourne matrice symétrique + diagonale unitaire + moyenne off-diagonale + paires la plus/moins corrélées) + `src/components/CorrelationMatrixPanel.jsx` (panel dashboard, props `{ assets }`, fetch `/api/history` days=1825 par symbole détenu via `Promise.allSettled` — dégrade si un fetch échoue —, heatmap rose/amber/emerald/blue, cap **10 symboles**). Registre catégorie `portfolio` order 110, dataDeps `["history"]`. **Point d'efficacité clé** : l'effet est clé sur la **liste de symboles** (`symbolsKey`), pas sur `assets` — sinon refetch de tous les historiques à chaque tick de cotation (20s) ; reset loading en phase de rendu (idiome `DrawdownPanel`) pour satisfaire `react-hooks/set-state-in-effect`. **Zéro fichier serveur**. **Dogfood réel** (dev :20000, AAPL/MSFT/NVDA/KO, 17 mois) : MSFT–NVDA 0,76 (+ corrélée), MSFT–KO −0,38 (− corrélée), moyenne 0,098 — cohérent (tech ensemble, KO diversificateur). Complète la concentration P5.8 (poids) par le co-mouvement. « Pas un conseil ».
- **P5.9 en bref** : `src/utils/assetDrawdown.js` (pur — `computeDrawdown(points {date,close})` : repli maximal pic→creux + dates, durée en jours, repli courant depuis le pic courant, `atHigh`, `recovered` ; null si série < 2 ; 0 % réel si série monotone montante) + `src/components/DrawdownPanel.jsx` (fiche actif, fetch `/api/history` days=1825 comme returns-matrix/distribution, états loading/error/ready, `setState` dans `.then` async donc lint OK). Registre catégorie `performance` order 120, dataDeps `["history"]`. **Zéro fichier serveur**, niveau ACTIF (distinct du drawdown portefeuille P4.4 bloqué sur snapshots), « pas un conseil ».
- **P5.8 en bref** : `src/utils/portfolioConcentration.js` (pur — HHI 0-10000 = Σ poids² en %, bandes DOJ/FTC <1500/2500, nombre effectif de positions = 10000/HHI, plus grosse position, top-5, spread sectoriel par famille via `getSectorFamily`, `hasData:false` si valeur nulle) + `src/components/PortfolioConcentrationPanel.jsx` (panel dashboard, props `{ assets }`, registre catégorie `portfolio` order 100, dataDeps `["quotes"]`). Pondéré valeur de marché des positions détenues, **zéro fichier serveur**, état vide honnête, « pas un conseil ». Complète le teaser top-4 secteurs de `RiskCommandCenter` sans le dupliquer.
- **P5.1 en bref** : `investmentJournalStore.js` (localStorage par symbole) + `investmentJournalFormatters.js` (conviction, `reviewStatus`) + `InvestmentJournalPanel.jsx` (formulaire fiche actif, catégorie `decisions` order 115, priorité layoutEngine 25, reload via garde de rendu pas d'effet). Zéro serveur. Factualité : champs absents masqués, cible/stop « pas un conseil ».
- **Vérifier en 30 s** : `export PATH=…nvm…/bin:$PATH && npm run lint && npm test && npm run build` (3 verts). Serveur dev : `npm run dev -- --host 127.0.0.1 --port 20000`.
- **Hard rules permanentes** : palette FIS **gelée** ; factualité stricte (zéro mock visible, hypothèses étiquetées) ; **principe IA transverse** (l'IA reste optionnelle MAIS garder une « prise » propre — entrée/sortie données pures, point d'injection clair — pour la brancher sans refonte ; cf. § Regles) ; `git push` après simple avertissement ; jamais `vercel deploy`. Détail des notes par bloc plus bas (anti-chronologique).

---

## Etat git

Tip de `main` au moment du checkpoint (post-bloc cleanup audit F4+F5, à committer dans le même bloc que ce docs) :

```
1c789cb ci: add GitHub Actions workflow for lint + test + build
b5a0ac4 chore: prepare Vercel deployment config and procedure
3c40e43 chore: address security and audit findings
71383fd feat: source sector peers from Finnhub stock peers endpoint
ed415bc feat: source SEC filings from Finnhub stock filings endpoint
a363672 docs: prep next-session checkpoint after Buffett + theme merge
1474ac6 docs: align checklist body with merged Buffett + theme blocks
facf406 docs: refresh reprise checkpoint after parallel merge
cc085e0 feat: optional Matrix / Cyber / Light themes (default FIS preserved)
3ef3bb2 feat: buffett DCF analysis panel sourced from Finnhub fundamentals
2728f1c chore: add one-click dev launcher and app icon assets
ffcd6ff feat: source analyst recommendations from Finnhub
57ffce6 docs: add project CLAUDE.md for plug-and-play sessions
115c91f feat: source company news, earnings and dividends from Finnhub
e7a5e3b feat: source company fundamentals from Finnhub
fd01815 feat: import broker CSV files into the portfolio
```

Working tree propre (seuls les 3 fichiers ignorés intentionnels listés plus bas restent untracked).

Branche: `main`. Aucun push à faire sans demande explicite.

> **Reprise post-panne électrique — 2026-05-29.** Une coupure de courant a interrompu la session abruptement. Diagnostic au redémarrage : aucune corruption (git intact, `git fsck` propre hormis 1 blob orphelin bénin, 0 fichier tronqué, port 20000 libre). Le bloc WIP signalé ci-dessous (`buffettReadiness` + dividendes multi-provider + outillage) était **complet et vert** (lint / 395 tests / build) ; il a été sécurisé en 3 commits atomiques.
>
> **Tip réel de `main` : `0c684cd`.** Working tree propre (seul `ROADMAP_PM.pdf` reste non suivi, intentionnel). `main` est **8 commits en avance sur `origin/main`** — non poussé (attendre demande explicite). Les 8 commits non poussés :
>
> ```
> 0c684cd chore: ignore .vercel and refresh the local dev launcher
> 208aafe feat: source dividends from multiple providers with cascade fallback
> d736d24 feat: surface Buffett readiness score across the portfolio
> e2b5822 docs: pivot roadmap to customizable-studio vision, mark P0.1 delivered
> f242c0c feat(P0.1): central feature registry
> 9d74acc docs: add M0.5 UI preferences module to Phase 0
> 5f6c6f4 docs: expand Phase 1 with full PM returns and ratio matrix
> b44f5b8 docs: add ROADMAP_PM.md scoping the path from analysis terminal to PM tool
> ```
>
> Détail des 3 commits de reprise :
> - `d736d24` — **Score Buffett dans le portefeuille.** Nouveau `src/services/buffettReadiness.js` (+ test) : valeur intrinsèque, marge de sécurité, score /6, signal BUY/SELL par actif depuis les fondamentaux Finnhub. `AssetTable` gagne une colonne « Buffett » triable (tone selon signal) ; `App.jsx` fetch les résumés (AbortSignal) et les passe à `AssetTable` / `TopPerformers` / `SearchFilter`. Ajustements liés : `BuffettAnalysisPanel` (+test), `BuffettMathBreakdown`, `buffettFormatters` (+test).
> - `208aafe` — **Dividendes multi-provider.** `server/dividends.js` essaie Finnhub → Alpha Vantage → Twelve Data via `firstSuccessfulProvider`, normalise chaque source, tague la provenance. `api/dividends.js` + middleware vite forwardent les 3 clés et émettent un payload `unavailable` (caché) si tous échouent. `liveQuotes` : `source "mock"` → `"unavailable"` (règle zéro-mock).
> - `0c684cd` — **Outillage.** `.gitignore` (+`.vercel`), refonte `scripts/start-dev.sh`.
>
> Tests : 370 → **395 verts**. Reprise propre, prêt pour le prochain bloc (candidats Phase 0 ci-dessous).

> **P3.4 livré (multi-devises + FX) — 2026-05-30 (niveau 3 MISSION).** `c8f396e`. Première vraie nouveauté fonctionnelle depuis P3.2 : conversion des totaux portefeuille (valeur/coût/P&L latent) de la devise de reporting USD vers la devise base du mandat, via taux ECB live. (1) `server/fx.js` pur : `fetchFxRates(base)` provider ECB keyless (Frankfurter) + fallback keyed (exchangerate.host) via `firstSuccessfulProvider`, map de taux ancrée sur la base (base = 1) ; `convertAmount` pur → `null` si une jambe manque (jamais de taux inventé). +8 tests. (2) `api/fx.js` (prod, mémo-cache 6h) + middleware dev `/api/fx?base=<ccy>` (`readThroughCache`, TTL 6h ajouté à `cacheTtlMs`). (3) `src/utils/fxConvert.js` client pur (`convertAmount` + `convertPortfolioTotals`, +6 tests). (4) `src/services/fx.js` client `AbortSignal` (+3 tests). (5) `CurrencyExposurePanel` (surface dashboard, enregistré au registre, order 80) : convertit valeur/coût/P&L latent vers la devise base, affiche source + date du taux, masque (—) si taux manquant, ne rend rien si base = USD. Palette FIS gelée. +3 tests. (6) Sonde healthcheck `frankfurter.app`/`fx_rates` ajoutée à `checkMarketDataHealth` (+3 tests). Câblage `App.jsx` : `getActivePortfolio(portfolioList).baseCurrency` → panel. **Vérifié curl** (dev :20000) : `/api/health` provider fx `ok` ; `/api/fx?base=USD` → 31 taux ECB (CAD/USD 1.36955, asOf 2026-05-29) ; `base=CAD` ancre CAD=1. Suite 561 → **584 tests verts**, lint+build verts, poussé. **Prochain bloc : clôture Phase 3 (parité dev des transactions, option A).**

> **P4.10 livré (distribution des rendements) — 2026-05-30 (niveau 3 MISSION, autonomie).** Commit de ce bloc (voir `git log`). 2e feature analytique Phase 4, **panel séparé** de la matrice P4.1 (activable/positionnable indépendamment = directive modularité de l'utilisateur). (1) `src/utils/returnsDistribution.js` pur : `computeDistribution(monthlyReturns)` → % mois positifs, meilleur/pire mois, moyenne, écart-type d'échantillon (n-1), skewness g1 + kurtosis excess g2 (moments population /n ; **null si σ=0 ou n<3**), histogramme 8 tranches (≤−10…≥10 %, somme = nb mois). +7 tests. (2) `returnsFormatters.formatRatio` (2 déc., null si invalide). +2 tests. (3) `src/components/ReturnsDistributionPanel.jsx` : fetch `/api/history?days=1825` → `computeReturns().monthly` → `computeDistribution`, KPIs + histogramme Recharts (tranches négatives rose / positives emerald via index) + mesures de forme étiquetées, mention « rendements de prix mensuels, hors dividendes réinvestis ». Idiome `.then().catch()` + AbortController, 3 états. Palette FIS gelée. +4 tests. (4) Registre id `returns-distribution` (catégorie `performance`, order 110) + map `IntelligenceCard`. **Réutilise la sortie de `returnsCalculator` — zéro nouveau fichier serveur.** **Dogfood curl** NVDA réel (dev :20000) : 17 mois, 64.7 % positifs, moyenne +3.20 %, σ 10.52 %, best +24.06 (2025-05) / worst −13.24 (2025-03), skew 0.094 / kurtosis −0.647, histogramme somme = 17. Suite 611 → **624 tests verts**, lint+build verts. **Non poussé.** **Prochain bloc : P4.12 stats opérationnelles (moteur de lots) ou enrichir le catalogue dashboard.**

> **P4.1 livré (rendements standards — 1re feature analytique Phase 4) — 2026-05-30 (niveau 3 MISSION).** `d17fe32`. Premier sous-bloc de Phase 4, dérivé de l'historique de prix factuel (pas des snapshots, non peuplés). (1) `src/utils/returnsCalculator.js` pur : `computeReturns(points,{asOf})` → rendement cumulé, CAGR, `computePeriodReturns` (matrice 1M/3M/6M/YTD/1Y/3Y/origine, `closeOnOrBefore` pour le prix « il y a N jours » réel, **`pct: null` si la série ne remonte pas si loin** — jamais un 0), `computeMonthlyReturns` (dernière clôture par mois → variation MoM, 1er mois null). Déterministe (dates de la série, pas de `Date.now`). +9 tests. (2) `src/utils/returnsFormatters.js` purs (`formatPct` signé 2 déc., `returnTone` palette FIS, `formatMonthLabel` UTC fr-CA) → `null` si invalide. +5 tests. (3) `src/components/ReturnsMatrixPanel.jsx` (surface actif) : fetch `/api/history?days=1825`, idiome `.then().catch()` + `AbortController` des autres panels, 3 états (loading/error/ready), KPIs + matrice + chips mensuels, **mention « rendements de prix, hors dividendes réinvestis »**, périodes masquées en tiret. Palette FIS gelée. +4 tests. (4) Enregistré au `featureRegistry` (id `returns-matrix`, catégorie neuve `performance`, surface asset, order 100) + map dans `IntelligenceCard`. (5) `layoutEngine` : catégorie `performance` priorité **15** (juste sous overview → rendements en haut de la fiche ; `sec-filings` reste dernier). **Dogfood curl** (dev :20000) : `period:"5Y"` plafonne à 30 pts (voie hebdo free tier) → choisi **`days=1825`** qui rend **365 pts quotidiens ~18 mois** ; sur MSFT réel : 1M +6.07 / 3M +14.64 / 6M −8.49 / YTD −6.90 / 1Y −1.84 / origine +0.15, **3Y masqué**, 17 rendements mensuels. Réutilise l'endpoint history existant — **zéro nouveau fichier serveur** (même voie que `SimulationPanel`). Suite 593 → **611 tests verts**, lint+build verts. **Non poussé.** **Prochain bloc : P4.10 distribution des returns OU P4.12 stats opérationnelles (dérivables sans snapshots) ; P4.2+ portefeuille attend l'accrual de snapshots.**
>
> ⚠️ *Note d'env (test)* : un `mockReset` en `beforeEach` faisait mal attribuer un rejet pourtant capté (`.catch` du panel) au détecteur de rejets non gérés de vitest 4 → faux échec du test réseau. Corrigé en réinitialisant le mock **en tête de chaque `it`** (cf. commentaire dans `ReturnsMatrixPanel.test.jsx`). Bug d'environnement confirmé, pas un bug du composant (prouvé par repro isolé).

> **🏁 Phase 3 CLÔTURÉE — parité serveur du journal de transactions — 2026-05-30 (niveau 3 MISSION).** `9cb22ec`. Dernier reste connu de Phase 3 : le journal de transactions (client `transactionStore`) est désormais mirroré dans le SQLite dev. (1) `server/migrations/004_transactions_composite_key.sql` : recrée `transactions` avec clé primaire **composite `(portfolio_id, id)`** — le PK global `id` de 003 était faux (les ids client `t1, t2…` ne sont uniques que par mandat, donc se répètent légitimement entre mandats). Drop sûr : la table n'avait jamais été écrite avant ce bloc. (2) `server/portfolioRepository.js` : `listTransactions`/`saveTransactions` scopés par `portfolio_id` (replace-all snapshot, comme `saveAssets`) ; `normalizeTransaction` mappe le `date` client vers la colonne `trade_date` et rejette les invalides ; `rowToTransaction` remappe ; FK garantie par `ensurePortfolio`, suppression en cascade par le mandat. +4 tests. (3) Middleware dev `vite.config.js` : `/api/transactions` (GET + PUT, `?portfolio=<id>`). (4) `src/services/transactionApi.js` client scopé (+4 tests) ; localStorage reste le fallback durable comme les positions. (5) `App.jsx` : hydrate les transactions depuis l'API au montage + au switch de mandat, mirror chaque persist. (6) `server/migrate.test.js` +1 (preuve clé composite : même `t1` coexiste sur 2 mandats). **Vérifié curl** (dev :20000) : PUT default (buy+sell, `date`→`trade_date`), PUT client-a réutilisant l'id `t1` (clé composite OK), GET isolation confirmée, DELETE mandat → cascade vide le journal. Suite 584 → **593 tests verts**, lint+build verts, poussé. **Phase 3 complète. Prochain bloc : Phase 4 — analytics PM.**

> **P3.2c livré (parité dev SQLite multi-portefeuille, dev-only) — 2026-05-30 (niveau 3 MISSION).** `b41f029`. Le mirror dev SQLite suit désormais chaque mandat (avant : `default` seulement). (1) `server/migrations/002_portfolio_mandate_columns.sql` : colonnes `client`/`base_currency`/`opened_at` sur `portfolios` (slot 002 réservé, gap sûr). (2) `server/portfolioRepository.js` mandate-aware : CRUD mandats (`listPortfolios`/`savePortfolio` upsert/`removePortfolio` cascade) + positions/snapshots scopés par `portfolio_id` (param optionnel en fin → rétro-compat ; `ensurePortfolio` garde la FK). +4 tests. (3) Middleware dev `vite.config.js` : `/api/portfolios` (GET/POST/DELETE) + `/api/portfolio[/snapshots]?portfolio=<id>` scopés. (4) Client `portfolioApi.js` (scopé + CRUD mandats, +5 tests) et `portfolioSnapshots.js` scopé. (5) `App.jsx` : retrait des gardes `default`-only — positions/snapshots chargés/sauvés par mandat actif, métadonnées mandat mirrorées à la création/renommage/suppression. **Vérifié curl** (dev :20000) : POST mandat CAD, PUT positions client-a (MSFT) vs default (AAPL) isolées, DELETE → cascade vide. Suite 552 → **561 tests verts**, lint+build verts, poussé. **Prochain bloc : P3.4 — multi-devises + FX.**

> **P3.3b livré (stockage transactions + journal UI) — 2026-05-30 (niveau 3 MISSION).** `e7f6806`. Branche le moteur de lots P3.3a. (1) `src/services/transactionStore.js` (+10 tests) : log de transactions scopé par mandat (`fis:transactions:v1`, clé namespacée `::id`, default = clé de base, comme les positions), `normalizeTransaction` (rejette type inconnu / symbole-date manquants), `makeTransactionId` déterministe (`tN`, sans Date.now/random), mutateurs purs `addTransaction`/`removeTransaction`, `load`/`saveTransactions` tolérants (JSON corrompu → `[]`). (2) `src/components/TransactionJournalPanel.jsx` (+6 tests) : route plein-écran `/transactions` (onglet header entre Démo et Paramètres) — saisie achat/vente (qty/prix/frais) ou dividende/frais (montant) avec champs conditionnels, historique chronologique avec suppression, synthèse par symbole (quantité ouverte, coût moyen, coût de revient, P&L réalisé, dividendes, frais) via `applyTransactions`+`summarize`, bascule **FIFO/LIFO**, survente signalée en ambre (jamais masquée). Palette FIS gelée. (3) `server/migrations/003_transactions.sql` + test migrate (parité dev ; slot 002 réservé P3.2c, gap sûr — 003 ne dépend que de portfolios/001). Câblage `App.jsx` : state `transactions` scopé mandat (rechargé dans `activateMandate`), `persistTransactions`/`handleAdd`/`handleRemove`, route + garde boot-screen. **Vérifié live** (browse :20000) : buy 10@100 + buy 10@200 + sell 10@250 → FIFO réalisé **1500 $** (lot restant @200), LIFO réalisé **500 $** (lot restant @100). Suite 535 → **552 tests verts**, lint+build verts, poussé. **Prochain bloc : P3.2c — parité dev SQLite multi-portefeuille (dev-only), puis P3.4 FX.**

> **P3.3a livré (moteur de lots pur) — 2026-05-30 (niveau 3 MISSION).** `1b8eab0` : `src/utils/lotEngine.js` — `applyTransactions(transactions, {method})` rejoue buy/sell/dividend/fee → lots ouverts + P&L réalisé FIFO/LIFO (frais achat capitalisés, frais vente déduits, survente signalée), `summarize/summarizeSymbol`. 9 tests. Cœur fiscal pur (réalisé, T5008/1099-B P6.2, turnover P4.12). Suite 526 → **535 tests verts**, poussé. **RESTE P3.3** : stockage transactions (client `fis:transactions:v1` + migration 003 dev) + UI journal de transactions (saisie + liste + réalisé/lots par symbole). **Prochain bloc : P3.3b — stockage transactions + journal UI** (brancher `lotEngine`). Puis P3.2c (parité dev SQLite, dev-only), P3.4 (FX externe).

> **P3.2 livré (multi-portefeuilles, client-first) — 2026-05-30 (niveau 3 MISSION).** `e78f47e` P3.2a : `portfolioListStore` (mandats + actif, `fis:portfolios:v1`) + positions scopées par mandat (`portfolioStore`, clé namespacée, default=legacy). `aa424ba` P3.2b : `PortfolioSelector` header (switch/créer/renommer/supprimer) + App scope par mandat actif. **Vérifié live** : mandat « Client Test » isolé (vide), retour principal repeuplé (re-hydrate SQLite en dev — bug du switch-back trouvé+corrigé en dogfood). Suite 510 → **526 tests verts**, lint+build verts, **poussé** (`aa424ba`). **RESTE Phase 3** : P3.2c (parité dev SQLite — migration 002 + repo CRUD + API scopé, dev-only) ; **P3.3 transactions + lots fiscaux** (moteur FIFO/LIFO pur d'abord) ; **P3.4 multi-devises + FX** (provider externe). **Prochain bloc : P3.3 — moteur de lots (`src/utils/lotEngine.js`, pur/testable) d'abord.**

> **P3.1 livré + 32 commits poussés sur `origin/main` — 2026-05-30 (niveau 3 MISSION).** Migrations SQLite versionnées : `server/migrate.js` (loadMigrations + applyMigrations transactionnel/idempotent + runMigrations) + `server/migrations/001_initial_schema.sql` (schéma actuel, IF NOT EXISTS pour adoption sans heurt des DB dev existantes) + 8 tests. `portfolioRepository` appelle `runMigrations(db)` au lieu du CREATE TABLE inline. SQLite reste dev-only. **Push effectué** : `origin/main` était à `ba1e2c7`, désormais à `8c36c4d` (32 commits Phase 0→2) ; P3.1 `8c0cd25` à pousser au prochain push. Suite 502 → **510 tests verts**, lint+build verts. **Prochain bloc : P3.2 — multi-portefeuilles (sélecteur header + CRUD mandat + migration 002).**

> **🏁 P2.2 livré — PHASE 2 COMPLÈTE — MVP « studio composable démontrable » atteint — 2026-05-30 (niveau 3 MISSION).** Portefeuille de démo multi-positions. `P2.2a 38afd57` : agrégation pure `src/utils/portfolioSimulation.js` (+9 tests) — `aggregateCurves` (somme N courbes sur axe de dates commun + report avant), `simulateDemoPortfolio`, `excessReturnPct`. `P2.2b 1838917` : route `/demo` + `DemoPortfolioPanel` (formulaire multi-positions, double courbe Portefeuille vs benchmark SPY, tableau, bandeau hypothèse). **Vérifié live** : AAPL+MSFT 10k/2021 → 22,6k$ (+13%), −12,2 pts vs SPY. Suite 489 → **502 tests verts**, lint+build verts. `main` 31 commits devant `origin`, non poussé. **Phases 0→2 (MVP roadmap) toutes complètes. Prochain bloc : P3.1 — migrations SQLite versionnées (1re brique Phase 3, socle données PM).**

> **P2.1 + P2.3 livrés — 2026-05-30 (niveau 3 MISSION).** Simulateur de démo what-if (« premier jalon vendable » de la roadmap). `P2.1 63f00ea` : calculateur pur `src/utils/simulationCalculator.js` (+10 tests) — `simulateInvestment(points, {amount, startDate})` → parts, valeur finale, rendement, CAGR, courbe ; pur/déterministe. `P2.3 cfb5ebf` : `SimulationPanel` (feature surface asset, enregistrée au registre → montée auto par le pipeline, réconciliation P0.2 l'ajoute aux layouts existants) — formulaire montant+date → `/api/history` → calc → KPIs + courbe Recharts + **bandeau permanent « pas un conseil »**. **Vérifié live sur MSFT** (données Twelve Data réelles). Suite 475 → **489 tests verts**, lint+build verts. `main` 28 commits devant `origin`, non poussé. **P1.2 (IA agencement) GELÉ** (optionnel, prise prête). **Prochain bloc : P2.2 — portefeuille de démo multi-positions + benchmark.**
>
> ⚠️ Données : « 100k en 2017 » nécessite un historique long (Twelve Data payant). Free tier ~18 mois → entrée gracieuse au plus ancien point, jamais de valeur inventée.

> **P1.1 livré — 2026-05-30 (niveau 3 MISSION).** Moteur d'agencement déterministe `src/core/layoutEngine.js` (+ 8 tests) : `optimizeLayout`/`optimizeSurface` réordonnent par priorité de catégorie (overview/KPI → portfolio → comparison → sentiment → calendar → monitoring → documents), ordre canonique en départage, visibilité+colonnage préservés. Pur, idempotent. Bouton « Agencement optimal » dans `/settings` (applique via `controls.apply`). **Vérifié live** : « Centre de risque » (overview) remonte avec les KPI, monitoring repoussé en bas. Suite 466 → **475 tests verts**, lint + build verts. `main` ~26 commits devant `origin`, non poussé. **Prochain bloc : P1.2 — suggestion IA opt-in (Qwen-gencore local / provider), fallback déterministe P1.1, non bloquante.**

> **🏁 P0.5 livré — PHASE 0 COMPLÈTE — 2026-05-29 (niveau 3 MISSION).** Profils de gestionnaire. `P0.5a 584ab56` : 4 presets en données pures (`src/core/layoutProfiles.js` : overview/value/trader/advisor) + `buildLayoutFromProfile` + contrôle `apply(layout)` au provider + `ProfilePicker` dans SettingsPage. `P0.5b 3bd62a6` : profils custom (`src/services/profileStore.js`, `fis:profiles:v1`) — enregistrer l'agencement courant, appliquer, supprimer. **Vérifié live** : « Trader » réduit le dashboard à 4 panneaux ; profil custom « Mon setup » sauvegardé/listé/persisté. Suite 446 → **466 tests verts**, lint + build verts. `main` est **24 commits en avance sur `origin/main`** (incluant le bloc de reprise post-panne + toute la Phase 0), non poussé — `git push` à faire sur demande explicite.
>
> **Le noyau personnalisable (Phase 0) est COMPLET** : registre (P0.1) → store réactif (P0.2) → rendu piloté (P0.3) → UI Paramètres toggles/colonnage/DnD (P0.4) → profils intégrés+custom (P0.5). **Prochain bloc : P1.1 — moteur d'agencement déterministe (`src/core/layoutEngine.js`), 1re brique de Phase 1.**

> **P0.4 livré — 2026-05-29 (niveau 3 MISSION).** Onglet Paramètres `/settings` + layout réactif. `P0.4a 6775022` : contexte réactif (`src/core/layoutContext.js` = LayoutContext + useLayout + useLayoutControls ; `src/components/LayoutProvider.jsx` = état + persistance via effet), App enveloppé dans `main.jsx` ; ancien `hooks/useLayout.js` retiré. `P0.4b 568f6da` : `SettingsPage` + route `/settings` + bouton nav « Paramètres » (toggle visibilité + colonnage 1/2 + reset par surface ; boot screen ne gate plus /settings). `P0.4c 682c75c` : réordonnancement drag-and-drop natif + boutons monter/descendre. **Vérifié live** (browse :20000) : masquer un panneau le retire du dashboard ; le descendre le réordonne. Palette FIS respectée. Suite 429 → **446 tests verts**, lint + build verts. `main` ≈ **22 commits en avance sur `origin/main`**, non poussé. **Prochain bloc : P0.5 — profils de gestionnaire (presets), dernier bloc de Phase 0.**

> **P0.3 livré — 2026-05-29 (niveau 3 MISSION).** Rendu piloté par le layout. `src/components/LayoutSurface.jsx` (+ test) rend les features visibles d'une surface dans l'ordre du store, en résolvant `componentKey → composant` via une map fournie + props via `propsFor`, option `wrapItem` (sections du dashboard) ; `src/hooks/useLayout.js` lit le store au montage. `IntelligenceCard` (surface asset, 8 panels uniformes) et le bloc composable du dashboard dans `App.jsx` (7 panneaux, props par componentKey) sont désormais rendus via `LayoutSurface`. 4 commits : `d90ef80` (infra+asset), `ef8c4a4` (réconciliation registre dashboard↔réalité — order corrigé, SafetyBadge enregistré, AssetTable/SearchFilter/MarketLookup = chrome hors registre, WatchlistPanel retiré), `9cecda1` (dashboard piloté), `2d86754` (fix dup-key React pré-existant dans MarketDataHealthPanel). **Vérifié live** (browse, :20000) : ordre des sections identique à avant, console propre après fix. Suite 419 → **429 tests verts**, lint + build verts. `main` ≈ **16 commits en avance sur `origin/main`**, non poussé. **Prochain bloc : P0.4 — onglet Paramètres `/settings` (toggles + drag-and-drop).** ⚠️ Prérequis P0.4 : rendre `useLayout` réactif (contexte/abonnement) pour que les éditions re-rendent les surfaces — aujourd'hui il lit une seule fois au montage.

> **P0.2 livré — 2026-05-29 (niveau 3 MISSION).** `src/services/layoutStore.js` + `layoutStore.test.js` (24 tests). Généralise `themeStore` : localStorage versionné `fis:layout:v1`, `load/save/reset`, défaut = absence d'entrée. Persiste **par feature et par surface** : visibilité on/off, ordre, colonnage (1/2). Réconciliation contre `featureRegistry` au load ET au save (ids disparus écartés, nouvelles features ajoutées en fin à leurs défauts → zéro régression + tolérance aux futurs ajouts). Mutateurs purs immuables (`setFeatureVisibility`, `setFeatureColumns`, `moveFeature`) + `getVisibleFeatureIds` (pour le rendu P0.3). Suite : 395 → **419 tests verts**, lint + build verts. `main` est désormais **11 commits en avance sur `origin/main`** (8 de la reprise + P0.1 docs déjà là + ce commit feat P0.2). Toujours pas poussé. **Prochain bloc : P0.3 — rendu piloté par le layout.**

## Modules ajoutés depuis le checkpoint précédent (1f884eb)

Commits feature livrés sur `main` depuis le checkpoint précédent :

- `4b49340` — Alertes configurables (prix ≥/≤, variation % ≥/≤, drift) persistées localement, déclenchées sur tick.
- `da8d4ed` — Sélecteur de période 1D/5D/1M/6M/YTD/1Y/5Y sur la fiche actif (intraday/daily/weekly via Twelve Data).
- `a357a94` — Historique des 20 dernières recherches (déduplication, replay, suppression).
- `305e376` — Filtre pays/exchange + désambiguïsation multi-marché sur la recherche.
- `fd01815` — Import CSV broker (parser RFC 4180, détection EN/FR, preview ligne par ligne).
- `e7a5e3b` — Fondamentaux sourcés Finnhub V1 stricte: `/api/fundamentals` (cache TTL 6h), `FundamentalsPanel` sous fiche actif, audit de provenance par champ, healthcheck étendu à `/stock/metric`.
- `115c91f` — Activité société Finnhub: `/api/company-news` (TTL 30 min), `/api/earnings` (TTL 6h), `/api/dividends` (TTL 24h); panels `CompanyNewsPanel`, `EarningsCalendarPanel`, `DividendHistoryPanel` empilés sous fiche actif; healthcheck étendu à `/company-news`.
- `ffcd6ff` — Recommandations analystes Finnhub: `/api/analyst-ratings` (TTL 6h) `/stock/recommendation`; `AnalystRatingsPanel` empilé sous `FundamentalsPanel` (consensus le plus récent + distribution % par bucket + tendance des 6 derniers relevés); pas d'extension du healthcheck (le probe Finnhub existant couvre la même clé).
- `2728f1c` — Outil DX: launcher one-click (`scripts/start-dev.sh` + icônes `assets/FIS_*.png`) pour démarrer Vite sur :20000 depuis un raccourci `.desktop` du bureau.
- `3ef3bb2` — Analyse Buffett DCF (panel + math breakdown KaTeX) sourcée par `/api/fundamentals` (DCF Gordon-Shapiro pur côté client, pas de nouveau handler serveur).
- `cc085e0` — Thèmes optionnels Matrix / Cyber / Clair via CSS-vars `:root[data-theme="…"]`; thème FIS par défaut conservé identique au pixel.
- `ed415bc` — Dépôts SEC Finnhub: `/api/sec-filings` (TTL 24h) `/stock/filings`; `SecFilingsPanel` empilé sous `CompanyNewsPanel`, groupé par type (10-K, 10-Q, 8-K, 4 insider, DEF 14A, S-1, 13F-HR, etc.) avec libellés FR + tone par catégorie + lien externe vers le PDF SEC; pas d'extension du healthcheck (la clé Finnhub est partagée).
- `71383fd` — Comparaison sectorielle Finnhub: `/api/peers` (TTL 24h) `/stock/peers`; `PeersComparisonPanel` empilé tout en bas de la fiche actif (sous `SecFilingsPanel`); livre prix + variation absolue + variation % + écart en points de pourcentage vs symbole de référence pour chaque pair, classement par variation % desc; quotes pairs récupérés via le batch `/api/quotes` existant; pas d'extension du healthcheck.
- `3c40e43` — Audit fix: `.env.example` scrubé (placeholders documentés à la place des 3 vraies clés exposées depuis le commit initial), tests no-leak token ajoutés à `dividends` + `earnings`, README réécrit factuellement (stack actuel, ENV vars, architecture modulaire, posture sécurité). 366 → 368 tests. **ACTION REQUIRED** : rotation des 3 clés API (Finnhub, Twelve Data, Alpha Vantage) — purger l'historique git ne suffit pas, le repo a été public.
- `b5a0ac4` — Préparation déploiement Vercel: `vercel.json` (framework vite, functions includeFiles, security headers), `DEPLOYMENT.md` (procédure complète CLI + checklist post-deploy + rollback + coûts), `better-sqlite3` déplacé en devDependencies, stratégie SQLite documentée (pas de gating nécessaire, fallback `localStorage` côté client déjà en place). Aucun `vercel deploy` autonome.
- `1c789cb` — CI GitHub Actions: `.github/workflows/ci.yml` enchaîne `npm ci` → `npm run lint` → `npm test` → `npm run build` sur Node 20 LTS, déclenché à chaque pull request et à chaque push sur `main`, avec cache npm + concurrency cancel-in-progress + permissions minimales `contents: read`. Badge live ajouté en haut du README.
- (à venir, ce bloc) — Cleanup audit F4 + F5: retrait du seed mock `src/data/portfolioData.js`, épuration du code mort dans `portfolioAnalytics.js` et de `buildStressScenarios`, retrait du dossier orphelin `n8n_batch-ops_diagnose/`. Portefeuille par défaut désormais vide. Tests portfolioAnalytics ré-écrits.

État tests: 52 → 124 → 162 → 206 → 230 → 299 → 331 → 366 → 368 → 370 tests verts. Lint et build verts.

## Fichiers non suivis a ignorer

Ne pas inclure sans demande explicite:

- `PLATFORM_CHECKLIST.pdf`
- `financial-intelligence-suite/`
- `root-copy/`

## Regles de travail importantes

- Toujours maintenir `PLATFORM_CHECKLIST.md` a jour apres chaque bloc de developpement complete.
- Ne jamais afficher ni committer `.env` ou les cles API.
- Ne jamais faire `git push` sans demande explicite de l'utilisateur.
- Respecter le port local du projet: `20000`.
- Si le serveur local doit tourner: `npm run dev -- --host 127.0.0.1 --port 20000`.
- **Principe transverse IA (décision user 2026-05-30)** : l'intégration d'IA reste **100% optionnelle** — le user décidera après avoir analysé le comportement final du programme. MAIS **garder en permanence une « prise » prête à l'accueillir**. Concrètement : ne jamais coupler en dur ce qui pourrait être produit par une IA ; toujours passer par une frontière propre. Ex. agencement : un suggéreur IA = un frère de `optimizeLayout` (P1.1) qui produit un layout, le **valide contre le registre** (réconciliation `layoutStore`), puis appelle `apply()`. P1.1 reste le fallback déterministe. Tout nouveau module doit préserver ce genre de couture (entrée/sortie de données pures, point d'injection clair) pour qu'une IA puisse s'y brancher sans refonte.

## Validation connue au checkpoint

Dernière validation complète avant reprise:

- `npm run lint` OK
- `npm test` OK, 370 tests
- `npm run build` OK
- CI: `.github/workflows/ci.yml` enchaîne les trois mêmes commandes sur Node 20 LTS à chaque PR et chaque push sur `main`. Badge live dans le README.

## Serveur local

URL locale:

`http://127.0.0.1:20000/`

Verifier si le serveur tourne:

`pgrep -a -f "vite --host 127.0.0.1 --port 20000"`

## Bloc cleanup audit F4 + F5 livré (2026-05-10, après CI)

Éponge la dette identifiée dans l'audit `3c40e43`. Cleanup, pas de feature. 370 → 370 tests (net +2 : -1 test `buildStressScenarios`, +3 tests `getSectorFamily empty` / `enrichAssetsWithPositionMetrics empty` / `calculatePortfolioAnalytics empty portfolio`).

Fichiers supprimés:

- `src/data/portfolioData.js` (~440 lignes) — seed avec 11 actifs et valeurs fictives `aiVerdict`, `aiAnalysis`, `deterministic.rsi/macd`, `recommendation`, `score`. Aucune n'était rendue dans l'UI (vérifié par grep avant suppression), mais polluait la mémoire et le seed. Le portefeuille par défaut est désormais vide.
- `n8n_batch-ops_diagnose/` (5 fichiers Python : `__init__.py`, `batch_ops.py`, `config.py`, `credentials.py`, `workflows.py`) — module d'opérations batch n8n sans rapport avec FIS, vraisemblablement orphelin d'un autre projet.

Fichiers modifiés:

- `src/App.jsx` — l'import `PORTFOLIO_ASSETS` retiré; `useState(() => loadPortfolioAssets([]))` initialise désormais avec un seed vide. Le code descendant gère déjà l'état vide (App.jsx ligne 290 `if (!portfolioAssets.length)` → status "Aucun actif suivi"; les composants `RiskCommandCenter`, `TopPerformers`, `SafetyBadge`, `PortfolioManager` itèrent sur des arrays vides sans crash).
- `src/utils/portfolioAnalytics.js` — épuré de ~140 lignes. `calculatePortfolioAnalytics` retourne désormais uniquement les 7 champs effectivement consommés par l'UI (`totalMarketValue`, `totalCost`, `unrealizedPnl`, `unrealizedPnlPct`, `topSector`, `sectorExposure`, `rebalanceActions`). Tous les helpers internes du code mort (`average`, `standardDeviation`, `maxDrawdown`, `statusFromRisk`, `scoreRiskLabel`) supprimés. `buildStressScenarios` retiré (consommé seulement par son test).
- `src/utils/portfolioAnalytics.test.js` — ré-écrit pour ne couvrir que les API restantes, plus deux nouveaux cas (`getSectorFamily` empty-string fallback, `enrichAssetsWithPositionMetrics` empty array, `calculatePortfolioAnalytics` empty portfolio).

Choix architecturaux:

- **Seed vide vs seed factuel minimal** : on a choisi seed vide pour 3 raisons. (1) Factualité maximale alignée avec CLAUDE.md « zéro mock visible » — un seed avec NVDA/AAPL/MSFT inventait quand même les positions (quantité, coût moyen). (2) UX : `MarketLookup` est déjà l'élément principal de la page d'accueil, l'utilisateur ajoute via search en quelques clics. (3) En prod Vercel sur un nouvel utilisateur, le seed ne correspondrait pas à son vrai portefeuille.
- **Aucune migration localStorage** : les utilisateurs qui ont déjà un portefeuille sauvegardé dans `localStorage` conservent leurs positions. Seuls les nouveaux utilisateurs (ou ceux qui clear leur cache) verront l'état vide.
- **Pas de `enrichedAssets` dans le return de `calculatePortfolioAnalytics`** : il n'était pas consommé (PortfolioManager + AssetTable appellent `enrichAssetsWithPositionMetrics` directement). Suppression nette.
- **Garder `enrichAssetsWithPositionMetrics` exporté** : utilisé par 2 composants. Non touché.
- **`methodology: "market-value-weighted"` retiré du retour** : c'était un label décoratif jamais rendu.
- **Tests empty-portfolio ajoutés** : maintenant que le seed est vide, le path `assets = []` est le path par défaut. Couvrir explicitement évite une régression silencieuse.

## Bloc CI GitHub Actions livré (2026-05-10, après préparation Vercel)

§12 close-the-loop sur la CI. Workflow simple, fait tourner lint + test + build à chaque pull request et à chaque push sur `main`. Pré-requis hygiénique au futur déploiement Vercel (signal vert à valider avant `vercel --prod` côté opérateur).

Fichiers ajoutés:

- `.github/workflows/ci.yml` — un seul job `ci: lint + test + build` qui :
  - tourne sur `ubuntu-latest` avec `timeout-minutes: 10`,
  - utilise `actions/checkout@v4` + `actions/setup-node@v4` Node 20 LTS avec `cache: 'npm'`,
  - exécute `npm ci` puis `npm run lint` puis `npm test` puis `npm run build`,
  - se déclenche sur `pull_request` (toute branche) et `push: branches: [main]`,
  - groupe les runs par `${{ github.workflow }}-${{ github.ref }}` avec `cancel-in-progress: true` pour ne pas garder de runs obsolètes sur les PR à force-push,
  - demande uniquement `permissions: contents: read` (pas de write GitHub, pas d'accès secrets — la suite est entièrement publique-friendly).

Fichiers étendus:

- `README.md` — badge GitHub Actions ajouté juste sous le titre (`branch=main`), et un paragraphe explicite après la section "Validation avant commit" qui indique que les trois commandes tournent aussi en CI.
- `PLATFORM_CHECKLIST.md` — §11 "CI GitHub Actions" et "Tests automatiques sur PR" cochés, §12 "CI GitHub Actions" ajouté, synthèse mise à jour.

Choix architecturaux:

- **Un seul job linéaire** plutôt qu'une matrice lint/test/build séparée. Le coût total est < 2 min — split en jobs parallèles paierait surtout en complexité (fan-in, plus de slots GH Actions) sans gain de temps significatif.
- **Node 20 LTS uniquement** (pas de matrice 20+22). Toujours possible d'élargir plus tard si on veut une garantie multi-version, mais Vercel runtime Node = 20 par défaut → pas d'urgence de tester 22 pour l'instant.
- **`npm ci` strict** plutôt que `npm install` → garantit la reproductibilité depuis `package-lock.json` et fail-fast si le lockfile est désynchronisé.
- **`cache: 'npm'`** géré nativement par `setup-node@v4` (clé `package-lock.json`). Pas besoin d'`actions/cache` séparé.
- **Concurrency cancel-in-progress** : sur les PR très actives (force-push fréquents), ça évite la file d'attente de runs périmés. Pas activé sur `push: main` parce qu'on veut tout l'historique.
- **`permissions: contents: read`** explicite (au lieu du défaut implicite write) → principe du moindre privilège, et fail-safe si un futur job tente une opération inattendue.
- **Pas de matrix `os` (Windows/macOS)** : le projet ne cible que Linux (Vercel runtime + dev gear-code Linux). Couvrir d'autres OS n'apporterait rien.
- **Pas de cache de build artifacts (`dist/`) ni de couverture de tests publiée** : ces ajouts viendraient plus tard si on intègre Codecov / un job de release.
- **`pull_request` sans filtre de branche** : couvre les PR depuis fork aussi (GitHub Actions ne donne pas accès aux secrets sur PR de fork, donc safe par défaut).

## Bloc préparation déploiement Vercel livré (2026-05-10, après audit fix)

§11 préparé end-to-end. Aucun déploiement effectif lancé (hard-stop). 4 fichiers ajoutés/modifiés, 0 nouveau test (changements infra/docs uniquement).

Fichiers ajoutés:

- `vercel.json` — framework vite + outputDirectory dist + functions config (memory 256, maxDuration 10s, `includeFiles: "server/**"` pour bundler le domaine avec chaque handler) + security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`) + `ignoreCommand` skip-build sur les fichiers documentaires (root-copy/, financial-intelligence-suite/, *.pdf).
- `DEPLOYMENT.md` — procédure complète: vue d'ensemble (statique + serverless + persistance localStorage), pré-requis, ENV vars à configurer dans le dashboard, premier deploy CLI (vercel link → env pull → vercel build → vercel preview → vercel --prod), redeploy auto GitHub, checklist post-deploy, limites connues, rollback (`vercel rollback`), coûts (Hobby gratuit + quotas upstream borderlinés par les TTL serveur).

Fichiers étendus:

- `package.json` — `better-sqlite3` déplacé de `dependencies` vers `devDependencies`. Aucun handler `api/*.js` ne l'importe en runtime, donc Vercel n'a plus à compiler son binding natif. `package-lock.json` régénéré.
- `README.md` — section Déploiement réécrite avec pointeur vers `DEPLOYMENT.md` et hard-stop explicite.
- `PLATFORM_CHECKLIST.md` — §11 mis à jour (entrées cochées + entrées résiduelles « action utilisateur » bien étiquetées).

Choix architecturaux:

- **Pas de gating SQLite côté serveur** : le constat clé est qu'aucun handler `api/*.js` n'importe `server/portfolioRepository.js` (vérifié par grep). Le repo SQLite n'existe que dans `vite.config.js` (devServer) et n'est jamais bundlé dans une Vercel Function. Pas besoin de mode no-op, pas besoin de variable d'environnement de bascule. Le client capture déjà gracieusement les 404 sur `/api/portfolio` (cf. `App.jsx` ligne 167-180 et 191-209).
- **`includeFiles: "server/**"`** : chaque handler `api/<feature>.js` importe son module domaine `server/<feature>.js` via chemin relatif. Vercel a besoin d'inclure explicitement ces modules dans le bundle de la function (par défaut il ne suit pas les imports au-delà de `node_modules`). Confirmé par lecture des 7 imports `from "../server/*.js"` dans `api/`.
- **`installCommand: "npm install --omit=optional"`** : `recharts` et certaines deps Tailwind ont des bindings optionnels que Vercel essaie de compiler par défaut, ce qui ralentit le build. Le flag les skip — aucune fonctionnalité utilisée n'en dépend.
- **`Cache-Control: no-store` sur `/api/*`** : chaque handler gère son propre TTL via la mémoire de la Function (cache par invocation chaude). Mettre du cache CDN par-dessus créerait des conflits de fraîcheur.
- **`X-Frame-Options: DENY`** : pas d'embed prévu, donc on ferme. Si un futur usage exigeait un iframe, à passer en `SAMEORIGIN`.
- **Pas de CI GitHub Actions dans ce bloc** : le scope se limite à la config Vercel + docs. Une CI sur PR (lint+test) sera un bloc séparé.
- **Endpoints `/api/portfolio` et `/api/portfolio/snapshots` 404 en prod** : assumé. La doc le précise. Stratégie multi-utilisateur viendra avec un Postgres managé (bloc §8-9 futur).

## Bloc comparaison sectorielle livré (2026-05-10, après dépôts SEC)

`/stock/peers` Finnhub empilé tout en bas de la fiche actif, sous `SecFilingsPanel`. Pattern modulaire identique au bloc dépôts SEC — 7 fichiers neufs, zéro modif des panels existants (un seul ajout dans `IntelligenceCard.jsx` + un nouveau handler dans `vite.config.js`). 35 nouveaux tests.

Fichiers ajoutés:

- `server/peers.js` (+tests, 10) — `fetchPeers(symbol, {finnhubApiKey, limit})`, normalise la liste de symboles (uppercase, trim, dedup, exclut le symbole demandé case-insensitive, drop entries non-string ou vides), cap à 10 par défaut (max 25). Fetcher injectable, ne leak jamais le token.
- `vite.config.js` — middleware `/api/peers` avec `readThroughCache` TTL 24h + handler Vercel `api/peers.js`.
- `src/services/peers.{js,test.js}` (9 tests) — exporte `fetchPeers(symbol, {signal})` (client `/api/peers`) et `fetchPeerQuotes(symbols, {signal})` (wrapper sur `/api/quotes` batched, retourne `{quotes, errors}` ou shortcut vide quand symbols est vide).
- `src/utils/peersFormatters.{js,test.js}` (8 tests) — `buildPeersTable(peers, quotes, baseQuote)` aligne les pairs avec leur quote et calcule `deltaVsBasePct` (différence de variation % en points), marque `status: 'missing'` quand la cotation manque; `rankPeersByChange(rows, {direction})` trie par `changePct` desc/asc en gardant les missing à la fin; `formatDeltaVsBase(value)` formate l'écart en `+/-X.XX pp`.
- `src/components/PeersComparisonPanel.{jsx,test.jsx}` (8 tests) — pattern FIS standard (state {symbol, status, peers, quotes, fetchedAt, source, error} + AbortController + 4 états render). Table responsive (mobile: chip variation %; desktop: prix + var. abs. + var. % + Δ vs base). Empty-state explicite quand Finnhub ne retourne aucun pair.

Fichiers étendus:

- `src/components/IntelligenceCard.jsx` — `<PeersComparisonPanel asset={asset} />` empilé après `<SecFilingsPanel />`.

Choix architecturaux:

- **TTL 24h sur la liste de pairs** : la liste change rarement (quelques fois par an); les cotations elles passent par le cache 20s du `/api/quotes`.
- **Réutilisation du batch `/api/quotes`** plutôt qu'un nouvel endpoint dédié — un seul fetch HTTP pour les N pairs au lieu de N appels parallèles, et bénéficie du fallback Stooq déjà en place.
- **Δ vs base en points de pourcentage** : on compare des taux de variation (déjà en %), donc l'écart est en pp pour ne pas confondre avec une variation %.
- **Classement par changePct desc** : permet à l'opérateur de voir d'un coup d'œil qui surperforme et qui sous-performe vs le symbole de référence.
- **Pairs sans cotation marqués `missing`** : Finnhub liste parfois des pairs hors US (`MC.PA` Bouygues vs LVMH par ex.) que le quote upstream ne couvre pas; on l'affiche mais explicitement dégradé (« Cotation indisponible ») plutôt que de le filtrer silencieusement.
- **Pas de healthcheck dédié** : la clé Finnhub est partagée; le probe existant suffit.
- **Pas de fondamentaux comparés en V1** : N appels parallèles à `/api/fundamentals` chargerait sensiblement le panel et la liste utile dépendrait du secteur (P/E pour software, EV/EBITDA pour utilities, etc.). Reportable en V2 si l'usage le justifie.

## Bloc dépôts SEC livré (2026-05-10, après analyse Buffett + thèmes)

`/stock/filings` Finnhub empilé tout en bas de la fiche actif, sous `CompanyNewsPanel`. Pattern modulaire identique à analyst ratings — 7 fichiers neufs, zéro modif des panels existants (un seul ajout dans `IntelligenceCard.jsx` + un nouveau handler dans `vite.config.js`).

Fichiers ajoutés:

- `server/secFilings.js` (+tests, 10) — `fetchSecFilings(symbol, {finnhubApiKey, limit})`, normalise items Finnhub (form/filedDate/acceptedDate/reportUrl/filingUrl/cik/accessNumber), filtre les items sans form ou sans URL, sort desc par filedDate, cap à 15 (max 25). Fetcher injectable, testable hors HTTP, ne leak jamais le token dans les erreurs.
- `vite.config.js` — middleware `/api/sec-filings` avec `readThroughCache` TTL 24h + handler Vercel `api/sec-filings.js`.
- `src/services/secFilings.{js,test.js}` (5 tests) — client fetch + `AbortSignal`.
- `src/utils/secFilingsFormatters.{js,test.js}` (10 tests) — `describeFormType` (mapping FR de 22 form types courants → `{key, label, tone}`), `formatFiledDate` (UTC `fr-CA`, mois court), `resolveFilingUrl` (préfère `reportUrl`, fallback `filingUrl`), `groupByForm` (préserve l'ordre most-recent-first).
- `src/components/SecFilingsPanel.{jsx,test.jsx}` (7 tests) — pattern FIS standard (state {symbol, status, items, fetchedAt, source, error} + AbortController + 4 états render). Groupé par type avec chip de tone, lien externe `target="_blank" rel="noopener noreferrer"` vers le report SEC.

Fichiers étendus:

- `src/components/IntelligenceCard.jsx` — `<SecFilingsPanel asset={asset} />` empilé après `<CompanyNewsPanel />`.

Choix architecturaux:

- **TTL 24h** : les dépôts SEC arrivent par lots quotidiens, refetch plus fréquent inutile.
- **Empilé en bas de la fiche** : un dépôt SEC est un complément documentaire, pas une donnée de pilotage primaire. Sous les news qui sont l'élément le plus volatile.
- **Groupé par form type** : un même symbole peut avoir 5+ form 4 (insiders) sur 30 jours et un seul 10-K — la lecture par groupe est plus utile que par date brute.
- **Mapping FR limité aux 22 forms les plus courants** + fallback neutre slate pour les autres (CORRESP, NT-NSAR, etc.) — couvre l'essentiel sans mode dictionnaire encyclopédique.
- **Pas de healthcheck dédié** : la clé Finnhub est partagée avec quote/fundamentals/news/analyst-ratings; le probe existant suffit (Finnhub down ⇒ tout down).
- **Limitation source affichée explicitement** : `/stock/filings` Finnhub ne couvre que les émetteurs cotés aux États-Unis. L'état vide affiche « Aucun dépôt SEC publié pour <symbol>. Les dépôts SEC ne couvrent que les émetteurs cotés aux États-Unis. » plutôt qu'un faux placeholder.
- **`reportUrl` préféré à `filingUrl`** : `reportUrl` pointe vers le PDF/HTM du document, `filingUrl` pointe vers le browse-edgar SEC (page index). On fallback sur `filingUrl` quand `reportUrl` est absent (cas fréquent pour les form 4).
- **Pas de pagination** : on cap à 15 par défaut (max 25). Au-delà, l'utilisateur va directement sur EDGAR.

## Bloc analyse Buffett + thèmes optionnels livré (2026-05-10, après recommandations analystes)

Port du module standalone `fin_tech_buffet_module` (TS → JS) intégré comme panel empilé dans `IntelligenceCard` après `FundamentalsPanel`, et système de thèmes opt-in pour toute la suite.

Fichiers ajoutés:

- `src/utils/buffettCalculator.{js,test.js}` (29 tests) — `calcIntrinsicValue` (DCF Gordon-Shapiro 10y), `evaluateCriteria` (6 portes Buffett), `decideAction` (BUY/SELL/HOLD), `inferMoat` (heuristique ROE+growth+FCF+D/E), `resolveMoat` (overrides BRK.A/B). Pures, framework-agnostiques.
- `src/utils/buffettFormatters.{js,test.js}` (13 tests) — `extractBuffettInputs` (fields normalisés + price → MoatInputs), conversions Finnhub raw → ratios (`/100` ROE et growth, ratio brut D/E, dérivation FCF via `price / pfcfShareTtm`), formatters %/USD/ratio/action FR.
- `src/components/BuffettAnalysisPanel.{jsx,test.jsx}` (8 tests) — panel principal avec hero MoS, curseurs r/g, 6 critères, bandeau décision, math breakdown lazy. Pattern FIS standard (state {symbol, status, fields, fetchedAt, source, error} + AbortController + 4 états render).
- `src/components/BuffettMathBreakdown.{jsx,test.jsx}` (3 tests) — décomposition KaTeX en 5 sections (DCF/Applied/MoS/Decision/Criteria), labels FR, warning si r ≤ g.
- `src/services/themeStore.{js,test.js}` (10 tests) — `loadTheme/saveTheme/applyTheme/isValidTheme`, persistance localStorage `fis:theme:v1`, défaut `fis` (= aucun `data-theme` posé sur `<html>`).
- `src/components/ThemeSelector.{jsx,test.jsx}` (4 tests) — radiogroup 4 options (FIS / Matrix / Cyber / Clair), monté dans le header de `App.jsx`.

Fichiers étendus:

- `src/utils/fundamentalsNormalizer.js` (+2 tests, total 9) — emit de 4 nouveaux champs Finnhub raw consommés par Buffett (`roeTtm`, `epsGrowth5y`, `debtEquityAnnual`, `pfcfShareTtm`) — invisibles dans `FundamentalsPanel` car non listés dans `FUNDAMENTALS_DEFINITIONS`.
- `src/index.css` — ajout de 3 blocs `:root[data-theme="..."]` qui overrident les variables CSS du `@theme` block. Nouvelle var `--color-body-text` (était hardcodée `#e2e8f0`) pour permettre l'inversion en thème clair.
- `src/App.jsx` — `applyTheme(loadTheme())` au module-load avant le premier paint, `<ThemeSelector />` placé dans le header avant `<MarketDataStatus />`.
- `src/components/IntelligenceCard.jsx` — `<BuffettAnalysisPanel asset={asset} />` empilé entre `FundamentalsPanel` et `AnalystRatingsPanel`.
- `package.json` — `katex@^0.16.45` ajouté en dépendance (rendu math du panel).

Choix architecturaux:

- **Apparence FIS conservée à l'identique** : le thème `fis` (par défaut) n'applique aucun `data-theme` sur `<html>`, donc le `:root` de base reste actif et toutes les couleurs FIS originales restent identiques au pixel près. Aucun composant FIS existant n'a été modifié pour les thèmes, seules les CSS-vars changent.
- **Provenance par champ respectée** : le panel n'invente aucune valeur. Si un des 4 champs Buffett requis est absent (fréquent sur non-US Finnhub free), le panel affiche explicitement « Données insuffisantes » avec mention du fallback Twelve Data prévu V2 — aucun zéro ni placeholder.
- **Pas de duplication serveur** : le panel réutilise `/api/fundamentals` (TTL 6h existant), pas de nouveau handler. Le calcul DCF se fait côté client (pure math).
- **Pas de logique WS/cache propre** : le `livePrice` vient déjà de l'`asset.price` injecté par `App.jsx` via `liveQuotes`. Le module Buffett standalone embarquait sa propre WS Finnhub + cache — supprimé pour FIS car redondant.
- **MathBreakdown KaTeX français** : labels traduits (Acheter/Vendre/Conserver, Marché, Croissance, Marge entrée…) pour cohérence avec le reste de FIS.
- **Thème Light expérimental** : l'inversion sombre→clair fonctionne via les CSS-vars, mais certaines classes Tailwind utility hardcodées (text-white, text-slate-300/400/500) restent comme telles. Sur fond clair, le rendu est lisible mais sous-optimal — un raffinement viendra si l'usage le justifie.
- **VITE_FORCE_MOCK pas applicable** : FIS n'a pas de MockSource, le panel se base directement sur les fundamentals Finnhub. Si pas de clé Finnhub configurée côté serveur, les fundamentals échouent et le panel rend l'état `error` standard.

## Bloc recommandations analystes livré (2026-05-10, après activité société)

`/stock/recommendation` Finnhub empilé sous `FundamentalsPanel` (avant `EarningsCalendarPanel`).

Fichiers ajoutés:

- `server/analystRatings.js` (+tests, 7) — `fetchAnalystRatings(symbol, {finnhubApiKey})`, normalise par mois (strongBuy/buy/hold/sell/strongSell + total), filtre items vides ou hors symbole, sort desc par `period`.
- `vite.config.js` — middleware `/api/analyst-ratings` avec `readThroughCache` TTL 6h + handler Vercel `api/analyst-ratings.js`.
- `src/services/analystRatings.{js,test.js}` — client fetch + `AbortSignal` (5 tests).
- `src/utils/analystRatingsFormatters.{js,test.js}` — `computeConsensus` (mean pondérée 1–5 → label FR + tone), `formatBreakdown` (count + pct par bucket), `formatPeriod` (mois court FR en UTC), `buildHistorySeries` (12 tests).
- `src/components/AnalystRatingsPanel.jsx` — chip consensus + note moyenne + barres distribution + grille tendance 6 relevés. Empilé sous `FundamentalsPanel`.

Choix architecturaux:

- Convention de score: 5 = Achat fort → 1 = Vendre fort. Mean ≥ 4.5 = strong buy, ≥ 3.5 = buy, ≥ 2.5 = hold, ≥ 1.5 = sell, sinon strong sell.
- Pas de healthcheck dédié: la clé Finnhub est partagée avec quote/fundamentals/news, le probe existant suffit (Finnhub down ⇒ tout down).
- TTL 6h aligné sur fundamentals: les recommandations sont mensuelles côté source.
- Format de date en UTC strict (`timeZone: "UTC"`) pour éviter qu'une période `2026-04-01` ne s'affiche en mars selon le fuseau du navigateur.
- Empilé entre `FundamentalsPanel` et `EarningsCalendarPanel` car la lecture naturelle d'une fiche est: fondamentaux → consensus marché → calendrier → dividendes → news.

## Bloc activité société livré (2026-05-10, après fondamentaux)

3 endpoints + 3 panels Finnhub empilés sous la fiche actif (sous `FundamentalsPanel`).

Fichiers ajoutés:

- `server/companyNews.js` (+tests, 9) — `/company-news?symbol=X&from=...&to=...`, fenêtre 14 jours, dedup + sort + limit 10.
- `server/earningsCalendar.js` (+tests, 8) — `/calendar/earnings`, fenêtre passé 12 mois + à venir 90 jours, calcule `surprisePct` EPS, tag `when: past|upcoming`.
- `server/dividends.js` (+tests, 6) — `/stock/dividend`, historique 5 ans, normalise ex-date/pay-date/amount/currency.
- `vite.config.js` — middlewares `/api/company-news`, `/api/earnings`, `/api/dividends` (TTL 30 min / 6h / 24h respectivement); handlers Vercel équivalents dans `api/`.
- `src/services/{companyNews,earningsCalendar,dividends}.{js,test.js}` — clients fetch + AbortSignal (5-7 tests chacun).
- `src/components/{CompanyNewsPanel,EarningsCalendarPanel,DividendHistoryPanel}.jsx` — empilés sous `FundamentalsPanel` dans `IntelligenceCard`.
- `server/marketDataHealth.js` — `checkFinnhubCompanyNewsHealth` ajouté à `checkMarketDataHealth` (un seul probe pour les 3 endpoints — Finnhub down ⇒ tout down).

Choix architecturaux:

- TTL différenciés selon volatilité de la donnée: news 30 min, earnings 6h, dividendes 24h.
- Filtre par symbole côté server (Finnhub renvoie tout le calendrier earnings sur la fenêtre, pas que le symbole demandé).
- Pas de mock/placeholder: si Finnhub renvoie vide, le panel le dit explicitement (« Aucun X pour les Y dernières années »).
- Healthcheck: un seul probe `/company-news` (pas trois) — c'est le plus représentatif et minimise les appels.

## Bloc fondamentaux livré (2026-05-10)

V1 stricte Finnhub validée par l'utilisateur en début de session.

Fichiers ajoutés:

- `src/utils/fundamentalsNormalizer.js` (+tests) — normaliseur pur `profile2 + metric` → `{value, source, asOf}` avec USD bruts, omission stricte si champ absent.
- `server/fundamentals.js` (+tests) — `fetchFundamentals(symbol, {finnhubApiKey})` orchestrant `/stock/profile2` + `/stock/metric` en parallèle (Promise.allSettled, partiel toléré).
- `vite.config.js` — middleware `/api/fundamentals` avec cache TTL 6h + `api/fundamentals.js` (handler Vercel équivalent).
- `src/services/fundamentals.js` (+tests) — client `fetchFundamentals(symbol, {signal})`.
- `src/utils/fundamentalsFormatters.js` (+tests) — formatters par champ + `FUNDAMENTALS_DEFINITIONS` (ordre + libellés FR).
- `src/components/FundamentalsPanel.jsx` — grille KPI sous fiche actif, chip de source par champ + asOf en tooltip, champs absents masqués (pas de placeholder).
- `server/marketDataHealth.js` — `checkFinnhubFundamentalsHealth` ajouté à `checkMarketDataHealth` (probe `/stock/metric`).

Choix architecturaux:

- Normalisation côté serveur (un seul `normalizeFundamentals`), client est pass-through.
- `revenueTtm = revenuePerShareTTM × shareOutstanding × 1e6` uniquement si les deux sont présents (sinon omis).
- `marketCapitalization` Finnhub est en millions → multiplié par 1e6 dans le normaliseur.
- Cache TTL 6h côté serveur (les fondamentaux changent peu); pas de cache client.
- Fallback Twelve Data NON livré (différé en V2).

## Prochaine priorité — à choisir seul au prochain démarrage

L'utilisateur ne veut PLUS qu'on lui demande "axe A vs B vs C ?" en début de session. Choisir le bloc le plus logique et exécuter jusqu'à livraison complète. Mémoire: `feedback_no_decision_outsourcing.md`.

> **Réaligné 2026-05-29 sur `ROADMAP_PM.md` (modèle de phases P0.x).** La vision a été reformulée : **studio d'analyse personnalisable à 100 %** (noyau + features attachables, activer/désactiver + positionner librement, agencement optimal déterministe puis IA suggestive, simulateur de démo what-if, lisibilité néophyte). Les candidats ci-dessous suivent désormais les IDs `P0.x` du roadmap, pas l'ancien modèle « § ». L'ancien cap (`§10 rate limiting`) est rétrogradé en `P8.1` (close-the-loop infra, avant le premier `vercel --prod`, plus la priorité).

> **P0.1 livré 2026-05-29** — registre central `src/core/featureRegistry.js` + `featureRegistry.test.js` (16 tests). 8 panels asset + 8 sections dashboard enregistrés sans toucher leur code. `componentKey` = string stable (mapping→composant déféré à P0.3). Données pures gelées en profondeur + helpers (`getFeatureById`, `getFeaturesBySurface`, `groupFeaturesByCategory`, `getDefaultLayout`). Suite : 379 → **395 tests verts**, lint + build verts. Commits chirurgicaux (WIP étranger laissé intact, non stagé).

**Recommandation par défaut sur « on continue »** : **P3.3b — stockage transactions + journal UI**. Le moteur pur `lotEngine` (P3.3a) est livré ; reste : (1) store client `transactionStore` (localStorage `fis:transactions:v1`, scopé par mandat comme les positions, CRUD purs + tests) ; (2) un panneau/onglet « Transactions » (saisie achat/vente/dividende/frais + liste + tableau réalisé/lots par symbole via `applyTransactions`+`summarize`) ; (3) migration 003 dev (table `transactions`) pour parité. Client-first. ⚠️ Principe IA transverse + palette gelée. **Reste ensuite** : P3.2c (parité dev SQLite multi-portefeuille), P3.4 (multi-devises + FX, provider externe ECB/exchangerate.host — nouvel endpoint dev+prod). **P1.2 (IA) gelé.** NB ouvert : colonnage 1/2 dans `LayoutSurface`.

Candidats restants (ordre = chemin recommandé du roadmap) :

**Phase 0 — noyau personnalisable (priorité absolue, dans l'ordre) :**
- ~~**P0.1** registre de features (`src/core/featureRegistry.js`)~~ ✅ livré.
- ~~**P0.2** store de préférences + layout (`src/services/layoutStore.js`)~~ ✅ livré.
- ~~**P0.3** rendu piloté par le layout (LayoutSurface + useLayout, IntelligenceCard + dashboard)~~ ✅ livré.
- ~~**P0.4** onglet Paramètres `/settings` : toggles + drag-and-drop + colonnage + reset~~ ✅ livré.
- ~~**P0.5** profils de gestionnaire (presets + custom)~~ ✅ livré — **🏁 PHASE 0 COMPLÈTE**.

**Phase 1 — agencement optimal :**
- ~~**P1.1** moteur d'agencement déterministe (`src/core/layoutEngine.js`)~~ ✅ livré.
- **P1.2** suggestion IA opt-in — **GELÉ** (optionnel, prise prête : frère de `optimizeLayout`, validé registre, `apply()`).

**Phase 2 — simulateur de démo (premier jalon vendable) :**
- ~~**P2.1** calculateur what-if (`src/utils/simulationCalculator.js`)~~ ✅ livré.
- ~~**P2.3** `SimulationPanel` (graphique + tableau + bandeau « pas un conseil »)~~ ✅ livré.
- ~~**P2.2** portefeuille de démo multi-positions vs benchmark~~ ✅ livré — **🏁 PHASE 2 COMPLÈTE (MVP)**.

**Phase 3 — socle données PM (en cours) :**
- ~~**P3.1** migrations SQLite versionnées (`server/migrate.js` + `migrations/NNN_*.sql`)~~ ✅ livré.
- ~~**P3.2** multi-portefeuilles (client-first : selector + scoping)~~ ✅ livré. Reste P3.2c (parité dev SQLite, dev-only).
- **P3.3** transactions + lots fiscaux : ~~moteur pur `lotEngine` (P3.3a)~~ ✅ ; **reste P3.3b stockage + journal UI** — *recommandation par défaut, ci-dessus*.
- **P3.4** multi-devises + FX (provider externe ECB/exchangerate.host).
- **P4.x** returns / TWR / MWR / vol-drawdown / Sharpe-Sortino-Calmar / benchmark / beta / ratios étendus / attribution Brinson / distribution / VaR-CVaR / stats opérationnelles — chacune = feature de catalogue.

**Phases 5-9 — selon besoins réels :**
- **P5.x** journal/compliance/rééquilibrage/watchlists thématiques + données complémentaires (canadien, macro FRED, ESG/insider/short).
- **P6.x** exploitation client (PDF mensuel, snapshots fiscaux T5008/1099-B, commentaire PM, portail client read-only).
- **P7.x** multi-utilisateur (auth, rôles, audit trail, multi-tenant, Postgres) — seulement si cabinet.
- **P8.x** close-the-loop infra : **P8.1 rate limiting `/api/*`** (ex-§10, à faire avant le premier `vercel --prod`), cron, alertes serveur, observabilité, conformité Loi 25. Déclenchement `vercel --prod` = action utilisateur (hard-stop).
- **P9.x** UX paroxystique (candlesticks/indicateurs, i18n FR/EN, densité, finition thème clair *optionnel* — **palette FIS par défaut jamais touchée**).

Le mot magique `FIS-REPRISE-FD01815` reste valide pour relire ce fichier au prochain `claude`.

## Commandes utiles

Validation:

```bash
npm run lint
npm test
npm run build
```

Etat git:

```bash
git status --short
git log --oneline -10
```

## Note fonctionnelle

L'application doit rester purement factuelle: aucune donnee mock visible, aucune prediction presentee comme fait, aucune analyse financiere avancee sans donnees sourcees.
