# Roadmap PM — Financial Intelligence Suite

> Plan de transformation de l'app, aujourd'hui terminal d'analyse par titre, en outil de gestion de portefeuille pro multi-mandats. Ordonné par dépendances. Pattern feature × couche pour chaque module (server + tests + api + service + tests + formatters + tests + panel) tel que défini dans `CLAUDE.md`.
>
> Effort en jours-équivalent solo : S = 1 j, M = 2-3 j, L = 4-7 j, XL = 8+ j.
>
> Source de vérité du périmètre : `PLATFORM_CHECKLIST.md` pour le détail des cases [ ] / [~] / [x]. Cette roadmap regroupe les manques en modules cohérents et leur donne un ordre d'exécution.

## Diagnostic de départ (2026-05-27)

L'app est aujourd'hui un excellent terminal d'analyse par titre (10 panels factuels par fiche actif : quotes, history, fundamentals, news, earnings, dividends, analyst ratings, SEC filings, peers, Buffett DCF). Côté gestion de portefeuille, le socle est mince : un seul portefeuille, mono-devise, sans lots fiscaux, sans benchmark, sans mesures de risque réelles, sans rapport client. Un PM qui veut gérer 5 mandats clients ne peut pas s'en servir aujourd'hui.

Les vraies mesures de risque (volatilité, drawdown, Sharpe) ont été retirées au commit `96e057a` parce qu'elles étaient inertes / non câblées dans l'UI. À reconstruire **réelles** à partir des historiques Twelve Data déjà en cache.

## Note de challenge

Au-delà de la **Phase 5**, la valeur marginale décroît pour un PM solo ou petit cabinet. Les phases 6-8 ne sont rentables que si l'app sert un cabinet multi-PM ou est commercialisée. Avant chaque phase tardive, repasser le filtre `CLAUDE.md` : « ça fait fonctionner un projet, ou ça documente juste une exécution ? ».

---

## Phase 0 — Socle modèle (bloquant pour tout le reste)

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M0.1 Migrations SQLite versionnées | Système `migrations/NNN_*.sql` + runner; remplacer le `CREATE TABLE IF NOT EXISTS` au démarrage | S | — |
| M0.2 Multi-portefeuilles | UI sélecteur de portefeuille en header + CRUD mandat (nom, client, devise base, date d'ouverture). Table `portfolios` déjà présente, juste exposer. | M | M0.1 |
| M0.3 Transactions + lots fiscaux | Table `transactions` (achat/vente/dividende/frais/apport/retrait), engine FIFO/LIFO/spec ID, P&L réalisé par lot, frais imputés | L | M0.1, M0.2 |
| M0.4 Multi-devises + FX | Table `fx_rates` (daily), nouveau provider FX (ECB ou exchangerate.host gratuit), conversion P&L vers devise base du portefeuille. Chaque position porte sa devise native. | L | M0.1, M0.2 |

**Livrable phase 0** : un PM peut gérer N mandats clients, chacun en CAD ou USD, avec historique transactionnel complet et P&L réalisé + latent.

---

## Phase 1 — Mesures portefeuille factuelles

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M1.1 TWR (time-weighted return) | Calcul GIPS à partir des snapshots + flux d'apports/retraits. Remplace l'actuel `PortfolioPerformanceChart` valeur brute. | M | M0.3 |
| M1.2 MWR / IRR | Newton-Raphson sur flux nets. Complète M1.1, surtout pour mandats avec apports irréguliers. | S | M1.1 |
| M1.3 Volatilité réalisée + drawdown max | À partir des historiques Twelve Data déjà en cache. Fenêtres 30 j / 90 j / 1 y / inception. | M | M1.1 |
| M1.4 Sharpe + Sortino + Calmar | Taux sans risque configurable (BoC ou 10y Treasury). Formules pures côté serveur. | S | M1.3 |
| M1.5 Beta portefeuille + corrélation inter-positions | Matrice de corrélation Pearson sur returns daily. Beta vs benchmark choisi. | M | M1.3, M1.6 |
| M1.6 Benchmark (S&P 500, TSX, MSCI ACWI, custom) | Choix par portefeuille. Courbe overlay. Alpha = TWR – TWR(benchmark). | M | M1.1 |
| M1.7 Attribution de performance | Décomposition Brinson-Hood-Beebower (sélection + allocation + interaction) par secteur et par devise. | L | M1.6, M0.4 |

**Livrable phase 1** : reporting de risque/rendement aux standards CFA Institute. L'app devient un vrai outil PM.

---

## Phase 2 — Décisions et conviction

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M2.1 Journal d'investissement par position | Thèse d'achat (markdown), conviction 1-5, prix cible, stop, date de revue prévue | M | M0.2 |
| M2.2 Contraintes / compliance par portefeuille | Max % par titre, max % par secteur, exclusions ESG (liste noire), devise base, cash floor. Validations bloquantes lors de l'ajout / import. | M | M0.2 |
| M2.3 Rééquilibrage avec coûts | Suggestion d'ordres pour ramener au target en minimisant les transactions + frais simulés. Respecte les contraintes M2.2. | M | M2.2, M0.3 |
| M2.4 Watchlists thématiques | Plusieurs watchlists nommées (ex : « Energy à surveiller », « Candidats Buffett ») au lieu d'une seule. | S | — |
| M2.5 Notes datées par actif | Timeline de notes courtes (audit decision-making). | S | — |

---

## Phase 3 — Données complémentaires

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M3.1 Couverture canadienne | Symboles `.TO` / `.V` / `.CN`, dividendes en CAD avec brut/net, filings SEDAR+ via le portail CSA, exclusion retenue 15 % USA pour comptes enregistrés. | L | M0.4 |
| M3.2 Macro (taux, inflation, courbe) | BoC + Fed via FRED API (gratuit). Panel macro global. Tags d'exposition macro par secteur. | M | — |
| M3.3 ESG ratings | MSCI ESG (payant) ou Sustainalytics ou fallback Yahoo `esgScores` (gratuit, limité). Panel ESG par fiche actif. | M | — |
| M3.4 Options chain + grecques | Finnhub `/stock/option-chain` (premium) ou Yahoo. Delta / gamma / theta / vega. Positions options dans portefeuille. | XL | M0.3 |
| M3.5 Insider transactions | Finnhub `/stock/insider-transactions` (US) + SEDI scraping (CA). Panel insider activity. | M | — |
| M3.6 Short interest + put/call ratio | Indicateurs sentiment marché. Finnhub `/stock/short-interest`. | S | — |

---

## Phase 4 — Exploitation client

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M4.1 Reporting PDF mensuel/trimestriel | Génération via `@react-pdf/renderer` ou typst. Sections : sommaire, positions, perf vs benchmark, attribution, commentaire PM. Template personnalisable par mandat. | L | M1.7 |
| M4.2 Snapshots fiscaux annuels | Export structuré pour T5008 (CA) ou 1099-B (US) : gains/pertes par lot par année fiscale. | M | M0.3 |
| M4.3 Commentaire PM par période | Champ markdown daté, attaché au snapshot mensuel. Intégré au PDF M4.1. | S | M4.1 |
| M4.4 Portail client lecture-seule | URL signée temporaire par mandat. Vue read-only des positions + perf + dernier PDF. | M | M4.1, M5.1 |

---

## Phase 5 — Infrastructure multi-utilisateur

> Bloquant pour passer d'outil solo à outil cabinet. Avant la Phase 5, l'app reste single-tenant local.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M5.1 Auth | Sessions httpOnly + bcrypt, ou Clerk/Auth0 (build vs buy). Pas de SSO au début. | L | — |
| M5.2 Rôles | PM (full), client (read-only sur ses mandats), compliance (read-all + audit logs), admin. | M | M5.1 |
| M5.3 Audit trail | Table `audit_log` : chaque mutation portefeuille horodatée avec user_id + diff JSON. | M | M5.1 |
| M5.4 Multi-tenant (cabinet) | Table `organizations`, scope toutes les requêtes par `org_id`. Un PM = un user dans une org. | L | M5.2 |
| M5.5 Migration SQLite → Postgres | Si M5.4 livré, SQLite local devient insuffisant. Supabase ou Postgres self-hosted. | L | M5.4 |

---

## Phase 6 — Automatisation et observabilité (valeur marginale décroissante en solo)

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| M6.1 Jobs cron serveur | Snapshots quotidiens auto, refresh FX, refresh fundamentals à expiration. Via Vercel Cron ou GitHub Actions scheduled. | M | M0.1 |
| M6.2 Alertes email / SMS / webhook | Resend ou Mailgun pour email, Twilio pour SMS. Les alertes config déjà existantes deviennent serveur-side. | M | M6.1, M5.1 |
| M6.3 Rate limiting + cache partagé | Upstash Redis (serverless) pour cache TTL partagé entre fonctions Vercel + rate limit par IP / user. | M | M5.1 |
| M6.4 Logs structurés + tracing | OpenTelemetry + provider (Honeycomb / Axiom free tier). Spans par requête API. | M | — |
| M6.5 Monitoring uptime + errors | UptimeRobot (gratuit) pour endpoints, Sentry free tier pour frontend. | S | — |

---

## Phase 7 — Intelligence avancée (à challenger fortement)

> Avant d'attaquer cette phase : est-ce que tu vas vraiment l'utiliser, ou est-ce que QuantConnect / Backtrader / Portfolio Visualizer fait déjà mieux ? Beaucoup de PM achètent ces outils plutôt que de les rebuilder.

| Module | Périmètre | Effort | Valeur réelle |
|---|---|---|---|
| M7.1 Backtesting de stratégies | Engine d'événements sur historiques OHLCV. Règles d'entrée / sortie codées. | XL | Faible — outils dédiés mieux |
| M7.2 Optimisation Markowitz / Black-Litterman | Frontière efficiente. Min variance / max Sharpe. Allocation tangente. | L | Moyenne — utile en pédagogie client |
| M7.3 Stress tests / scénarios macro | Scénarios paramétrables (taux +200 pb, baisse pétrole, etc.). P&L choqué par position. | L | Élevée si M3.2 livré |
| M7.4 LLM résumé news + Q&A factuel | Qwen-gencore local (déjà disponible chez gear-code) résume daily news par titre. Q&A grounded sur les données portefeuille avec garde-fous anti-hallucination. | L | Moyenne — gadget si pas grounded |
| M7.5 Détection d'anomalies portefeuille | Concentration excessive, drift > 2σ, corrélation grimpante, dividende coupé. | M | Élevée |

---

## Phase 8 — UX paroxystique (cosmétique, faire en dernier ou jamais)

| Module | Périmètre | Effort | Note |
|---|---|---|---|
| M8.1 Candlesticks OHLC + indicateurs techniques (RSI, MACD, Bollinger) | Recharts ou lightweight-charts (TradingView). | L | Un PM regarde rarement ça, attention à pas devenir un outil de day-trader |
| M8.2 i18n FR / EN | `react-intl` ou `lingui`. Toutes les strings extraites. | M | Indispensable si tu vises hors-Québec |
| M8.3 Densité d'affichage + raccourcis clavier | Mode compact pour PM expérimentés. `j` / `k` navigation, `/` recherche. | M | — |
| M8.4 UX mobile responsive | Reflows panels, navigation tab bar. Pas d'app native. | L | Un PM bosse à 90 % au desktop, ROI faible |
| M8.5 Dark / light mode propre | Finir le pass Tailwind (utilities hardcodées `text-white` / `text-slate-300`). | M | Cosmétique pure |

---

## Chemin recommandé sans détour

1. **Phase 0 entière** (M0.1 → M0.4) — ~10-15 j. Socle, rien d'autre n'a de sens avant.
2. **Phase 1 jusqu'à M1.6** — ~10 j. À ce stade l'app est déjà un outil PM utilisable solo.
3. **Phase 2 entière + M3.1 (canadien) + M4.1 (PDF)** — ~10 j. C'est le point où l'app devient livrable à un vrai client.
4. **Phase 5** seulement si tu vises un cabinet multi-PM. Sinon s'arrêter à Phase 4 et capitaliser.
5. **Phases 6-7-8** — à challenger projet par projet, pas en bloc.

**Total Phase 0 → 4 minimal viable PM** : ~35-45 jours de dev solo, ~15 nouveaux modules feature × couche, ~100 fichiers neufs cohérents avec le pattern actuel. Aucune refonte des features existantes (le pattern garantit l'isolation).

---

## Prochain bloc recommandé

**M0.1 (migrations SQLite versionnées)** comme amorce immédiate avant M0.3 (lots fiscaux). Effort S, déverrouille toute la Phase 0 proprement. Sans système de migration, ajouter `transactions` puis `fx_rates` puis `audit_log` etc. via `CREATE TABLE IF NOT EXISTS` au démarrage devient ingérable au bout de 3 ajouts.

## Mise à jour de ce document

À chaque module livré :
1. Cocher dans `PLATFORM_CHECKLIST.md` (source de vérité granulaire).
2. Marquer le module ici avec `[x]` devant son ID + date de livraison + commit SHA court.
3. Mettre à jour `REPRISE_CHECKPOINT.md` avec les candidats du prochain bloc.

Format de tracking par module (à ajouter en suffixe quand livré) :

```
M0.1 [x] livré 2026-MM-DD `abc1234` — migrations SQLite versionnées
```
