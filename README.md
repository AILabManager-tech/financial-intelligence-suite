# Financial Intelligence Suite

Tableau de bord factuel d'analyse de portefeuille et de fiches actifs : quotes live, historique de prix, fondamentaux, dépôts SEC, comparaison sectorielle, calendrier earnings, dividendes, news société, recommandations analystes et analyse Buffett DCF — toutes les données sourcées en direct depuis Finnhub et Twelve Data, jamais de mock visible, provenance par champ.

> Pour les conventions de développement (factualité stricte, pattern modulaire feature × couche, hard-stops, port local 20000), voir [`CLAUDE.md`](CLAUDE.md). Pour l'état d'avancement de la plateforme, voir [`PLATFORM_CHECKLIST.md`](PLATFORM_CHECKLIST.md). Pour la reprise de session, voir [`REPRISE_CHECKPOINT.md`](REPRISE_CHECKPOINT.md).

## Stack

| Couche | Technologie |
|---|---|
| Framework UI | React 19 + Vite 7 |
| Styles | Tailwind CSS 4 (CSS-vars + thèmes opt-in `:root[data-theme]`) |
| Graphiques | Recharts |
| Icônes | Lucide React |
| Math (Buffett) | KaTeX |
| Tests | Vitest 4 + @testing-library/react (jsdom) |
| Lint | ESLint 9 (flat config) |
| Persistance locale | better-sqlite3 (dev) / `localStorage` (client) |

Sources externes : Finnhub (primaire — quotes, fundamentals, news, earnings, dividends, analyst ratings, SEC filings, peers), Twelve Data (historique de prix), Stooq (fallback quotes).

## Variables d'environnement

Copier `.env.example` vers `.env` et remplir avec tes propres clés. Le fichier `.env` est gitignored.

| Variable | Usage | Endpoints concernés |
|---|---|---|
| `FINNHUB_API_KEY` | Clé Finnhub (free tier suffisant pour le dev) | `/api/quotes`, `/api/search`, `/api/fundamentals`, `/api/company-news`, `/api/earnings`, `/api/dividends`, `/api/analyst-ratings`, `/api/sec-filings`, `/api/peers` |
| `TWELVE_DATA_API_KEY` | Clé Twelve Data | `/api/history` (intraday + daily + weekly) |

Les valeurs présentes dans `.env.example` sont des placeholders factices : récupère tes propres clés sur [finnhub.io/dashboard](https://finnhub.io/dashboard) et [twelvedata.com/account](https://twelvedata.com/account).

## Démarrage local

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 20000
# http://127.0.0.1:20000
```

Le port 20000 est la convention du projet (voir `CLAUDE.md` § port local). Vérifier qu'il n'est pas occupé : `lsof -i :20000`.

## Validation avant commit

Le contrat CLAUDE.md exige les trois verts :

```bash
npm run lint
npm test
npm run build
```

Suite de tests : ~370 cas, ~1.4 s. Coverage par couche (domain server, handlers, services client, formatters, composants UI).

## Architecture

Modularité **feature × couche** : ajouter une nouvelle source de données ⇒ ~7 fichiers neufs, zéro modif des features existantes. Voir tableau dans `CLAUDE.md`. Orchestrateurs centraux modifiés à chaque feature : `vite.config.js` (handler dev + cache TTL), `src/components/IntelligenceCard.jsx` (empile le panel sous la fiche actif), parfois `src/App.jsx` (header / route).

```
server/<feature>.js                # fetch + normalisation, fetcher injectable
server/<feature>.test.js
api/<feature>.js                   # handler Vercel self-contained (cache mémoire local)
vite.config.js                     # middleware /api/<feature> + readThroughCache TTL
src/services/<feature>.js          # client fetch /api/<feature>, AbortSignal
src/services/<feature>.test.js
src/utils/<feature>Formatters.js   # purs, par champ, retournent null si invalide
src/utils/<feature>Formatters.test.js
src/components/<Feature>Panel.jsx  # empilé dans IntelligenceCard
```

## Sécurité

- Clés API utilisées uniquement côté serveur/proxy (jamais bundlées dans le client).
- `.env` jamais committé (cf. `.gitignore`). Si tu suspectes une clé compromise, **révoque et régénère immédiatement** chez le fournisseur — purger l'historique git ne suffit pas dès que des forks/caches existent.
- Tests automatiques de non-leak du token dans tous les modules domain serveur (`expect(error.message).not.toContain('super-secret-token')`).
- Validation stricte des inputs côté API (`symbol` uppercase + trim, `limit` clampé, `period` whitelist).

## Déploiement

Build production prêt (`npm run build` → `dist/`), handlers Vercel-compatibles dans `api/` (chacun avec son propre cache mémoire local). La procédure complète Vercel (config `vercel.json`, gating SQLite si filesystem read-only, configuration des ENV vars dans le dashboard) est planifiée comme prochain bloc — voir `REPRISE_CHECKPOINT.md` § candidats.

## Licence

Propriétaire — Mark Systems © 2026
