# Roadmap PM — Financial Intelligence Suite

> **Vision (réécrite 2026-05-29).** Faire de l'app un **studio d'analyse financière personnalisable à 100 %**. Un noyau fort autour duquel n'importe quel gestionnaire attache, retire et **positionne librement** les features qu'il veut — quelles que soient ses habitudes. On livre un squelette + un catalogue de features ; le gestionnaire compose son interface. Un onglet Paramètres permet d'activer/désactiver chaque feature et de la placer où il veut. Un moteur d'agencement (déterministe d'abord, suggestion IA ensuite) propose un placement optimal d'après les features cochées et le profil. Un simulateur de démo (« 100 000 $ investis en 2017 dans X → valeur aujourd'hui ») sert les démonstrations client sur données factuelles avec hypothèses fictives clairement étiquetées. Tout doit être lisible au premier coup d'œil, graphique **et** tableau, par une personne non familière du domaine.
>
> Pattern feature × couche pour chaque module (server + tests + api + service + tests + formatters + tests + panel) tel que défini dans `CLAUDE.md`. Effort en jours-équivalent solo : S = 1 j, M = 2-3 j, L = 4-7 j, XL = 8+ j.
>
> Source de vérité du périmètre granulaire : `PLATFORM_CHECKLIST.md`. Cette roadmap regroupe les manques en modules cohérents et leur donne un ordre d'exécution **dicté par la vision ci-dessus**, pas par la complétude analytique.

## Les 4 piliers de la vision (par quoi tout est jugé)

1. **Noyau + features attachables** — modularité totale. *Déjà en place architecturalement* (pattern feature × couche, 10 panels isolés). Le squelette existe ; il faut le rendre pilotable.
2. **Personnalisation 100 %** — activer/désactiver chaque feature + la **positionner librement**. C'est le cœur produit, promu en Phase 0.
3. **Agencement optimal** — l'app propose un layout. Déterministe (règles + presets) d'abord, **suggestion IA en surcouche opt-in** ensuite (jamais bloquante).
4. **Simulateur de démo + lisibilité néophyte** — what-if historique factuel, restitution graphique + tableau compréhensible sans expertise.

## Contrainte transversale — palette de couleurs gelée (intangible)

**La palette de couleurs FIS actuelle est conservée à l'identique. On n'y touche pas.** Le travail de cette roadmap est **structurel** (back-end, registre, layout, agencement) — jamais chromatique.

- Source de vérité : le bloc `@theme` de `src/index.css` (lignes 4-15) — 5 teintes de surface (`--color-surface-950` → `--color-surface-600`), 5 accents (`emerald`, `amber`, `rose`, `blue`, `violet`), `gold`, `body-text`. Ces valeurs sont **gelées**.
- L'architecture le garantit nativement : les couleurs sont 100 % en variables CSS, **découplées du layout**. Réagencer/activer/positionner des features ne modifie aucune valeur chromatique. Les composants consomment `--color-*` (ou les utilities Tailwind correspondantes), jamais de nouvelles couleurs en dur.
- Les thèmes optionnels existants (`matrix` / `cyber` / `light`, via `:root[data-theme="…"]`) restent **tels quels** — ni ajout, ni retrait, ni modification, sauf demande explicite.
- Règle pour toute nouvelle feature : réutiliser exclusivement les variables/teintes existantes. **Aucune nouvelle couleur introduite** sans validation explicite de l'utilisateur.

## Diagnostic de départ (2026-05-29)

L'app est aujourd'hui un excellent **terminal d'analyse par titre** : 10 panels factuels par fiche actif (quotes, history, fundamentals, news, earnings, dividends, analyst ratings, SEC filings, peers, Buffett DCF), provenance par champ, zéro mock, ~370 tests, CI verte, déploiement Vercel préparé.

**Ce qui sert la vision, déjà là** : l'architecture modulaire feature × couche (le « noyau + features » est une réalité technique, pas un vœu) ; `themeStore` + `ThemeSelector` (modèle exact d'un store de préférences versionné, persisté, à défaut no-op) ; `IntelligenceCard` qui agrège les panels.

**Ce qui manque pour la vision** : les panels sont **empilés en dur** dans `IntelligenceCard.jsx` (lignes 378-392) et le dashboard — aucune sélection, aucun repositionnement. Pas de registre de features. Pas de profils. Pas de moteur d'agencement. Pas de simulateur. La personnalisation n'existe pas encore.

**Écart vs le code mort retiré** : les vraies mesures de risque (volatilité, drawdown, Sharpe) avaient été retirées au commit `96e057a` car inertes. À reconstruire **réelles** — mais désormais comme **features attachables du catalogue**, pas comme du contenu figé.

## Note de challenge (à relire avant chaque phase)

- Filtre `CLAUDE.md` permanent : « ça fait fonctionner un projet, ou ça documente juste une exécution ? ».
- **Sur l'agencement IA** : un LLM qui génère du layout est non-déterministe, lent et coûte un appel par réorganisation. 90 % du résultat s'obtient avec des **presets par profil + règles de placement**. L'IA est un *bonus suggestif* par-dessus un système déterministe qui marche toujours — jamais la fondation. Cf. Phase 1.
- **Sur les features PM lourdes** (attribution Brinson, VaR…) : utiles, mais ce sont des **entrées de catalogue**, pas le cœur. Elles viennent après le noyau personnalisable et son socle de données. Ne pas inverser l'ordre sous prétexte de « complétude analytique ».
- **Au-delà de la Phase 6**, valeur marginale décroissante pour un PM solo / petit cabinet. Les phases multi-utilisateur ne sont rentables qu'en cabinet multi-PM ou en produit commercialisé.

---

## Phase 0 — Le noyau personnalisable (cœur de la vision, priorité absolue)

> Rien d'autre n'a de sens avant. C'est ce qui transforme un terminal figé en studio composable.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P0.1 Registre de features | Catalogue central `src/core/featureRegistry.js` : chaque feature (panel fiche actif, section dashboard, widget) déclare `{id, label, catégorie, surface ('asset'\|'dashboard'), composant, deps données, défaut visible}`. Source unique de vérité. Les 10 panels existants y sont enregistrés sans modifier leur code interne. | M | — |
| P0.2 Store de préférences + layout | `src/services/layoutStore.js` généralisant `themeStore` (localStorage versionné `fis:layout:v1`, `load/save/reset`, défaut = tout visible dans l'ordre canonique → **zéro régression**). Persiste par feature : visibilité on/off, ordre, colonnage (1/2 colonnes). | M | P0.1 |
| P0.3 Rendu piloté par le layout | Refactor de `IntelligenceCard.jsx` et du dashboard : remplacer l'empilage en dur par un rendu qui lit `featureRegistry` + `layoutStore`. **Seul gros touch d'orchestrateur central.** Les panels eux-mêmes ne changent pas (le pattern garantit l'isolation). Défaut identique au pixel à l'actuel. | L | P0.1, P0.2 |
| P0.4 Onglet Paramètres | Route `/settings` : liste des features par catégorie avec toggle on/off **+ réorganisation par glisser-déposer** (drag-and-drop, `@dnd-kit` ou natif HTML5). Aperçu live. Bouton « réinitialiser ». C'est l'interface que le gestionnaire utilise pour composer son espace. | L | P0.3 |
| P0.5 Profils de gestionnaire (presets) | Bundles nommés livrés d'origine : « Vue d'ensemble », « Value investor », « Trader », « Conseiller client ». Chaque profil = un set de features + un layout préconfigurés, applicable en 1 clic, puis ajustable. Base de l'accessibilité « ça marche dès l'ouverture ». Profils custom sauvegardables. | M | P0.4 |

**Livrable Phase 0** : n'importe quel gestionnaire ouvre l'app, choisit un profil (ou compose), active/désactive et **repositionne** ses features, et retrouve son espace à la prochaine session. Le noyau est composable.

**Convention transverse (à inscrire dans `CLAUDE.md`)** : toute feature ajoutée après P0.1 **doit** s'enregistrer dans `featureRegistry` (id + catégorie + surface + défaut visible). Coût marginal : +1 entrée de registre. Un panel non enregistré n'est pas montable — le registre devient la porte d'entrée unique.

---

## Phase 1 — Agencement optimal (le « l'IA positionne », fait correctement)

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P1.1 Moteur d'agencement déterministe | `src/core/layoutEngine.js` (pur, testable) : à partir des features cochées + le profil, génère un ordre + colonnage selon des règles (KPI de pilotage en haut, panels documentaires en bas, groupage par catégorie, panels lourds en pleine largeur, responsive). C'est **ça** qui « positionne optimalement » — fiable, instantané, gratuit. | M | P0.5 |
| P1.2 Suggestion IA opt-in | Bouton « Suggérer un agencement » : un appel LLM (Qwen-gencore local dispo chez gear-code, ou provider configuré) reçoit la liste des features + le profil et **propose** un layout que l'utilisateur accepte/ajuste. **Fallback déterministe (P1.1) si l'IA échoue/lente/absente.** Jamais bloquant, jamais automatique. Garde-fou : sortie validée contre le registre (aucune feature inventée). | M | P1.1 |

**Livrable Phase 1** : l'utilisateur clique « optimise mon espace » et obtient un agencement sensé sans rien glisser à la main — par règles, avec l'IA en bonus.

**Challenge intégré** : si P1.1 suffit en pratique (retours utilisateurs), P1.2 reste optionnel et peut être gelé. Ne pas faire de l'IA un prérequis.

---

## Phase 2 — Simulateur de démo (argument de vente client)

> Livrable tôt **parce qu'il ne dépend que de l'historique de prix déjà disponible** (Twelve Data `/api/history`), pas du socle transactionnel. C'est l'outil de démonstration.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P2.1 Moteur what-if historique | `server/simulation.js` + `src/utils/simulationCalculator.js` (purs) : « montant M investi à la date D dans le symbole S → valeur aujourd'hui », à partir de l'historique factuel. Rendement total, annualisé, courbe de croissance. Données réelles, hypothèse fictive **étiquetée**. | M | — (réutilise history existant) |
| P2.2 Portefeuille de démo multi-positions | Composer un portefeuille fictif (N positions, dates et montants d'entrée), projeter sa valeur agrégée dans le temps, comparer à un benchmark (ex. S&P 500). Pour démos client convaincantes. | M | P2.1 |
| P2.3 Restitution claire graphique + tableau | Feature de catalogue `SimulationPanel` : courbe de croissance + table année par année + KPIs (capital initial, valeur finale, gain, CAGR). Libellés accessibles néophyte. **Bandeau permanent « Simulation — hypothèse à partir de données factuelles, pas un conseil ».** | M | P2.1, P0.1 |

**Livrable Phase 2** : un gestionnaire fait une démo à un prospect — « si vous aviez investi 100 000 $ en 2017 dans ce titre, vous auriez X aujourd'hui » — graphique + tableau, clair pour un néophyte, factuellement honnête.

---

## Phase 3 — Socle de données PM (prérequis des features analytiques)

> Ce qui était la « Phase 0 » de l'ancien roadmap. Désormais en **support des features analytiques**, pas en tête : un gestionnaire peut déjà composer, présenter et simuler sans ça.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P3.1 Migrations SQLite versionnées | Système `migrations/NNN_*.sql` + runner ; remplace le `CREATE TABLE IF NOT EXISTS` au démarrage. Déverrouille proprement tous les ajouts de tables suivants. | S | — |
| P3.2 Multi-portefeuilles | Sélecteur de portefeuille en header + CRUD mandat (nom, client, devise base, date d'ouverture). Exposer la table `portfolios` déjà présente. | M | P3.1 |
| P3.3 Transactions + lots fiscaux | Table `transactions` (achat/vente/dividende/frais/apport/retrait), engine FIFO/LIFO/spec ID, P&L réalisé par lot, frais imputés. | L | P3.1, P3.2 |
| P3.4 Multi-devises + FX | Table `fx_rates` (daily), provider FX gratuit (ECB / exchangerate.host), conversion P&L vers devise base. Chaque position porte sa devise native. | L | P3.1, P3.2 |

**Livrable Phase 3** : un PM gère N mandats clients, chacun en CAD ou USD, historique transactionnel complet, P&L réalisé + latent.

---

## Phase 4 — Features PM analytiques attachables (catalogue)

> Les mesures du roadmap institutionnel original, devenues des **entrées du registre** qu'on coche au besoin. Chacune respecte le pattern et déclare sa clé de registre.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P4.1 Returns standards | CAGR, return cumulé, matrice par période (1J→inception), monthly returns. Base de tout factsheet. | M | P3.3 |
| P4.2 TWR (time-weighted return) | Calcul GIPS à partir des snapshots + flux. Annualisé + cumulé. Remplace la valeur brute actuelle. | M | P4.1 |
| P4.3 MWR / IRR | Newton-Raphson sur flux nets, annualisé. Effet timing client vs effet PM. | S | P4.2 |
| P4.4 Volatilité + drawdown + duration | σ × √252, fenêtres 30j/90j/1a/inception, max DD + duration de récupération. | M | P4.2 |
| P4.5 Sharpe + Sortino + Calmar | Taux sans risque configurable. Formules pures côté serveur. | S | P4.4 |
| P4.6 Benchmark (S&P 500, TSX, MSCI ACWI, custom) | Choix par portefeuille, overlay sur graphe, excess return annualisé. | M | P4.2 |
| P4.7 Beta + corrélation inter-positions | Régression OLS vs benchmark, matrice Pearson. | M | P4.4, P4.6 |
| P4.8 Ratios étendus vs benchmark | Jensen's alpha, tracking error, information ratio, R², up/down capture, Treynor. Cœur du factsheet institutionnel. | M | P4.7 |
| P4.9 Attribution Brinson | Sélection + allocation + interaction, par secteur et devise. | L | P4.6, P3.4 |
| P4.10 Distribution des returns | Best/worst périodes, % mois positifs, skewness/kurtosis, heatmap monthly. | M | P4.1 |
| P4.11 VaR / CVaR | VaR paramétrique + historique, horizons 1j/10j, 95/99 %, CVaR. | M | P4.4 |
| P4.12 Stats opérationnelles | Turnover, holding period moyen, hit ratio, win/loss, yield-on-cost. | M | P3.3 |

**Livrable Phase 4** : le catalogue contient un factsheet complet aux standards GIPS / CFA — mais chaque gestionnaire choisit lesquels afficher.

**Ratios écartés volontairement** : Omega, Kappa, Modified Sharpe, Burke — folklore académique, jamais demandés. Au cas par cas si un client les réclame.

---

## Phase 5 — Décisions, conviction et données complémentaires (catalogue)

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P5.1 Journal d'investissement par position ✅ | Thèse d'achat, conviction 1-5, prix cible, stop, date de revue. **Livré 2026-05-31** : feature catalogue fiche actif, persistance localStorage par symbole (comme la watchlist), catégorie `decisions`. | M | P3.2 |
| P5.2 Contraintes / compliance par portefeuille | Max % titre/secteur, exclusions ESG, cash floor. Validations bloquantes à l'ajout/import. | M | P3.2 |
| P5.3 Rééquilibrage avec coûts | Suggestion d'ordres au target en minimisant transactions + frais, respecte P5.2. | M | P5.2, P3.3 |
| P5.4 Watchlists thématiques | Plusieurs watchlists nommées au lieu d'une seule. | S | — |
| P5.5 Couverture canadienne | `.TO`/`.V`/`.CN`, dividendes CAD brut/net, SEDAR+, retenue 15 % US comptes enregistrés. | L | P3.4 |
| P5.6 Macro (taux, inflation, courbe) | BoC + Fed via FRED (gratuit). Panel macro global, tags d'exposition. | M | — |
| P5.7 ESG / insider / short interest (insider ✅) | Fallback Yahoo `esgScores` gratuit ; Finnhub insider + short interest. Panels de catalogue. **Sous-bloc insider livré 2026-05-31** : `InsiderTransactionsPanel` (fiche actif, catégorie `sentiment`) sur Finnhub `/stock/insider-transactions`, synthèse achats/ventes/solde net + lignes par initié, pattern 7-fichiers, zéro source neuve. Reste : short interest / insider-sentiment + ESG. | M | — |
| P5.8 Concentration & diversification ✅ | HHI + bandes standards, nombre effectif de positions, plus grosse position, top-5, spread sectoriel. **Livré 2026-05-31** : panel dashboard dérivé des positions (valeur de marché), catégorie `portfolio`, zéro API/snapshot. | S | P3.2 |
| P5.9 Analyse de repli (drawdown) niveau actif ✅ | Repli maximal + dates + durée sommet→creux, repli courant, statut récupéré/sous l'eau. **Livré 2026-05-31** : panel fiche actif dérivé de `/api/history` (catégorie `performance`), distinct du drawdown PORTEFEUILLE P4.4 (qui exige les snapshots). Zéro fichier serveur. | S | P4.1 |

---

## Phase 6 — Exploitation client

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P6.1 Reporting PDF mensuel/trimestriel | `@react-pdf/renderer` ou typst. Sommaire, positions, perf vs benchmark, attribution, commentaire PM. Template par mandat. | L | P4.9 |
| P6.2 Snapshots fiscaux annuels | Export T5008 (CA) / 1099-B (US) : gains/pertes par lot par année fiscale. | M | P3.3 |
| P6.3 Commentaire PM par période | Champ markdown daté, attaché au snapshot, intégré au PDF. | S | P6.1 |
| P6.4 Portail client lecture-seule | URL signée temporaire par mandat, vue read-only positions + perf + dernier PDF. | M | P6.1, P7.1 |

---

## Phase 7 — Infrastructure multi-utilisateur (seulement si cabinet / produit)

> Bloquant pour passer d'outil solo à outil cabinet. Avant, l'app reste single-tenant local.

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P7.1 Auth | Sessions httpOnly + bcrypt, ou Clerk/Auth0. Pas de SSO au début. | L | — |
| P7.2 Rôles | PM (full), client (read-only), compliance (read-all + audit), admin. | M | P7.1 |
| P7.3 Audit trail | Table `audit_log` : chaque mutation horodatée, user_id + diff JSON. | M | P7.1 |
| P7.4 Multi-tenant | Table `organizations`, scope par `org_id`. | L | P7.2 |
| P7.5 Migration SQLite → Postgres | Supabase ou Postgres self-hosted, si P7.4 livré. | L | P7.4 |

---

## Phase 8 — Automatisation, observabilité, conformité (close-the-loop)

| Module | Périmètre | Effort | Dépend de |
|---|---|---|---|
| P8.1 Rate limiting applicatif `/api/*` | Middleware par IP, fenêtre glissante, 429 + `Retry-After`. Protège le quota Finnhub free avant la prod. Bloc court (~1h). | S | — |
| P8.2 Jobs cron serveur | Snapshots quotidiens, refresh FX, refresh fundamentals. Vercel Cron ou GH Actions. | M | P3.1 |
| P8.3 Alertes email / webhook | Resend/Mailgun ; rendre serveur-side les alertes config existantes. | M | P8.2, P7.1 |
| P8.4 Observabilité | Logs structurés, OpenTelemetry, Sentry free tier, UptimeRobot. | M | — |
| P8.5 Conformité | Politique confidentialité, mentions légales, conservation, consentement (Loi 25). | M | — |

---

## Phase 9 — UX paroxystique (cosmétique, en dernier ou jamais)

| Module | Périmètre | Effort | Note |
|---|---|---|---|
| P9.1 Candlesticks OHLC + indicateurs (RSI, MACD, Bollinger) | lightweight-charts. | L | Attention à ne pas devenir un outil de day-trader |
| P9.2 i18n FR / EN | `react-intl` ou `lingui`. | M | Indispensable hors-Québec |
| P9.3 Densité + raccourcis clavier | Mode compact, `j`/`k`/`/`. | M | Recoupe les préférences P0 |
| P9.4 Finition thème clair (optionnel) | Neutraliser les utilities Tailwind hardcodées **uniquement** pour le thème optionnel `light`. **Ne touche PAS la palette FIS par défaut** (gelée, cf. contrainte transversale). | M | Cosmétique pure, opt-in |

---

## Chemin recommandé sans détour

1. **Phase 0 entière** (P0.1 → P0.5) — ~16-20 j. Le noyau personnalisable. C'est ce qui réalise la vision ; rien d'autre n'a de sens avant.
2. **Phase 1** (P1.1, P1.2) — ~5 j. L'agencement « optimal », déterministe puis IA suggestive.
3. **Phase 2** (P2.1 → P2.3) — ~7 j. Le simulateur de démo. À ce stade l'app **démontre** sa valeur à un prospect, est composable et auto-agencée. C'est le premier jalon vendable.
4. **Phase 3 + premières features Phase 4** (P3.1 → P4.6) — ~25 j. Socle données + returns/TWR/MWR/vol/Sharpe/benchmark attachables. L'app devient un vrai outil PM.
5. **Phase 4 reste + Phase 5** — selon les besoins réels des gestionnaires ciblés.
6. **Phase 6** — point où l'app est livrable à un client (PDF + fiscal).
7. **Phase 7** — seulement si cabinet multi-PM. Sinon s'arrêter à Phase 6 et capitaliser.
8. **Phases 8-9** — close-the-loop infra/conformité (P8.1 rate limiting à faire avant le premier `vercel --prod`) et cosmétique, à challenger pièce par pièce.

**Jalon « studio composable démontrable »** (Phases 0 → 2) : ~28-32 jours. C'est le MVP de **ta** vision — un noyau personnalisable, auto-agencé, avec simulateur de démo — avant même d'empiler les mesures PM lourdes.

---

## Modules livrés

```
P0.1 [x] livré 2026-05-29 `f242c0c` — registre central de features (src/core/featureRegistry.js + 16 tests)
        8 panels asset + 8 sections dashboard enregistrés. Champ componentKey = string
        stable (mapping -> composant déféré au rendu P0.3). Données pures, immuables (gel
        profond), helpers get/by-surface/by-category/default-layout. 395 tests verts.
P0.2 [x] livré 2026-05-29 — store de préférences + layout (src/services/layoutStore.js + 24 tests)
        Généralise themeStore : localStorage versionné `fis:layout:v1`, load/save/reset, défaut =
        absence d'entrée. Persiste PAR feature et PAR surface : visibilité on/off, ordre, colonnage
        (1/2). Réconciliation contre le registre au load ET au save : ids disparus écartés, nouvelles
        features du registre ajoutées en fin à leurs valeurs par défaut (zéro régression + tolérance
        aux futurs ajouts P0.x). Mutateurs purs immuables (setFeatureVisibility/Columns, moveFeature)
        + getVisibleFeatureIds (consommé par le rendu P0.3). 419 tests verts.
P0.3 [x] livré 2026-05-29 — rendu piloté par le layout (LayoutSurface + useLayout + refactor
        IntelligenceCard & App). Empilage en dur remplacé par un rendu lisant featureRegistry +
        layoutStore. Surface asset : 8 panels via LayoutSurface (uniformes, asset={asset}).
        Surface dashboard : bloc composable de 7 panneaux via LayoutSurface (props par
        componentKey, wrapItem pour les <section aria-label>). Sous-étapes :
          P0.3a `d90ef80` — infra (LayoutSurface, useLayout) + surface asset, pixel-identique.
          P0.3b `ef8c4a4` — réconciliation registre dashboard↔réalité (order corrigé, SafetyBadge
                 enregistré, AssetTable+SearchFilter+MarketLookup = chrome hors registre,
                 WatchlistPanel retiré (route /watchlist)).
          P0.3c `9cecda1` — surface dashboard pilotée, ordre vérifié live (browse :20000), pixel OK.
          fix  `2d86754` — bug pré-existant dup-key React dans MarketDataHealthPanel (provider
                 répété) corrigé en passant, +2 tests. Vérifié live : console propre.
        429 tests verts, lint + build verts.
P0.4 [x] livré 2026-05-29 — onglet Paramètres `/settings` (layout réactif + UI d'édition).
          P0.4a `6775022` — contexte réactif : LayoutProvider (état + persistance via effet) +
                 useLayout (réactif sous provider, fallback hors) + useLayoutControls ; App
                 enveloppé dans main.jsx. Remplace le useLayout mount-only de P0.3. 7 tests.
          P0.4b `568f6da` — page SettingsPage + route /settings + bouton nav « Paramètres » :
                 par surface, toggle visibilité + sélecteur colonnage 1/2 + reset. Boot screen
                 ne gate plus /settings. Vérifié live : masquer un panneau le retire du dashboard.
          P0.4c `682c75c` — réordonnancement : drag-and-drop natif HTML5 + boutons monter/descendre
                 (même move()). Vérifié live : descendre un panneau réordonne le dashboard.
        446 tests verts, lint + build verts. Palette FIS respectée (aucune couleur neuve).
P0.5 [x] livré 2026-05-29 — profils de gestionnaire (presets). CLÔT LA PHASE 0.
          P0.5a `584ab56` — 4 profils intégrés en données pures (core/layoutProfiles.js : Vue
                 d'ensemble / Value investor / Trader / Conseiller client) + buildLayoutFromProfile
                 + contrôle apply() au provider + ProfilePicker dans SettingsPage. Vérifié live :
                 appliquer « Trader » réduit le dashboard à ses 4 panneaux.
          P0.5b `3bd62a6` — profils custom (services/profileStore.js, fis:profiles:v1) :
                 enregistrer l'agencement courant comme profil nommé, appliquer, supprimer.
                 Vérifié live : profil sauvegardé, listé, persisté.
        466 tests verts, lint + build verts.
```

> **🏁 PHASE 0 COMPLÈTE (2026-05-29).** Le noyau personnalisable est livré : registre de features (P0.1) → store de layout réactif (P0.2) → rendu piloté (P0.3) → onglet Paramètres avec toggles/colonnage/drag-and-drop (P0.4) → profils intégrés + custom (P0.5). N'importe quel gestionnaire ouvre l'app, choisit un profil ou compose son espace (activer/désactiver/repositionner), et le retrouve à la session suivante. 466 tests verts.

```
P1.1 [x] livré 2026-05-30 — moteur d'agencement déterministe (src/core/layoutEngine.js + 8 tests).
        optimizeLayout/optimizeSurface réordonnent par priorité de catégorie (overview/KPI en haut
        → monitoring → documents en bas), ordre canonique en départage, visibilité+colonnage
        préservés. Pur, idempotent. Bouton « Agencement optimal » dans /settings → controls.apply.
        Vérifié live : « Centre de risque » remonte avec les KPI, monitoring repoussé en bas.
        475 tests verts, lint + build verts.
P2.1 [x] livré 2026-05-30 `63f00ea` — calculateur what-if pur (src/utils/simulationCalculator.js
        + 10 tests). simulateInvestment(points, {amount, startDate}) : parts à l'entrée, valeur
        finale, rendement total, CAGR, courbe de croissance, depuis l'historique factuel. Pur,
        déterministe (dates issues de la série, pas de Date.now). Gère week-ends/fériés, série non
        triée, montants/série invalides, pertes.
P2.3 [x] livré 2026-05-30 `cfb5ebf` — SimulationPanel (feature surface asset, registre + 4 tests).
        Formulaire montant + date → fetch /api/history → simulateInvestment → KPIs + courbe Recharts
        + détail d'entrée, sous BANDEAU permanent « pas un conseil, pas une prédiction ». Enregistré
        au registre → monté automatiquement par le pipeline de layout (réconciliation P0.2 l'ajoute
        aux layouts existants sans migration). Vérifié live sur MSFT (données Twelve Data réelles ;
        free tier ~18 mois → date de départ antérieure aux données = entrée gracieuse au 1er point
        dispo, étiqueté honnêtement). 489 tests verts.
P2.2 [x] livré 2026-05-30 — portefeuille de démo multi-positions vs benchmark. CLÔT LA PHASE 2.
          P2.2a `38afd57` — agrégation pure (src/utils/portfolioSimulation.js + 9 tests) :
                 aggregateCurves (somme N courbes sur axe de dates commun, report avant), 
                 simulateDemoPortfolio (× simulateInvestment par position + KPIs + courbe),
                 excessReturnPct. Aligne des séries de longueurs/dates différentes.
          P2.2b `1838917` — route /demo + DemoPortfolioPanel : formulaire multi-positions, fetch
                 résilient, double courbe Portefeuille vs benchmark (SPY), tableau par position,
                 bandeau hypothèse. Vérifié live : AAPL+MSFT 10k chacun depuis 2021 → 22,6k$ (+13%),
                 −12,2 pts vs SPY. 502 tests verts.
```

> **🏁 PHASE 2 COMPLÈTE (2026-05-30) — MVP « studio composable démontrable » atteint.** Les Phases 0→2 (noyau personnalisable + agencement déterministe + simulateur de démo) constituent le premier jalon vendable de la roadmap. L'app se compose, s'auto-agence et démontre sa valeur sur données factuelles. 502 tests verts. **Poussé sur `origin/main` (`8c36c4d`).**

```
P3.1 [x] livré 2026-05-30 `8c0cd25` — migrations SQLite versionnées (server/migrate.js +
        server/migrations/001_initial_schema.sql + 8 tests). schema_migrations + application
        transactionnelle des migrations en attente, idempotent. portfolioRepository exécute
        runMigrations(db) au lieu du CREATE TABLE inline. SQLite reste dev-only. 510 tests verts.
P3.2 [~] livré 2026-05-30 (client-first, prod-correct) — multi-portefeuilles (mandats).
          `e78f47e` P3.2a : portfolioListStore (mandats {id,name,client,baseCurrency,openedAt} +
                 actif, localStorage fis:portfolios:v1, mutateurs purs) + positions scopées par
                 mandat dans portfolioStore (clé namespacée, default=clé legacy). 12 tests.
          `aa424ba` P3.2b : PortfolioSelector (header : switch/créer/renommer/supprimer) + App
                 scope les positions par mandat actif, recharge au switch. Vérifié live : mandat
                 « Client Test » isolé, retour principal repeuplé (re-hydrate SQLite en dev).
          RESTE P3.2c (parité dev SQLite : migration 002 colonnes mandat + repo CRUD + API
                 /api/portfolios scopé) — dev-only, le multi-portefeuilles fonctionne déjà en
                 prod via localStorage. 526 tests verts.
P3.3 [x] livré 2026-05-30 — moteur de lots `1b8eab0` (src/utils/lotEngine.js : applyTransactions
          FIFO/LIFO → lots ouverts + P&L réalisé ; frais, dividendes, survente ; summarize, 9 tests)
          + P3.3b stockage transactions + journal UI `e7f6806` + parité serveur `9cb22ec`.
```

> **🏁 PHASE 3 CLÔTURÉE (2026-05-30).** P3.1 migrations, P3.2(+c) multi-portefeuilles + parité dev,
> P3.3 transactions/lots + journal, P3.4 multi-devises + FX. Socle de données PM en place. 593 tests,
> poussé sur `origin/main` (`b146c8d`). Détail des sous-blocs dans `REPRISE_CHECKPOINT.md`.

```
P4.1 [x] livré 2026-05-30 — rendements standards (première feature analytique Phase 4).
        src/utils/returnsCalculator.js (pur, 9 tests) : computeReturns → rendement cumulé, CAGR,
        matrice par période (1M/3M/6M/YTD/1Y/3Y/origine, null si hors-données), rendements mensuels.
        src/utils/returnsFormatters.js (5 tests). src/components/ReturnsMatrixPanel.jsx (4 tests,
        surface actif, registre catégorie `performance` priorité 15 dans layoutEngine). Dérivé de
        l'historique factuel /api/history (days=1825 → ~18 mois quotidien free tier) — pas de nouvelle
        source serveur (même voie que SimulationPanel). Rendements de prix hors dividendes, mention
        affichée ; périodes hors-portée masquées (jamais de 0 inventé). Dogfood curl MSFT : 1M/3M/6M/
        YTD/1Y peuplés, 3Y masqué, 17 rendements mensuels. 593 → 611 tests verts.
P4.12 [x] livré 2026-05-31 — statistiques opérationnelles (1re feature de performance côté dashboard).
        src/utils/operationalStats.js (pur, 12 tests) : computeOperationalStats(transactions, {method}) →
        transactions clôturées, taux de réussite, ratio gain/perte, détention moyenne pondérée par quantité,
        rotation (coût vendu / coût total), rendement sur coût (dividendes / coût ouvert), P&L réalisé,
        dividendes. Branché sur le moteur de lots P3.3a enrichi (lotEngine.closedLots : round-trips datés
        entrée/sortie avec quantité + P&L, +5 tests). src/utils/operationalStatsFormatters.js (formatCount/
        formatDays/formatMultiple, 9 tests). src/components/OperationalStatsPanel.jsx (surface dashboard,
        registre catégorie `portfolio` order 90, 4 tests). returnsFormatters.formatPct gagne {signed:false}
        pour les grandeurs non signées (rétro-compat). Dérivé des transactions saisies SEULEMENT — zéro API,
        zéro snapshot. Factualité : mandat vide = état vide honnête, mesures de clôture masquées (—) tant
        qu'aucune vente (jamais un 0), survente signalée en ambre. Dogfood (3 round-trips multi-symboles) :
        hit ratio 66.67 %, win/loss 3.05×, détention 294.8 j, rotation 81.55 %, yield-on-cost 0.92 %.
        624 → 647 tests verts.
P4.10 [x] livré 2026-05-30 — distribution des returns (feature catalogue distincte de P4.1).
        src/utils/returnsDistribution.js (pur, 7 tests) : computeDistribution(monthlyReturns) → %
        mois positifs, meilleur/pire mois, moyenne, écart-type échantillon, skewness g1, kurtosis
        excess g2 (null si σ=0 ou n<3), histogramme 8 tranches (somme = nb mois). returnsFormatters
        + formatRatio (2 tests). src/components/ReturnsDistributionPanel.jsx (4 tests, surface actif,
        registre `performance` order 110, histogramme Recharts emerald/rose). Dérivé des rendements
        mensuels de returnsCalculator — même série /api/history, zéro nouveau fichier serveur.
        Panel SÉPARÉ de la matrice (activable/positionnable indépendamment = modularité). Dogfood
        curl NVDA réel : 17 mois, 64.7 % positifs, best +24.06 (2025-05) / worst −13.24 (2025-03),
        skew 0.094 / kurtosis −0.647, histogramme somme = 17. 611 → 624 tests verts.
```

> **NB données** : le « 100 000 $ en 2017 » de la vision nécessite un historique long (plan Twelve Data payant). En free tier (~18 mois), le simulateur fonctionne mais entre au plus ancien point disponible — jamais de valeur inventée. Idem pour la matrice de rendements P4.1 : la période 3 ans (et au-delà) est masquée tant que la source gratuite ne remonte pas si loin.

### Améliorations terminal hors track P0.x (livrées 2026-05-29, sécurisées post-panne)

```
[x] `d736d24` — Score Buffett dans le portefeuille. services/buffettReadiness.js calcule par
        actif valeur intrinsèque + marge de sécurité + score /6 + signal BUY/SELL depuis les
        fondamentaux Finnhub ; AssetTable gagne une colonne "Buffett" triable, App fetch les
        résumés (AbortSignal) et les propage à AssetTable/TopPerformers/SearchFilter.
[x] `208aafe` — Dividendes multi-provider. server/dividends.js cascade Finnhub -> Alpha Vantage
        -> Twelve Data (firstSuccessfulProvider), provenance taguée, payload "unavailable" caché
        si tout échoue ; liveQuotes source "mock" -> "unavailable".
```

## Prochain bloc recommandé

**P4.1 ✅ + P4.10 ✅ + P4.12 ✅** (Phase 4 hors-snapshots) **+ P5.1 ✅** (journal d'investissement) livrés. La suite Phase 4 (P4.2 TWR, P4.3 MWR/IRR, P4.4 vol/drawdown, P4.5 Sharpe) **exige l'accrual de snapshots** (cf. pré-requis ci-dessous). Deux candidats pour le prochain bloc :
- **Accrual de snapshots SQLite** (brique socle qui débloque P4.2→P4.5) : capture quotidienne de la valeur du mandat dans la table `snapshots` (présente, non peuplée). C'est le seul chemin factuel vers le factsheet portefeuille — sans série de valeur réelle, pas de TWR/vol/Sharpe.
- **Une autre feature de catalogue dérivable sans snapshots** alignée modularité : Phase 5 watchlists thématiques P5.4 (S, mais mute la watchlist existante), contraintes/compliance P5.2 (M), ou une feature dashboard dérivée des positions/transactions existantes.

> **🔓 Pré-requis snapshots LEVÉ (accrual journalier livré 2026-05-31).** L'accrual de snapshots est posé : migration `005` (un point par mandat par jour, index unique + upsert + collapse des lignes intraday), capture client throttlée à un POST/mandat/jour. La table `portfolio_snapshots` accumule désormais une **série de valeur journalière factuelle** (positions × cotations réelles, jamais de backfill). **P4.2 (TWR GIPS), P4.3 (MWR/IRR), P4.4 (vol/drawdown portefeuille), P4.5 (Sharpe) sont donc DÉBLOQUÉS** — chacun = un panel dashboard dérivé de `listSnapshots`. Factualité maintenue : ne calculer que sur les jours réellement accumulés, masquer les fenêtres longues tant que la série ne remonte pas si loin.

> **P1.2 (suggestion IA d'agencement) — GELÉ (décision 2026-05-30)**, optionnel. La prise est prête (un suggéreur IA = frère de `optimizeLayout`, validé contre le registre, puis `apply()`). À rouvrir seulement si le déterministe P1.1 s'avère insuffisant à l'usage.

Séquence : 🏁 **Phases 0→3 complètes** · Phase 1 P1.2 IA **gelé** · En cours : **Phase 4 — features hors-snapshots livrées (P4.1 returns ✅ + P4.10 distribution ✅ + P4.12 stats op. ✅)** · **Phase 5 en cours (P5.1 journal d'investissement ✅ + P5.8 concentration & diversification ✅ + P5.9 drawdown actif ✅)** → prochain socle = accrual de snapshots, qui débloque P4.2 TWR / P4.3 MWR / P4.4 vol / P4.5 Sharpe.

## Mise à jour de ce document

À chaque module livré :
1. Cocher dans `PLATFORM_CHECKLIST.md` (source de vérité granulaire).
2. Marquer le module ici avec `[x]` + date de livraison + commit SHA court.
3. Mettre à jour `REPRISE_CHECKPOINT.md` avec les candidats du prochain bloc.

Format de tracking par module (suffixe quand livré) :

```
P0.1 [x] livré 2026-MM-DD `abc1234` — registre de features
```
