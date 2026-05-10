# Reprise checkpoint — Financial Intelligence Suite

Mot magique: `FIS-REPRISE-FD01815`

## Instruction pour nouvelle session

Quand l'utilisateur tape `FIS-REPRISE-FD01815`, commencer par lire ce fichier, puis continuer le développement dans:

`/home/gear-code/02_projects/financial-intelligence-suite`

Ne modifier aucun fichier hors de ce dossier.

## Etat git

Checkpoint local principal:

`fd01815 feat: import broker CSV files into the portfolio`

Branche: `main`. Aucun push à faire sans demande explicite.

## Modules ajoutés depuis le checkpoint précédent (1f884eb)

5 commits feature livrés sur `main`:

- `4b49340` — Alertes configurables (prix ≥/≤, variation % ≥/≤, drift) persistées localement, déclenchées sur tick.
- `da8d4ed` — Sélecteur de période 1D/5D/1M/6M/YTD/1Y/5Y sur la fiche actif (intraday/daily/weekly via Twelve Data).
- `a357a94` — Historique des 20 dernières recherches (déduplication, replay, suppression).
- `305e376` — Filtre pays/exchange + désambiguïsation multi-marché sur la recherche.
- `fd01815` — Import CSV broker (parser RFC 4180, détection EN/FR, preview ligne par ligne).

État tests: 52 → 124 tests verts. Lint et build verts.

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
- `npm test` OK, 124 tests
- `npm run build` OK

## Serveur local

URL locale:

`http://127.0.0.1:20000/`

Verifier si le serveur tourne:

`pgrep -a -f "vite --host 127.0.0.1 --port 20000"`

## Prochaine priorité — Données fondamentales sourcées

Section §5 de `PLATFORM_CHECKLIST.md`. C'est le seul gros bloc encore à `[ ]` parmi les priorités du REPRISE.

### Champs cibles V1

Ne livrer que des champs vraiment factuels et présents dans la source. Si un champ est absent, le masquer (pas de placeholder, pas de mock).

| Champ | Source primaire | Endpoint Finnhub |
|---|---|---|
| `marketCap` (USD) | Finnhub | `/stock/profile2` (`marketCapitalization`) |
| `peRatio` (TTM) | Finnhub | `/stock/metric?metric=all` (`peTTM`) |
| `epsTtm` (USD) | Finnhub | `/stock/metric` (`epsTTM`) |
| `revenueTtm` (USD) | Finnhub | `/stock/metric` (`revenuePerShareTTM` × shares) |
| `grossMargin` (%) | Finnhub | `/stock/metric` (`grossMarginTTM`) |
| `operatingMargin` (%) | Finnhub | `/stock/metric` (`operatingMarginTTM`) |
| `netMargin` (%) | Finnhub | `/stock/metric` (`netProfitMarginTTM`) |
| `dividendYield` (%) | Finnhub | `/stock/metric` (`dividendYieldIndicatedAnnual`) |
| `beta` | Finnhub | `/stock/metric` (`beta`) |
| `country` / `industry` | Finnhub | `/stock/profile2` |

### Architecture proposée

1. **`api/fundamentals.js`** — nouveau handler Vercel avec cache TTL 6h en mémoire. Source primaire Finnhub. Si 403/empty → fallback Twelve Data `/statistics` + `/profile`. Renvoyer chaque champ comme `{ value, source, asOf }` pour audit de provenance par champ.

2. **`src/services/fundamentals.js`** — fetcher + normaliseur côté client. Tests sur mock fetch.

3. **`src/utils/fundamentalsNormalizer.js`** — normaliseur pur Finnhub metric payload → champs typés. Tests.

4. **`src/components/FundamentalsPanel.jsx`** — grille de KPIs sous le graphique de la fiche actif. Chaque KPI affiche `value`, `source` (en chip ou hover), `asOf`.

5. **`api/health/market-data.js`** — étendre le healthcheck pour vérifier `/stock/metric` et `/stock/profile2`.

### Plan d'exécution recommandé (TDD)

```
Tâche 1 — Normaliseur fundamentals (pur, testé)
Tâche 2 — Endpoint /api/fundamentals (cache TTL + provenance)
Tâche 3 — Service client + tests
Tâche 4 — UI FundamentalsPanel (grille KPIs + audit provenance)
Tâche 5 — Healthcheck étendu
Tâche 6 — Validation lint/test/build + checklist
```

### Sources documentaires

- Finnhub `/stock/metric` : <https://finnhub.io/docs/api/company-basic-financials>
- Finnhub `/stock/profile2` : <https://finnhub.io/docs/api/company-profile2>
- Twelve Data `/statistics` : <https://twelvedata.com/docs#statistics>
- Twelve Data `/profile` : <https://twelvedata.com/docs#profile>

### Pièges connus à éviter

- **Plan Finnhub free** : `/stock/metric` accepte les US stocks. Pour les non-US, fallback Twelve Data nécessaire.
- **Unités** : Finnhub renvoie `marketCapitalization` en millions USD. Twelve Data renvoie en USD bruts. Normaliser en USD bruts dans la couche client.
- **Champs absents** : Finnhub peut renvoyer `null` ou un objet partiel. Ne jamais inventer un fallback (ex: revenueTtm calculé). Marquer le champ "Indisponible" plutôt que d'afficher 0.
- **Provenance par champ** : ne pas se contenter d'une source globale. Chaque KPI doit porter sa propre source (un mix Finnhub + Twelve Data possible).
- **TTL cache** : fondamentaux changent peu, TTL 6h+ acceptable. Mais `/api/health/market-data` doit voir l'état réel — pas de cache ou TTL court (60s).

### Marche à suivre exacte (nouvelle session)

```bash
# 1. Reprise
cd /home/gear-code/02_projects/financial-intelligence-suite
# Au prompt Claude Code:
# Tape: FIS-REPRISE-FD01815
# Claude lit ce fichier, puis confirme avant de coder.

# 2. Vérifier l'état
git status --short
git log -1 --oneline   # doit afficher fd01815

# 3. Vérifier les tests / lint / build (avant d'ajouter quoi que ce soit)
npm run lint
npm test
npm run build

# 4. Vérifier les clés API présentes
grep -c "FINNHUB_API_KEY" .env
grep -c "TWELVE_DATA_API_KEY" .env

# 5. Démarrer le dev server (optionnel pour test manuel)
npm run dev -- --host 127.0.0.1 --port 20000

# 6. Demander à Claude de planifier les tâches puis attaquer Tâche 1.
```

### Question à poser à l'utilisateur en début de session

Avant de coder, demander explicitement:

> "On démarre les fondamentaux. V1 stricte (Finnhub seulement) ou V1+fallback Twelve Data dès le départ ?"

Le fallback double le travail mais protège la couverture multi-marché. Recommander V1 stricte si l'utilisateur n'a pas d'avis, et différer le fallback en V2.

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
