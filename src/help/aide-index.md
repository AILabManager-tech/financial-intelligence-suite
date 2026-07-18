# Centre d'aide — Financial Intelligence Suite

Bienvenue dans le **centre d'aide** de FIS. Cet espace rassemble, en un seul endroit, toute la documentation du produit : la présentation, la formation utilisateur et la théorie derrière chaque calcul.

> **Note :** cet espace regroupe volontairement toute la documentation au même endroit, pour apprentissage et référence. Utilisez les onglets en haut pour naviguer.

## Ce que contient ce centre d'aide

| Onglet | Contenu |
|---|---|
| **À propos & documentation** | Cette page : présentation du produit, architecture, sources de données, principes de factualité, glossaire. |
| **Formation** | Prise en main progressive, du premier lancement aux fonctions avancées (20 modules + démarrage rapide). |
| **Théorie & calculs** | La théorie et les formules derrière chaque chiffre : TWR, MWR, volatilité, Sharpe, VaR, beta, DCF, FIFO, et les différentes méthodes de calcul. |

---

## À quoi sert l'application

FIS est un **studio d'analyse financière factuelle** pour le planificateur financier et le petit cabinet. Son rôle n'est pas de remplacer la plateforme de courtage du client (iA, Croesus), mais d'ajouter par-dessus une **couche de préparation** : transformer un simple export de portefeuille en une rencontre client prête à présenter, où **chaque chiffre porte sa source**.

En une phrase par domaine :

- **Analyser un titre :** cotation, fondamentaux sourcés, analyse Buffett (DCF), actualités, résultats, dividendes, analystes, dépôts SEC.
- **Suivre un portefeuille :** positions, transactions, lots fiscaux FIFO, gains réalisés, exposition devises.
- **Mesurer la performance :** TWR, MWR, volatilité, repli, ratios de risque, VaR, comparaison à un indice.
- **Préparer la relation client :** brief de rencontre, rapport de mandat exportable en PDF.
- **Composer son espace :** activer, positionner et sauvegarder ses panneaux ; profils préconfigurés.

---

## Le principe fondateur : la factualité stricte

Aucune donnée n'est inventée. C'est la règle qui gouverne toute l'application :

- **Provenance par champ.** Chaque indicateur porte sa propre source et sa date : `{ valeur, source, asOf }`. Pas de « source globale » par panneau.
- **Champ absent = masqué.** Une donnée sans source n'est pas affichée, plutôt qu'un « 0 » trompeur.
- **Simulations étiquetées.** Toute projection porte la mention « hypothèse à partir de données factuelles, pas un conseil ».
- **Séries reconstruites étiquetées.** Une performance calculée à partir du journal et des clôtures réelles est signalée « factuelle mais rétrospective », jamais présentée comme un suivi accumulé.

C'est ce qui permet, devant un client et sous responsabilité réglementaire (AMF), de toujours répondre à « d'où vient ce chiffre ? ».

---

## Architecture, en bref

- **Interface :** panneaux composables (fiche titre, tableau de bord, brief, rapport, simulateur). Un **registre de features** central rend chaque panneau activable et positionnable.
- **Domaine :** fonctions pures et testables (reconstruction de série, TWR / risque, provenance, lots FIFO).
- **Fournisseurs de données factuelles :** Finnhub (fondamentaux, cotations, actualités), Twelve Data (historique), Stooq (repli cotations), FRED (macro), Frankfurter / BCE (change).
- **Technologie :** React 19, Vite 7, Tailwind 4, Recharts. Déploiement web ; rien à installer.

---

## Confidentialité et données

- Vos données de portefeuille **restent dans votre navigateur** (stockage local). Aucun compte requis aujourd'hui, aucun pistage, aucune publicité.
- Seuls les **symboles boursiers consultés** sont transmis aux fournisseurs de données de marché.
- Conforme à la **Loi 25** (protection des renseignements personnels, Québec) : confidentialité par défaut, consentement explicite.

> L'étage multi-utilisateur (comptes, rôles, chiffrement, audit) relève de la roadmap. Voir la Formation, Partie IV.

---

## Glossaire

- **Mandat** — portefeuille d'un client, isolé, avec sa devise de référence.
- **Provenance par champ** — chaque indicateur porte sa propre source et sa date.
- **Série reconstruite** — valeurs recalculées à partir du journal × clôtures réelles ; factuelle mais rétrospective.
- **TWR** — rendement pondéré dans le temps ; effet du gérant, flux neutralisés (standard GIPS).
- **MWR / IRR** — rendement pondéré par l'argent ; effet du calendrier des apports/retraits.
- **Volatilité** — écart-type annualisé des rendements.
- **Repli (drawdown)** — baisse maximale du sommet au creux, avec durée de récupération.
- **Sharpe / Sortino / Calmar** — ratios de rendement ajusté au risque.
- **VaR / CVaR** — perte attendue à un seuil de probabilité (95 %, 99 %).
- **Benchmark** — indice de référence (S&P 500, Nasdaq 100, Dow Jones).
- **FIFO** — premier entré, premier sorti ; appariement des lots pour les gains réalisés.
- **HHI** — indice de Herfindahl-Hirschman ; mesure de concentration.
- **DCF** — actualisation des flux de trésorerie ; base de la valeur intrinsèque (analyse Buffett).
- **Loi 25** — loi québécoise sur la protection des renseignements personnels.

---

*Documentation rassemblée pour apprentissage et référence. Pour le détail des formules et des méthodes de calcul, voir l'onglet « Théorie & calculs ».*
