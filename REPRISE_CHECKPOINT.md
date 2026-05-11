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

**Recommandation par défaut sur « on continue »** : **§10 — rate limiting applicatif sur `/api/*`**. Repo est désormais nettoyé (audit éponge dans `1c789cb`+cleanup à venir), CI active, déploiement Vercel préparé. Le prochain renforcement utile avant le premier `vercel --prod` est la protection des handlers contre les abus (60-rpm Finnhub free se vide vite si quelqu'un automatise des appels). Bloc court (~1h): middleware shared rate-limiter (en mémoire par IP, fenêtre glissante, header `Retry-After`), appliqué à tous les `/api/*` côté `vite.config.js` et clonage dans les handlers Vercel (chaque function a son propre limiteur in-memory — pas idéal en cluster, mais cohérent avec le reste de l'architecture serverless stateless).

Candidats restants (du plus close-the-loop au plus structurel) :

- §10 — rate limiting applicatif `/api/*` (par IP, fenêtre glissante, retour 429 + `Retry-After`).
- §11 close-the-loop — déclenchement effectif `vercel --prod` (action utilisateur, Claude ne lance pas).
- §5 close-the-loop — fallback Twelve Data sur fondamentaux (V2) pour couvrir les non-US (V1 Finnhub stricte déjà livrée; le panel Buffett rend explicitement « Données insuffisantes » sur les non-US, c'est le déclencheur naturel). Optionnellement, V2 du panel `PeersComparisonPanel` : ajouter une colonne P/E ou market cap récupérée en parallèle via N appels `/api/fundamentals`.
- §4 visualisations — volume sous la courbe, candlesticks OHLC, comparaison benchmark/multi-actifs, drawdown, volatilité.
- §8-9 — DB managée (Supabase/Neon Postgres) + auth + multi-utilisateur. Gros chantier; à attaquer après que le déploiement Vercel ait été validé en preview au moins une fois par l'opérateur.
- §1 — splits/dividendes intégrés aux courbes, pre/after-hours, multi-devises.
- §13 — politique confidentialité, mentions légales, conservation des données.
- §4 visualisations — volume sous la courbe (extension `PriceHistoryChart`), comparaison benchmark/multi-actifs (panel séparé), candlesticks OHLC, drawdown réel, volatilité réalisée, corrélation.
- §1 — splits/dividendes (intégrer aux courbes), pre/after-hours, multi-devises, mapping officiel symboles/exchanges.
- §7 — alertes volume inhabituel, notifications navigateur (Notification API), jobs planifiés serveur, résumé quotidien.
- §3 — P&L réalisé, gestion frais, devises, lots fiscaux, multi-portefeuilles.
- §6 — raffiner le thème Clair (utilities Tailwind hardcodées à neutraliser), densité, devise, langue.
- §11 déploiement Vercel — **soulevé explicitement par l'utilisateur en fin de session précédente**. Bloc de ~2h: `vercel.json`, gating SQLite si filesystem read-only, ENV vars dashboard, README court de procédure. Ne PAS lancer `vercel deploy` automatiquement (hard-stop) — préparer la config et laisser le user déclencher.
- §8-9 — DB managée (Supabase/Neon Postgres), migrations versionnées, auth, multi-utilisateur (gros chantier; à attaquer après le déploiement Vercel pour avoir une cible de prod claire).

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
