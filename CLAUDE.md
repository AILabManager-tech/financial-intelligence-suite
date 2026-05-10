# Financial Intelligence Suite — instructions Claude Code

> Ce fichier est auto-chargé à chaque session ouverte dans ce dossier. Il définit les conventions intangibles du projet. Le `~/.claude/CLAUDE.md` (gear-code global) reste prioritaire pour tout ce qui touche la machine.

## Au démarrage de chaque session

1. Lire `REPRISE_CHECKPOINT.md` (état post-dernière livraison + candidats prochain bloc).
2. Lire la section « Synthèse état actuel » de `PLATFORM_CHECKLIST.md` pour la vue d'ensemble.
3. Si l'utilisateur dit « on continue / continue / poursuis », **choisir SEUL le bloc le plus logique** parmi les candidats listés dans `REPRISE_CHECKPOINT.md` puis l'achever (code + tests + lint + build + docs + commit). Ne JAMAIS poser « axe A vs B vs C ? ». Voir `feedback_no_decision_outsourcing.md` (mémoire projet).

## Principes intangibles

- **Factualité stricte** : zéro mock visible, zéro prédiction présentée comme fait, zéro analyse sans donnée sourcée. Champ absent ⇒ masqué (pas de `0`, pas de `n/d` inventé).
- **Provenance par champ** : chaque KPI / item porte son propre `{value, source, asOf}`. Jamais « source globale » par panel.
- **Modularité par feature × par couche** : voir tableau ci-dessous. Ajouter une nouvelle source de données ⇒ ~7 fichiers neufs, zéro modif des features existantes (sauf orchestrateurs centraux : `vite.config.js`, `App.jsx`, `IntelligenceCard.jsx`).
- **Sécurité** : `.env` jamais affiché, jamais committé. Tokens jamais leakés dans les messages d'erreur (vérifié par test `expect(JSON.stringify(result)).not.toContain('secret-token')`). Validation des inputs côté API (symbol uppercase + trim, limits clampés).
- **Efficacité** : cache TTL côté serveur ajusté à la volatilité (quotes 20s, news 30 min, fundamentals 6h, earnings 6h, dividendes 24h, history 6h, search 10 min, health 60s). `AbortController` côté client pour annuler les fetches obsolètes au changement de symbole.
- **Optimisation** : un panel = un fetch par changement de symbole, pas de refetch redondant. Tests rapides (cible : full suite < 2s).

## Convention de fichiers (RESPECTER à chaque nouvelle source)

| Couche | Fichier | Responsabilité |
|---|---|---|
| Domaine pur | `server/<feature>.js` | fetch + normalisation, fetcher injectable, testable hors HTTP |
| Tests domaine | `server/<feature>.test.js` | vitest, mocks fetch, vérifie absence de token-leak |
| Handler dev | bloc dans `vite.config.js` middleware `/api/<feature>` | TTL via `readThroughCache` |
| Handler prod | `api/<feature>.js` | self-contained Vercel handler, mémo-cache local |
| Client | `src/services/<feature>.js` | fetch `/api/<feature>?symbol=X`, `AbortSignal` supporté |
| Tests client | `src/services/<feature>.test.js` | mock `globalThis.fetch` |
| Formateurs (si KPI) | `src/utils/<feature>Formatters.js` | purs, par champ, retournent `null` si invalide |
| Tests formateurs | `src/utils/<feature>Formatters.test.js` | |
| UI | `src/components/<Feature>Panel.jsx` | empilé dans `IntelligenceCard.jsx` |
| Healthcheck | extension `server/marketDataHealth.js` | une probe par capability distincte |

## Workflow obligatoire

1. **TDD** : tests rouges d'abord, implémentation, verts.
2. **Validation avant commit** : `npm run lint && npm test && npm run build` doivent tous être verts.
3. **Commit** : un seul commit cohérent par bloc, message en anglais, signature `Co-Authored-By` Claude.
4. **Docs** : `PLATFORM_CHECKLIST.md` + `REPRISE_CHECKPOINT.md` mis à jour AVANT le commit (inclus dans le même commit feat ou dans un docs séparé selon ampleur).
5. **Push** : JAMAIS sans demande explicite. JAMAIS `--force`.

## Hard-stop (interdits en autonome)

- `git push`, `git push --force`, `git push --no-verify`
- déploiement Vercel (`vercel deploy`, `vercel --prod`)
- modification `.env`, `.env.*`, ou affichage de leur contenu
- suppression de fichiers de tests / data sans demande explicite
- `--no-verify` sur `git commit`
- `git rebase -i`, `git reset --hard` sur du committed work
- modification de `~/.claude/` (config Claude Code globale) sans demande

## Port local

```bash
npm run dev -- --host 127.0.0.1 --port 20000
```

Plage 20000-20999 réservée NEXOS_PLATFORM côté gear-code mais ce projet est dans 02_projects et utilise simplement 20000 par défaut. Vérifier qu'il n'est pas déjà occupé : `lsof -i :20000`.

## Mot magique reprise

`FIS-REPRISE-FD01815` — déclenche relecture intégrale de `REPRISE_CHECKPOINT.md`. Reste valide tant qu'on ne change pas le code de reprise.

## Mémoires de session

`/home/gear-code/.claude/projects/-home-gear-code-02-projects-financial-intelligence-suite/memory/`

- `feedback_no_decision_outsourcing.md` — ne pas redemander « quel axe ? » en début de session
- `project_architecture.md` — pattern modulaire feature × couche (référence rapide)

Index : `MEMORY.md` (auto-chargé).

## Stack technique (référence rapide)

- React 19 + Vite 7 + Tailwind 4
- vitest 4 + @testing-library/react (jsdom)
- ESLint 9 (flat config, hooks + react-refresh)
- better-sqlite3 (persistance locale portefeuille)
- Recharts (graphiques)
- Lucide React (icônes)
- API externes : Finnhub (primaire), Twelve Data (historique), Stooq (fallback quotes)
