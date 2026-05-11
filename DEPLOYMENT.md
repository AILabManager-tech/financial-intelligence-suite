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

---

# Annexe : déploiement hybride Hostinger VPS + Vercel pour devlabai.tech

Cible : `devlabai.tech` servi depuis un VPS Hostinger (Node.js capable), avec les 10 handlers `api/*` hébergés en parallèle sur Vercel. Le VPS sert le bundle React statique (`dist/`) via nginx et reverse-proxy tous les appels `/api/*` vers le déploiement Vercel. Le code client n'a pas à connaître l'existence de cette dualité : il appelle des chemins relatifs `/api/...`, nginx fait le routage.

## Architecture

```
                       ┌────────────────────────────────┐
   devlabai.tech ───▶  │  Hostinger VPS (nginx + dist/) │
                       │  ssl, headers, /assets/ cache  │
                       └──────────┬─────────────────────┘
                                  │ /api/*  (HTTP/1.1, proxy_pass)
                                  ▼
                       ┌────────────────────────────────┐
                       │  Vercel project: fis-api-...   │
                       │  10 serverless functions       │
                       │  FINNHUB_API_KEY / TWELVE_DATA │
                       └────────────────────────────────┘
```

Bénéfices :

- Aucune modif du code client. `fetch('/api/peers?symbol=AAPL')` continue à fonctionner en dev (Vite middleware) et en prod (nginx proxy).
- Pas de CORS à configurer côté navigateur.
- Hostinger Git deployment automatise la mise à jour de `dist/` à chaque push.
- Vercel gère le ramp-up des Functions, les logs, les rollbacks.
- Si Vercel tombe, l'app reste visuellement up (juste les panels API en état "indisponible").

Limites :

- 2 endroits où configurer les ENV vars : Vercel dashboard + (rien sur Hostinger côté front).
- `FINNHUB_API_KEY` / `TWELVE_DATA_API_KEY` configurées **côté Vercel uniquement**. Le VPS Hostinger ne voit jamais ces clés.

## Pré-requis

- Domaine `devlabai.tech` pointé sur l'IP du VPS Hostinger (enregistrement A).
- VPS Hostinger Ubuntu 22.04+ avec Node 20+ installé (`node -v` >= 20.0.0).
- `nginx`, `certbot`, `git` installés sur le VPS.
- Accès SSH root (ou sudo) au VPS.
- Compte Vercel + CLI installée localement (`npm i -g vercel`).
- Clés API rotées (les anciennes du commit initial sont compromises — cf. note dans le commit `3c40e43`).

## Étape 1 — Déployer les handlers `api/*` sur Vercel

```bash
# Sur la machine locale (gear-code), depuis le repo:
cd /home/gear-code/02_projects/financial-intelligence-suite

# 1.1 Lier le projet local à un projet Vercel.
vercel link
# Réponses guidées : créer un nouveau projet "fis-api-devlabai" (ou nom de ton choix)

# 1.2 Configurer les ENV vars dans le dashboard Vercel
# (Production + Preview + Development):
#   FINNHUB_API_KEY = <ta clé Finnhub rotée>
#   TWELVE_DATA_API_KEY = <ta clé Twelve Data rotée>
#
# Tu peux aussi pull les vars depuis le dashboard:
vercel env pull .env.production.local

# 1.3 Premier deploy preview (URL temporaire pour validation):
vercel
# → te donne une URL https://fis-api-devlabai-<hash>.vercel.app

# 1.4 Tester un handler manuellement:
curl "https://fis-api-devlabai-<hash>.vercel.app/api/peers?symbol=AAPL"
# Doit renvoyer un JSON avec peers: [...].

# 1.5 Promotion en production:
vercel --prod
# → te donne l'URL stable https://fis-api-devlabai.vercel.app
```

**Hard-stop** : Claude Code n'exécute pas ces commandes. C'est toi qui les lances.

Note ce host Vercel — il va dans la config nginx ci-dessous.

## Étape 2 — Configurer le VPS Hostinger

Connexion SSH au VPS :

```bash
ssh root@<ton-ip-vps-hostinger>
```

Les étapes suivantes se déroulent sur le VPS.

### 2.1 — Cloner le repo

```bash
# Choisir un chemin standard:
sudo mkdir -p /var/www
cd /var/www
sudo git clone https://github.com/AILabManager-tech/financial-intelligence-suite.git
cd financial-intelligence-suite

# Adjuster les droits pour que le user de déploiement puisse écrire:
sudo chown -R $USER:$USER /var/www/financial-intelligence-suite
```

### 2.2 — Installer Node 20 si pas déjà présent

```bash
# Méthode officielle NodeSource (Ubuntu/Debian):
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Vérifier:
node -v   # v20.x.x
npm -v    # 10.x ou plus
```

### 2.3 — Premier build

```bash
cd /var/www/financial-intelligence-suite
bash hostinger/post-deploy.sh
# → npm ci + npm run build, dist/ généré
```

### 2.4 — Configurer nginx

```bash
# Copier le template fourni dans le repo:
sudo cp /var/www/financial-intelligence-suite/hostinger/nginx-fis.conf \
        /etc/nginx/sites-available/devlabai.tech

# ÉDITER pour remplacer FIS_API_VERCEL_HOST par l'host Vercel obtenu à l'étape 1.5:
sudo nano /etc/nginx/sites-available/devlabai.tech
# Remplacer:  server FIS_API_VERCEL_HOST:443;
# Par:        server fis-api-devlabai.vercel.app:443;

# Activer le site:
sudo ln -s /etc/nginx/sites-available/devlabai.tech /etc/nginx/sites-enabled/

# Tester la config et recharger:
sudo nginx -t
sudo systemctl reload nginx
```

### 2.5 — Émettre le certificat SSL Let's Encrypt

```bash
# Pré-requis : le DNS de devlabai.tech doit pointer sur le VPS (A record).
sudo certbot --nginx -d devlabai.tech -d www.devlabai.tech

# Certbot édite automatiquement la config nginx pour ajouter le listen 443 + ssl_certificate.
# Si la config du repo (nginx-fis.conf) référence déjà les chemins
# /etc/letsencrypt/live/devlabai.tech/{fullchain,privkey}.pem, certbot va simplement
# les générer sans toucher la config.

# Vérifier le renouvellement auto:
sudo certbot renew --dry-run
```

### 2.6 — Premier smoke test

Depuis ta machine locale :

```bash
curl -I https://devlabai.tech/
# Doit renvoyer 200 + headers de sécurité (X-Frame-Options: DENY, etc.)

curl "https://devlabai.tech/api/peers?symbol=AAPL"
# Doit renvoyer le même JSON que l'étape 1.4 — c'est le proxy vers Vercel qui fait le boulot.

# Ouvrir https://devlabai.tech dans un navigateur, vérifier:
# - L'app charge sans erreur console
# - Ouvrir AAPL: la fiche actif s'ouvre, tous les panels (Fundamentals, News, etc.) passent à "ready"
```

## Étape 3 — Automatiser via Hostinger Git deployment

L'objectif est qu'à chaque `git push origin main`, le VPS pull et rebuild automatiquement.

### Option A — Hostinger Git deployment intégré (hpanel.hostinger.com)

1. Aller sur `https://hpanel.hostinger.com/`
2. Menu : **Hosting** → ton VPS devlabai.tech
3. **Files** → **Git** (ou **Auto-Deploy**, selon l'interface)
4. **Add new repository** :
   - URL : `https://github.com/AILabManager-tech/financial-intelligence-suite.git`
   - Branch : `main`
   - Deploy path : `/var/www/financial-intelligence-suite`
   - Run command after deploy : `bash hostinger/post-deploy.sh`
5. **Save** → le panel Hostinger configure un webhook GitHub côté backend
6. Tester : pousser un commit dummy, vérifier dans hpanel logs que le pull + run a bien tourné

### Option B — Webhook GitHub manuel (si hpanel Git deployment indisponible)

1. Sur le VPS, créer un petit endpoint HTTP qui exécute `bash hostinger/post-deploy.sh` à chaque webhook :

   ```bash
   # /var/www/fis-deploy-hook.service (systemd)
   sudo nano /etc/systemd/system/fis-deploy-hook.service
   ```

   Contenu :
   ```
   [Unit]
   Description=FIS deploy hook listener
   After=network.target

   [Service]
   ExecStart=/usr/bin/node /var/www/financial-intelligence-suite/hostinger/webhook-listener.js
   WorkingDirectory=/var/www/financial-intelligence-suite
   User=www-data
   Restart=always

   [Install]
   WantedBy=multi-user.target
   ```

   Le `webhook-listener.js` n'est pas fourni dans le repo — l'écrire au besoin (express + verify HMAC du secret GitHub + spawn `bash hostinger/post-deploy.sh`).

2. Configurer le webhook GitHub : Settings → Webhooks → Add, URL `https://devlabai.tech/__deploy`, content type JSON, secret partagé, événement "push".

3. Ajouter une location nginx qui route `/__deploy` vers le listener systemd.

**Recommandation** : tenter Option A d'abord (zero code à écrire). N'aller sur Option B que si hpanel ne propose pas de Git deployment sur ton plan.

## Checklist post-deploy

- [ ] `https://devlabai.tech/` charge sans erreur console (DevTools).
- [ ] La recherche d'un symbole (ex: AAPL) renvoie des résultats.
- [ ] L'ouverture de la fiche AAPL fait passer tous les panels à l'état "ready" (Fundamentals, Buffett, Analyst Ratings, Earnings, Dividends, News, SEC Filings, Peers).
- [ ] L'ajout d'un titre au portfolio persiste après reload (localStorage côté client).
- [ ] La CI GitHub passe au vert sur le dernier push (`https://github.com/AILabManager-tech/financial-intelligence-suite/actions`).
- [ ] Logs nginx propres : `sudo tail -f /var/log/nginx/access.log /var/log/nginx/error.log`.
- [ ] Aucune fuite de clé API dans le HTML servi (`curl https://devlabai.tech/ | grep -i finnhub` doit renvoyer vide).

## Rollback

Côté Vercel :
```bash
vercel rollback
```

Côté VPS Hostinger :
```bash
cd /var/www/financial-intelligence-suite
git log --oneline -10
git checkout <commit_hash_précédent>
bash hostinger/post-deploy.sh
# Pour rendre permanent: git reset --hard <commit_hash_précédent> (destructif, à confirmer)
```

## Coûts estimés

- VPS Hostinger : selon plan (généralement 5-10 €/mois pour KVM 1-2 GB RAM, largement suffisant pour ce front statique + nginx).
- Vercel Hobby : gratuit, 100 GB-hours/mois sur les Functions.
- Domaine devlabai.tech : déjà acquis (assumé).
- TLS Let's Encrypt : gratuit (renouvellement auto via certbot timer).

## Maintenance régulière

- Renouvellement Let's Encrypt : auto via `systemctl status certbot.timer`.
- Mise à jour deps : `npm outdated` puis `npm update` + commit + push (déclenche redeploy).
- Rotation clés API : tous les 6 mois conseillé. Mettre à jour dans Vercel dashboard, **pas** sur le VPS.
