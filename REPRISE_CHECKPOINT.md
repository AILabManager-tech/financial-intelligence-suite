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

Checkpoint local principal:

`fd01815 feat: import broker CSV files into the portfolio`

Plus deux commits docs (`c64b536`, `3dc81e7`), le bloc fondamentaux (`e7a5e3b`), le bloc activité société (news + earnings + dividendes) livré le 2026-05-10 et le bloc recommandations analystes livré le 2026-05-10.

Branche: `main`. Aucun push à faire sans demande explicite.

## Modules ajoutés depuis le checkpoint précédent (1f884eb)

6 commits feature livrés sur `main`:

- `4b49340` — Alertes configurables (prix ≥/≤, variation % ≥/≤, drift) persistées localement, déclenchées sur tick.
- `da8d4ed` — Sélecteur de période 1D/5D/1M/6M/YTD/1Y/5Y sur la fiche actif (intraday/daily/weekly via Twelve Data).
- `a357a94` — Historique des 20 dernières recherches (déduplication, replay, suppression).
- `305e376` — Filtre pays/exchange + désambiguïsation multi-marché sur la recherche.
- `fd01815` — Import CSV broker (parser RFC 4180, détection EN/FR, preview ligne par ligne).
- `e7a5e3b` — Fondamentaux sourcés Finnhub V1 stricte: `/api/fundamentals` (cache TTL 6h), `FundamentalsPanel` sous fiche actif, audit de provenance par champ, healthcheck étendu à `/stock/metric`.
- `(committé)` — Activité société Finnhub: `/api/company-news` (TTL 30 min), `/api/earnings` (TTL 6h), `/api/dividends` (TTL 24h); panels `CompanyNewsPanel`, `EarningsCalendarPanel`, `DividendHistoryPanel` empilés sous fiche actif; healthcheck étendu à `/company-news`.
- `(à committer)` — Recommandations analystes Finnhub: `/api/analyst-ratings` (TTL 6h) `/stock/recommendation`; `AnalystRatingsPanel` empilé sous `FundamentalsPanel` (consensus le plus récent + distribution % par bucket + tendance des 6 derniers relevés); pas d'extension du healthcheck (le probe Finnhub existant couvre la même clé).

État tests: 52 → 124 → 162 → 206 → 230 tests verts. Lint et build verts.

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
- `npm test` OK, 230 tests
- `npm run build` OK

## Serveur local

URL locale:

`http://127.0.0.1:20000/`

Verifier si le serveur tourne:

`pgrep -a -f "vite --host 127.0.0.1 --port 20000"`

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

Candidats restants par section (du plus close-the-loop au plus structurel):

- §5 close-the-loop — fallback Twelve Data sur fondamentaux (V2) pour couvrir les non-US (déjà livré V1 stricte).
- §5 dépth — filings SEC (`/stock/filings`), comparaison sectorielle, score interne explicable.
- §4 visualisations — volume sous la courbe, candlesticks OHLC, comparaison benchmark/multi-actifs, drawdown réel, volatilité réalisée, corrélation.
- §1 — splits/dividendes (intégrer aux courbes), pre/after-hours, multi-devises, mapping officiel symboles/exchanges.
- §7 — alertes volume inhabituel, notifications email/navigateur, jobs planifiés serveur, résumé quotidien.
- §3 — P&L réalisé, gestion frais, devises, lots fiscaux, multi-portefeuilles.
- §8-11 — couche plateforme: PG/migrations/auth/CI/déploiement Vercel/monitoring (gros chantier).

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
