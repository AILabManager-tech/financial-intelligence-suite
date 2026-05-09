# Reprise checkpoint — Financial Intelligence Suite

Mot magique: `FIS-REPRISE-1F884EB`

## Instruction pour nouvelle session

Quand l'utilisateur tape `FIS-REPRISE-1F884EB`, commencer par lire ce fichier, puis continuer le developpement dans:

`/home/gear-code/02_projects/financial-intelligence-suite`

Ne modifier aucun fichier hors de ce dossier.

## Etat git

Checkpoint local principal:

`1f884eb Checkpoint financial platform modules`

Ce checkpoint contient les modules fonctionnels majeurs:

- quotes live factuelles avec Finnhub primaire et Stooq fallback;
- historique factuel via Twelve Data;
- suppression du glitch de fausses valeurs au chargement;
- portefeuille editable avec persistance locale navigateur et SQLite local;
- snapshots historiques du portefeuille;
- graphique de performance portefeuille;
- cache TTL memoire pour quotes, historique, recherche et healthcheck;
- validation serveur des positions et snapshots;
- detection de quotes stale;
- export CSV/JSON du portefeuille;
- healthcheck fournisseurs Finnhub/Twelve Data/Stooq;
- alertes operateur variation/drift/stale;
- navigation locale `"/"` et `"/watchlist"`;
- watchlist independante du portefeuille;
- favoris persistants localement;
- `PLATFORM_CHECKLIST.md` comme liste source a maintenir a jour.

Un second commit peut exister apres celui-ci pour ce fichier de reprise.

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

Derniere validation complete avant reprise:

- `npm run lint` OK
- `npm test` OK, 52 tests
- `npm run build` OK

## Serveur local

URL locale:

`http://127.0.0.1:20000/`

Verifier si le serveur tourne:

`pgrep -a -f "vite --host 127.0.0.1 --port 20000"`

## Prochaine suite logique

Continuer selon `PLATFORM_CHECKLIST.md`, priorite actuelle:

1. Alertes configurables.
2. Selecteur de periode pour les courbes.
3. Historique des recherches.
4. Filtre pays/exchange et desambiguïsation symboles.
5. Import CSV broker.
6. Donnees fondamentales sourcees: market cap, P/E, EPS, revenus, marges.

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
git log -1 --oneline
```

## Note fonctionnelle

L'application doit rester purement factuelle: aucune donnee mock visible, aucune prediction presentee comme fait, aucune analyse financiere avancee sans donnees sourcees.
