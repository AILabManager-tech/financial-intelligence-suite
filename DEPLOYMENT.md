# Déploiement Vercel — Financial Intelligence Suite

> **Hard-stop session Claude Code** : `vercel deploy` / `vercel --prod` ne sont **jamais** exécutés en autonome. L'opérateur déclenche chaque promotion manuellement.

## Vue d'ensemble

| Couche | Responsabilité prod | Mécanisme |
|---|---|---|
| Statique (`dist/`) | Sert l'application React buildée | CDN Vercel |
| Serverless (`api/*.js`) | 10 endpoints proxy Finnhub / Twelve Data / Stooq, chacun self-contained avec un cache mémoire local par invocation | Vercel Functions (Node.js) |
| Persistance portefeuille | Aucune en prod — le SQLite local (`server/portfolioRepository.js`) reste 100% dev (jamais importé par les handlers `api/`) | `localStorage` côté client (`src/services/portfolioStore.js`) |

Conséquence : en prod Vercel, les routes `/api/portfolio` et `/api/portfolio/snapshots` retournent **404**. Le client capture silencieusement (`.catch()` déjà en place dans `src/App.jsx`) et utilise `localStorage` comme source de vérité. Aucun gating SQLite n'est nécessaire — le module n'est tout simplement pas chargé en runtime serverless.

## Pré-requis

- Compte Vercel lié à GitHub (l'auto-deploy à chaque push sur `main` est l'usage standard).
- Clés API rotées (cf. `README.md` § Sécurité). Les anciennes clés du commit initial sont compromises, ne pas les configurer dans le dashboard.
- Branche `main` à jour, `npm run lint && npm test && npm run build` verts.

## Variables d'environnement à configurer

Dans le dashboard Vercel : **Project Settings → Environment Variables**. Ajouter chaque variable pour les trois environnements (Production, Preview, Development) :

| Variable | Valeur | Source |
|---|---|---|
| `FINNHUB_API_KEY` | Clé Finnhub rotée | https://finnhub.io/dashboard |
| `TWELVE_DATA_API_KEY` | Clé Twelve Data rotée | https://twelvedata.com/account |

Note : `ALPHA_VANTAGE_API_KEY` n'est pas consommée en runtime — pas besoin de la configurer.

## Procédure de premier déploiement (CLI)

```bash
# 1. Installer la CLI Vercel
npm i -g vercel

# 2. Lier le projet local au projet Vercel
vercel link

# 3. Synchroniser les ENV vars depuis le dashboard vers .vercel/
vercel env pull .env.production.local

# 4. Tester le build localement avec les ENV de prod
vercel build

# 5. Premier déploiement preview (URL temporaire pour validation)
vercel

# 6. Promotion en production (une fois la preview validée)
vercel --prod
```

## Procédure de redeploy (auto)

Avec l'intégration GitHub Vercel : tout push sur `main` déclenche automatiquement un build + deploy prod. Tout push sur une autre branche déclenche un preview deploy avec une URL `*.vercel.app` partageable.

## Configuration `vercel.json`

Le fichier à la racine du repo configure :

- `framework: "vite"` — preset officiel Vercel pour la détection auto du build.
- `outputDirectory: "dist"` — Vite buildtime output.
- `installCommand: "npm install --omit=optional"` — pas de bindings natifs optionnels (gain de temps de build).
- `functions["api/*.js"]` :
  - `memory: 256` MB (suffit pour les proxies HTTP).
  - `maxDuration: 10` s (les TTL serveur évitent les calls répétés à l'upstream).
  - `includeFiles: "server/**"` — chaque handler `api/<feature>.js` importe son module domaine `server/<feature>.js`, qui doit être bundlé avec la function.
- `headers` :
  - `/api/*` : `Cache-Control: no-store` (chaque handler gère son propre TTL via la mémoire), `X-Content-Type-Options: nosniff`.
  - `/*` : security headers standards (`X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`).
- `ignoreCommand` : skip le build si seuls les dossiers ignorés intentionnels (`root-copy/`, `financial-intelligence-suite/`, `*.pdf`) ont changé entre deux commits.

## Vérifications post-deploy

À faire manuellement après chaque `vercel --prod` :

- [ ] L'URL de production charge sans erreur de console (DevTools).
- [ ] La fiche actif d'AAPL ouvre avec quote live, fundamentals, news, earnings, dividendes, analyst ratings, Buffett, SEC filings, peers — chaque panel passe à l'état "ready" avec source visible.
- [ ] L'ajout/suppression d'un titre depuis l'écran portfolio persiste après reload (via `localStorage`).
- [ ] `/api/health/market-data` n'est **PAS** déployé (handler dev only) — c'est attendu, rien à corriger.
- [ ] Aucune fuite de clé API dans les requêtes inspectées (DevTools Network) : les clés sont seulement dans les query strings côté serveur (Function logs Vercel) et jamais exposées au browser.

## Limites connues

| Limite | Conséquence | Mitigation |
|---|---|---|
| Pas de SQLite en prod | Pas de portefeuille partagé entre utilisateurs / appareils | Utiliser `localStorage` (déjà en place). Pour aller plus loin : Postgres managé (Neon/Supabase). |
| Cache mémoire par invocation Function | Pas partagé entre instances froides | Acceptable pour proxies (le coût d'un miss après cold start est borné par l'upstream Finnhub) |
| Limite de 10 s par Function | Acceptable, les handlers actuels ne dépassent pas ~1 s | Si TimeoutError sur upstream, diminuer la fenêtre fetch côté domaine |
| Pas de rate limiting applicatif | Le quota Finnhub free protège partiellement | Bloc futur §10 (sécurité) |

## Rollback

```bash
vercel rollback           # liste les déploiements et permet de revenir au précédent
```

Aucune migration SQL à rejouer (pas de DB managée actuellement).

## Coûts

- Plan Vercel Hobby (gratuit) : 100 GB-hours/mois pour les Functions, suffisant tant que le trafic reste démo / dev.
- Quotas upstream :
  - Finnhub free : 60 calls/min — très bordé par les TTL serveur (20 s sur quotes, 6 h sur fundamentals/analystRatings, 30 min sur news, 24 h sur dividends/sec-filings/peers).
  - Twelve Data free : 8 calls/min, 800/jour — utilisé uniquement par `/api/history` (cache 6 h, donc usage faible).

## Procédure de bascule en mode `vercel deploy` autonome (futur)

Aujourd'hui : Claude Code n'exécute jamais `vercel deploy`. Pour autoriser un futur agent à le faire (par exemple un job CI), créer un projet de service Vercel dédié + token dans un secret manager + retirer `vercel deploy` de la liste hard-stop dans `~/.claude/CLAUDE.md`. Hors scope de ce bloc.
