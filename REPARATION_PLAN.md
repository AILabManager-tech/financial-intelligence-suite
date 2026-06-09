# Plan de réparation — Financial Intelligence Suite

> Audit du 2026-06-08, validé en local **et** en production (devlabai.tech).
> Source : 3 sondes API live (dev + prod) + lecture de code panel par panel.
> Objectif : réparer ce qui « ne répond pas comme souhaité ». Mise à jour du statut au fil de l'eau.

## Méthode

- **Local d'abord.** Tout le code se répare et se valide en local (`npm run lint && npm test && npm run build`, qui tournent hors-réseau). Un commit cohérent par bloc, message EN + `Co-Authored-By` Claude.
- **Déploiement = décision explicite.** `vercel --prod` reste un hard-stop : jamais en autonome.
- **TDD strict.** Test rouge → implémentation → vert, pour chaque bloc.
- **Factualité intangible.** Aucune correction n'introduit de `0`/`n/d` fabriqué : un champ sans donnée est masqué ou étiqueté « indisponible », jamais comblé par une valeur inventée.
- **Palette FIS gelée.** Travail structurel uniquement, zéro nouvelle couleur en dur.

## Classement des pannes

Deux familles distinctes :

1. **Bugs de code** — corrigeables, gratuits, hors-réseau, testables. → Vagues 1 & 2.
2. **Limites de données / config** — tiennent au free tier (Finnhub US-only, twelvedata `/dividends` plan-gaté) ou à une clé d'environnement. → Vague 3 + décision business.

---

## VAGUE 1 — Quick wins gratuits (100 % local, faible risque)

| # | Panne | Cause (fichier) | Fix retenu | Statut |
|---|-------|-----------------|------------|--------|
| 6 | **Crash de toute la fiche actif via Peers** | `src/utils/peersFormatters.js:33-45` : `price` non défaulté ; rendu `row.price.toFixed(2)` ([PeersComparisonPanel.jsx:167](src/components/PeersComparisonPanel.jsx#L167)) sur `null` → throw. Aucun error boundary par panel ([LayoutSurface.jsx:32](src/components/LayoutSurface.jsx#L32)). | (a) Si `price` non-fini → ligne `status:'missing'` (« Cotation indisponible »), **pas** `price ?? 0` (un « $0.00 » serait une fabrication). (b) `PanelErrorBoundary` générique (calqué sur `ChartErrorBoundary`) appliqué à chaque panel dans `LayoutSurface` → un throw n'abat que son panel. | ✅ fait (+5 tests) |
| 7 | **WithholdingTax ment sur la cause** | `src/components/WithholdingTaxPanel.jsx:70-89` ignore `status:"unavailable"` → affiche « Aucun dividende US déclaré » alors que c'est un refus d'accès fournisseur. | Lire `status`/`reason` du payload dividendes ; distinguer « accès données refusé » de « aucun dividende ». Vraie entorse factualité. | ✅ fait (+1 test) |
| 2 | **Quotes `.TO` impossibles** | `api/_handlers/quotes.js:11-13` + `vite.config.js:92-94` : `toStooqSymbol` colle `.us` à tout ticker → un `.TO` devient un faux symbole US. Stooq aussi down (404). | Extrait dans `server/stooqSymbol.js` (partagé dev+prod, dédupliqué) : retourne `null` pour tout suffixe d'échange non-US → le fallback est sauté et l'erreur est honnête (« non couvert par la source gratuite »). BRK.B reste US. | ✅ fait (+5 tests, dogfood live) |
| 10 | **Jargon EN dans erreurs FR** | Tous les services : `throw "<feature> unavailable (502)"`. Sur tout `.TO`, l'utilisateur voit un mélange FR + code HTTP EN. | Messages d'erreur FR sans code HTTP brut côté UI (garder le code en log/console). | ⏳ |
| 11 | **`MarketPulse.jsx` = code mort** | Composant non importé, non registré, shape mock sans guards. | Supprimer (ou recâbler sur le vrai service macro `indicators[]`). Décision : supprimer. | ⏳ |

## VAGUE 2 — Snapshots en localStorage (gros morceau gratuit, meilleur ROI)

| # | Panne | Cause | Fix retenu | Statut |
|---|-------|-------|------------|--------|
| 1 | **9 panels Perf/Risque morts pour le vrai utilisateur** | Snapshots = SQLite dev-only. `savePortfolioSnapshot`/`fetchPortfolioSnapshots` sont **no-op en prod** ([portfolioSnapshots.js:12,27](src/services/portfolioSnapshots.js#L12), [devBackend.js:7](src/services/devBackend.js#L7)). localStorage ne stocke que les positions. Prouvé en prod : `/api/portfolio/snapshots` → 404. | Persister la série journalière **côté client en localStorage**, namespacée par mandat (idiome `portfolioListStore`/`watchlistListStore`), un point/jour idempotent. Débloque TWR, MWR, risque, ratios, VaR, benchmark, beta. **Zéro backfill** (factualité) : un nouvel utilisateur se remplit à partir d'aujourd'hui — étiqueté. | ⏳ |
| 8 | **Fan-out history dépasse le quota twelvedata (pire en prod)** | `CorrelationMatrixPanel.jsx:87` lance jusqu'à 10 `/api/history` simultanés. Le handler prod `api/_handlers/history.js` n'a **pas** de mémo-cache (le dev en a un 6h → masque le bug). | Ajouter un mémo-cache local au handler prod `history.js` (idiome des autres handlers prod). Optionnel : sérialiser/limiter la concurrence du fan-out côté panel. | ⏳ |

## VAGUE 3 — Config environnement + déploiement (réseau, décision utilisateur)

| # | Panne | Cause | Action | Statut |
|---|-------|-------|--------|--------|
| 5 | **Macro entièrement morte** | Pas de `FRED_API_KEY` (dev **et** prod confirmés : `unavailable`). | Obtenir une clé FRED **gratuite** + l'ajouter à l'env Vercel Production (et `.env` local). Ranime les 6 séries macro. Fort levier, coût nul. | ⏳ |
| 9 | **Panel Santé des données 404 en prod** | Route `/api/health/market-data` seulement dans le middleware dev, absente du router prod ([router.js](api/_handlers/router.js)). Prouvé : 404 NOT_FOUND en prod. | Soit porter la route dans le router prod (`_handlers/`), soit retirer le panel du registre en prod. Décision à prendre. | ⏳ |

## DÉCISION BUSINESS (à trancher au moment des panels concernés)

| # | Panne | Enjeu | Options |
|---|-------|-------|---------|
| 3 | **Dividendes vides** (KO/PEP/MSFT/VOO… → `provider_access_denied`) | twelvedata `/dividends` plan-gaté (403). Confirmé en prod. | (a) **Payer** un plan supérieur (twelvedata ou autre source dividendes). (b) **Rester gratuit** et étiqueter « dividendes indisponibles sur cette clé ». |
| 4 | **Titres canadiens = mur d'erreurs** (RY.TO : fundamentals/earnings/ratings/peers/history tous KO) | Finnhub free = US seulement. Confirmé en prod. | (a) **Payer** une source couvrant TSX. (b) **Assumer US-only** : masquer/étiqueter proprement les panels non couverts pour les `.TO` (cf. `CanadianListingPanel` déjà honnête). |
| 12 | **Démos CAD creuses** (Sophie/Julien) | Conséquence de #2/#3/#4. | Dépend de #4. Sinon : recentrer les profils démo sur des titres US pour une première impression pleine. |
| 13 | **ETF quasi vides** (VOO : `beta` seul, Buffett impossible) | Finnhub ne publie pas de fondamentaux ETF. | Dégrade déjà proprement. Option : panel ETF dédié (composition/frais) si source dispo. |

---

## Ordre d'exécution

1. **Vague 1** (#6 → #7 → #2 → #10 → #11), un commit par bloc, tout vert.
2. **Vague 2** (#1 snapshots localStorage, puis #8 cache prod).
3. Push (après avertissement).
4. **Vague 3** : config env Vercel (#5 FRED, #9 route santé), puis `vercel --prod` (décision utilisateur).
5. Décisions business #3/#4 tranchées à leur tour.

## Validation par bloc

`export PATH="$HOME/.nvm/versions/node/v24.14.1/bin:$PATH" && npm run lint && npm test && npm run build` → 3 verts avant chaque commit.
