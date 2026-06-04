# User Guide — Financial Intelligence Suite
### Version détaillée (pas-à-pas)

> Version du guide : 2026-06-03. Application en ligne : https://devlabai.tech

Cette version reprend les mêmes fonctions que la version intermédiaire, mais sous forme de
**parcours guidé** : objectif, étapes numérotées, ce que vous voyez à l'écran, et les pièges à
éviter. Elle est conçue pour une **première utilisation**, en suivant chaque étape.

**Ce guide existe en trois formats** — même périmètre, profondeur croissante :

| Format | Fichier | Pour quoi |
|---|---|---|
| **Détaillé** (ce document) | `USER_GUIDE_DETAILED.md` | Première prise en main, chaque étape décrite |
| **Intermédiaire** | [`USER_GUIDE.md`](./USER_GUIDE.md) | Comprendre chaque fonction et comment la lire |
| **Aide-mémoire** (tables) | [`USER_GUIDE_CHEATSHEET.md`](./USER_GUIDE_CHEATSHEET.md) | Retrouver une fonction d'un coup d'œil |

> Les trois formats sont aussi consultables **dans l'application**, onglet **Guide** (`/guide`),
> avec un sélecteur de niveau et un bouton « Imprimer / PDF ».

> **Convention** : les étapes sont notées ▶ et numérotées. Les encadrés « 👀 À l'écran » décrivent
> ce que vous devriez voir, et « ⚠️ Attention » signale les pièges. Les emplacements exacts de
> certains boutons peuvent évoluer (logiciel en bêta) ; la logique des étapes, elle, reste valable.

---

## 0. Avant de commencer

**Ce dont vous avez besoin :** un navigateur web (Chrome, Firefox, Edge, Safari) et l'adresse
https://devlabai.tech. Rien à installer, aucun compte à créer.

**Trois choses à savoir d'emblée :**

1. **FIS n'achète et ne vend rien.** C'est un outil d'analyse. Vous y enregistrez ce que vous
   possédez (manuellement), et il calcule des mesures dessus.
2. **Vos données restent sur votre appareil.** Tout est sauvegardé dans le navigateur que vous
   utilisez. Si vous changez d'ordinateur, les données ne suivent pas (sauf si vous les exportez).
3. **Le logiciel n'invente jamais un chiffre.** Une case vide = une donnée réellement absente, pas
   un bug.

---

## 1. Démarrer et reconnaître l'écran

**Objectif :** ouvrir l'application et savoir où regarder.

▶ **1.** Ouvrez votre navigateur et allez à https://devlabai.tech.
▶ **2.** À la première visite, un **bandeau de consentement** apparaît en bas de l'écran. Cliquez
sur « J'ai compris » pour le fermer (ou « En savoir plus » pour lire la politique de
confidentialité). Ce bandeau est un avis, pas un piège publicitaire.
▶ **3.** Repérez la **barre du haut** (le header). De gauche à droite, vous y trouvez :

- les **sept onglets** : `Tableau de bord` · `Watchlist` · `Démo` · `Transactions` · `Rapport` · `Paramètres` · `Guide` ;
- le **sélecteur de mandat** (le portefeuille actif) ;
- le **sélecteur de thème** (couleurs) ;
- l'**indicateur d'état du marché**, avec un bouton pour rafraîchir les cotations.

> 👀 **À l'écran :** au démarrage, le tableau de bord est **vide ou presque** — c'est normal. Le
> portefeuille par défaut ne contient aucune position : c'est vous qui allez le remplir.

> ℹ️ La page **Mentions légales** s'ouvre par les liens en **bas de page** (pied de page). La page
> **Connexion** n'apparaît dans le header que si la couche de comptes est activée — par défaut,
> elle ne l'est pas, et c'est sans importance pour tout ce qui suit.

---

## 2. Votre première action : trouver une compagnie

**Objectif :** chercher Apple et ouvrir sa fiche d'analyse.

▶ **1.** Cliquez dans la **barre de recherche** (en haut de la zone principale).
▶ **2.** Tapez `Apple` (ou directement le symbole `AAPL`).
▶ **3.** Une liste de résultats apparaît. Chaque ligne indique le **nom**, le **symbole**, la
**bourse** et le **pays**.
▶ **4.** Choisissez la ligne `AAPL — Apple Inc.` (bourse américaine, pays US) et cliquez dessus.

> 👀 **À l'écran :** la **fiche** d'Apple s'ouvre. En haut, le prix actuel et la variation du jour.
> En dessous, une longue colonne de **panneaux** d'analyse empilés.

> ⚠️ **Attention aux doublons.** Une même entreprise peut être cotée sur plusieurs marchés. Le
> suffixe du symbole vous renseigne : `.TO` = Toronto, `.V` = TSX Venture, `.CN` = CSE, `.NE` =
> Cboe Canada ; **aucun suffixe** = généralement une bourse américaine. Pour ne garder qu'un pays,
> utilisez le **filtre par pays** dans les résultats.

> 💡 **Astuce :** vos 20 dernières recherches sont mémorisées et relançables ; et vous pouvez
> mettre une **étoile** (favori) sur une valeur pour la retrouver vite.

---

## 3. Lire la fiche d'une valeur, panneau par panneau

**Objectif :** comprendre ce que chaque panneau de la fiche vous montre. Faites défiler du haut
vers le bas. (Vous pourrez plus tard masquer ceux qui ne vous intéressent pas — partie 12.)

### 3.1 — Le prix en haut
Le **cours actuel** et sa **variation depuis l'ouverture**, en valeur et en pourcentage (vert =
hausse, rouge = baisse). Il se met à jour tout seul (~20 secondes). Si la source ne répond plus, le
prix est marqué **périmé** plutôt que présenté comme frais.

### 3.2 — Le graphique
Juste sous le prix, une **courbe**. Cliquez sur les boutons de période pour changer la fenêtre :
`1J / 5J / 1M / 6M / YTD / 1A / 5A`.
> ⚠️ Sur les longues fenêtres (3-5 ans), la courbe peut être plus courte que demandé : la source
> gratuite remonte ~18 mois. Le logiciel affiche ce qui existe, sans inventer le reste.

### 3.3 — Fondamentaux
Les chiffres clés : capitalisation, **P/E** (cours/bénéfice), **EPS** (bénéfice par action),
revenus, marges, rendement du dividende, bêta, secteur.
> 👀 Chaque valeur porte sa **source et sa date**. Une ligne absente est masquée.
> 💡 Le **P/E** dit combien on paie pour 1 $ de bénéfice annuel : élevé = fortes attentes, bas =
> prudence (ou inquiétude).

### 3.4 — Recommandations analystes
Le consensus des analystes (de « achat fort » à « vendre fort »), leur répartition et la tendance
sur 6 mois. À lire comme une **opinion agrégée**, pas une vérité.

### 3.5 — Actualités
Les nouvelles des ~14 derniers jours : titre, source, date, lien vers l'article.

### 3.6 — Calendrier des résultats
Les dates de publication des résultats (passées et à venir) et la **surprise EPS** (écart entre le
bénéfice attendu et réel). Des surprises positives répétées = bon signe.

### 3.7 — Historique des dividendes
Les dividendes versés sur 5 ans, avec le total des **12 derniers mois (TTM)** mis en avant.

### 3.8 — Dépôts SEC / Cotation canadienne
- **Dépôts SEC** : les documents officiels (rapports annuels/trimestriels, 8-K…), avec lien PDF.
- **Cotation canadienne** : pour un titre coté au Canada, sa place et sa devise (CAD). Ce panneau
  dit aussi honnêtement ce qui **n'est pas** disponible (SEDAR+, fiscalité détaillée).

### 3.9 — Comparaison sectorielle
Les entreprises du même métier, avec leur cotation et leur écart de performance par rapport à Apple.

### 3.10 — Initiés
- **Transactions d'initiés** : achats/ventes des dirigeants (vert = achat, rouge = vente).
- **Sentiment des initiés (MSPR)** : indicateur mensuel d'accumulation ou de délestage.
> ⚠️ Ces deux panneaux ne concernent que les titres **américains**. Pour les autres, ils sont vides.

### 3.11 — Analyse Buffett (DCF)
Une **valeur intrinsèque** estimée, comparée au cours pour donner une **marge de sécurité**, plus
une note sur 6 critères. Des curseurs `r` et `g` permettent de tester différentes hypothèses.
> 💡 Marge **positive** = cours sous la valeur estimée (« bon marché ») ; **négative** = au-dessus.
> C'est une estimation paramétrable, pas un verdict.

### 3.12 — Journal d'investissement
Votre carnet de notes **sur cette valeur** : thèse, conviction (1-5), prix cible, stop, date de
revue. Vous le remplissez, il reste privé et local.

### 3.13 — Simulateur, rendements, distribution, repli
Quatre panneaux d'analyse du passé : le **simulateur** (« si j'avais investi… », voir partie 10),
les **rendements** par période, leur **distribution**, et le **repli (drawdown)** du titre.

---

## 4. Créer un portefeuille et ajouter une position

**Objectif :** enregistrer ce que vous possédez, dans un mandat (= un portefeuille nommé).

### 4a — Créer un mandat (optionnel mais propre)
▶ **1.** Dans le header, ouvrez le **sélecteur de mandat**.
▶ **2.** Choisissez **créer** un nouveau mandat. Donnez-lui un nom (ex. « Mon portefeuille »), un
client, une **devise de base** (CAD ou USD), une date d'ouverture, un type de compte (imposable /
REER / CELI).
▶ **3.** Le nouveau mandat devient actif. Vous pouvez en avoir plusieurs et basculer de l'un à
l'autre à tout moment — leurs positions sont **isolées**.

### 4b — Ajouter une position
▶ **1.** Depuis le tableau de bord (ou la fiche d'une valeur), utilisez l'outil d'ajout de
position.
▶ **2.** Renseignez le **symbole** (ex. `AAPL`), la **quantité** détenue et le **prix de revient**
(le prix payé par action).
▶ **3.** Validez. La position apparaît dans le **Gestionnaire de positions**, avec sa valeur de
marché et son **profit latent** (gain « sur papier ») mis à jour avec le cours en direct.

> ⚠️ **Profit latent ≠ profit réalisé.** Le latent est un gain non encaissé (vous détenez encore).
> Le réalisé n'existe qu'après une vente (partie 6).

### 4c — Importer depuis votre courtier (au lieu de saisir à la main)
▶ **1.** Choisissez l'**import CSV** et sélectionnez le fichier exporté de votre courtier.
▶ **2.** Le logiciel **détecte les colonnes** automatiquement et affiche une **prévisualisation
ligne par ligne**.
▶ **3.** Vérifiez la prévisualisation, corrigez le mapping si besoin, puis confirmez.

### 4d — Sauvegarder vos données
▶ Utilisez l'**export CSV** (pour un tableur) ou **JSON** (sauvegarde complète). À faire
régulièrement, puisque les données vivent dans ce navigateur uniquement.

---

## 5. Enregistrer un achat ou une vente (onglet Transactions)

**Objectif :** tenir le journal qui alimente le profit réalisé et les rapports fiscaux.

▶ **1.** Cliquez sur l'onglet **Transactions**.
▶ **2.** Ajoutez une opération en choisissant son **type** : achat, vente, dividende ou frais.
▶ **3.** Renseignez le symbole, la date, la quantité, le prix (et les frais le cas échéant).
▶ **4.** Validez. La synthèse se met à jour : profit **réalisé** par symbole, lots encore ouverts.

> 💡 **FIFO vs LIFO :** quand vous vendez une partie de vos actions, le logiciel doit savoir
> lesquelles. **FIFO** vend d'abord les plus anciennes, **LIFO** les plus récentes. Ce choix
> change le profit calculé.
> ⚠️ Vendre plus que ce que vous détenez (survente) est **signalé**.

---

## 6. Lire le tableau de bord

**Objectif :** interpréter la vue d'ensemble du mandat actif.

▶ Cliquez sur l'onglet **Tableau de bord**. Vous y voyez (selon les panneaux activés) :

- **Top performances** — qui monte / descend le plus.
- **Gestionnaire de positions** — la liste complète, valeur et profit latent.
- **Centre de risque** — une synthèse des signaux de risque.
- **Badge d'intégrité** — un voyant de **fiabilité des données** affichées.
- **Exposition devises** — la répartition par monnaie, convertie dans la devise du mandat.

> 💡 Si un panneau ne vous sert pas, vous le masquerez en partie 12. Rien n'est figé.

---

## 7. Mesurer performance et risque

**Objectif :** faire apparaître et lire les mesures professionnelles. Ces panneaux se construisent
à partir de la **valeur quotidienne** de votre portefeuille, accumulée jour après jour — ils sont
donc **pauvres au début** et s'enrichissent avec le temps. C'est voulu : le logiciel ne calcule
que sur des jours réels.

▶ Activez les panneaux voulus dans **Paramètres** (partie 12), puis lisez-les sur le tableau de
bord :

- **TWR** (rendement pondéré-temps) — la performance **hors** vos apports/retraits : l'**effet
  gérant**.
- **MWR / IRR** (rendement pondéré-argent) — la performance **vécue**, timing inclus : l'**effet
  client**. Comparez les deux : un MWR sous le TWR = mauvais timing des versements.
- **Risque (volatilité & repli)** — à quel point ça oscille, et la pire baisse subie.
- **Ratios ajustés** (Sharpe / Sortino / Calmar) — le rendement rapporté au risque pris. Plus
  haut = mieux récompensé.
- **Comparaison au benchmark** — votre rendement face à un indice (sélecteur **SPY / QQQ / DIA**) :
  avez-vous battu le marché ?
- **Beta & corrélation**, **Ratios vs benchmark** — votre sensibilité au marché, votre
  sur/sous-performance ajustée (alpha), votre régularité (tracking error, information ratio…).
- **Valeur à risque (VaR / CVaR)** — l'ampleur estimée d'une mauvaise période (à 95 % / 99 %).
- **Statistiques opérationnelles** — vos habitudes : rotation, durée de détention, taux de coups
  gagnants.

> ⚠️ Une mesure peut s'afficher en **tiret (—)** : c'est qu'il n'y a pas encore assez d'historique
> pour la calculer de façon fiable (ex. les versions annualisées avant un an de données).

---

## 8. Garder le portefeuille équilibré et en règle

- **Concentration & diversification** — mettez-vous trop dans peu de titres ? Regardez le **nombre
  effectif de positions** : s'il est petit malgré beaucoup de lignes, la diversification est
  illusoire.
- **Corrélation des positions** — une carte de chaleur : deux titres très corrélés bougent
  ensemble (diversifient peu).
- **Rééquilibrage** — ▶ définissez des **cibles** de pondération, et le panneau propose les ordres
  d'achat/vente pour y revenir. *Sans cible définie, il ne peut rien proposer.*
- **Conformité du mandat** — ▶ posez des **règles** (poids max par titre/secteur, exclusions) ; le
  panneau liste les **violations**. C'est indicatif, ça ne bloque pas vos ajouts.

---

## 9. La fiscalité

**Objectif :** retrouver de quoi préparer une déclaration, à partir de votre journal de
transactions. Ces panneaux sont sur le tableau de bord.

- **Gains/pertes réalisés par année** — un état de type **T5008** (Canada) / **1099-B**
  (États-Unis) : vos ventes regroupées par année fiscale, avec produit, coût, gain et durée de
  détention. ▶ Exportable en **CSV**.
- **Retenue US sur dividendes** — applique la règle du **traité fiscal Canada–États-Unis** (15 %,
  exempt en REER/FERR, non récupérable en CELI, récupérable en compte imposable) aux dividendes US
  réellement déclarés. Le type de compte vient du mandat.

> ⚠️ Repères factuels, **pas un conseil fiscal**. Un feuillet officiel (notamment le PBR/ACB
> canadien) peut différer du calcul FIFO/LIFO affiché.

---

## 10. Le simulateur « et si j'avais investi… »

**Objectif :** illustrer ce qu'un investissement passé aurait donné, sur données réelles.

### 10a — Sur une seule valeur (dans la fiche)
▶ **1.** Ouvrez la fiche d'une valeur (partie 2) et repérez le panneau **Simulateur**.
▶ **2.** Entrez un **montant** et une **date de départ**.
▶ **3.** Lisez le résultat : parts achetées, valeur finale, rendement total, CAGR, et la courbe.

### 10b — Sur plusieurs valeurs (onglet Démo)
▶ **1.** Cliquez sur l'onglet **Démo**.
▶ **2.** Composez un portefeuille fictif : ajoutez plusieurs positions, chacune avec sa date et son
montant d'entrée.
▶ **3.** Le graphique trace la valeur agrégée dans le temps **vs un benchmark** (S&P 500).

> ⚠️ Un **bandeau permanent** rappelle que c'est une **hypothèse**, pas une prédiction ni un
> conseil. Si la date demandée précède les données disponibles, la simulation démarre au premier
> point réel et le dit.

---

## 11. Produire un rapport (onglet Rapport)

**Objectif :** générer un document propre par mandat, exportable en PDF.

▶ **1.** Sélectionnez le **mandat** voulu (sélecteur de mandat dans le header).
▶ **2.** Cliquez sur l'onglet **Rapport**. Le document se compose : sommaire (valeur, coût, profit
latent), positions détenues, TWR, gains réalisés par année, comparaison au benchmark.
▶ **3.** Pour ajouter un mot, utilisez l'éditeur de **commentaire daté** (il ne s'imprime pas
lui-même, mais les commentaires enregistrés, oui).
▶ **4.** Cliquez sur **Imprimer / PDF**. Dans la fenêtre d'impression du navigateur, choisissez
**« Enregistrer en PDF »**. La barre de navigation est automatiquement masquée à l'impression.

> ℹ️ L'attribution sectorielle « Brinson » est volontairement absente du rapport : aucune source
> gratuite ne fournit la composition exacte d'un indice. Le logiciel le dit plutôt que d'inventer.

---

## 12. Personnaliser votre espace (onglet Paramètres)

**Objectif :** composer votre interface — afficher, masquer, ranger.

▶ Cliquez sur l'onglet **Paramètres**.

- **Afficher/masquer un panneau :** ▶ basculez son interrupteur de visibilité. Le panneau
  disparaît (ou réapparaît) aussitôt sur la surface concernée (tableau de bord ou fiche).
- **1 ou 2 colonnes :** ▶ choisissez le colonnage d'un panneau pour densifier ou aérer.
- **Réordonner :** ▶ glissez-déposez un panneau, ou utilisez les boutons monter/descendre.
- **Agencement optimal :** ▶ cliquez sur **« Agencement optimal »** : le logiciel range
  automatiquement (pilotage en haut, documents en bas). Instantané.
- **Profils prêts à l'emploi :** ▶ appliquez un profil en un clic — **Vue d'ensemble**, **Value
  investor**, **Trader**, **Conseiller client**. Vous pouvez ensuite ajuster.
- **Vos propres profils :** ▶ enregistrez l'agencement courant comme profil nommé, pour le
  réappliquer plus tard.
- **Thèmes :** ▶ via le sélecteur de thème (header), essayez **Matrix**, **Cyber** ou **Clair**.
  Cela ne change que les couleurs.
- **Tout remettre à zéro :** ▶ bouton **Réinitialiser**.

---

## 13. Watchlists, alertes, compte

### 13a — Watchlists (onglet Watchlist)
**Objectif :** suivre des valeurs sans les détenir.
▶ **1.** Cliquez sur l'onglet **Watchlist**.
▶ **2.** Créez une ou plusieurs **listes nommées** (ex. « À surveiller », « Tech »). Basculez entre
elles avec le sélecteur de liste.
▶ **3.** Sur n'importe quelle valeur, le bouton d'ajout à la watchlist la place dans la **liste
active**.

### 13b — Alertes
▶ Dans les panneaux de monitoring du tableau de bord :
- **Alertes configurables** : ▶ définissez un seuil (prix, variation, dérive). L'alerte se
  déclenche quand le seuil est franchi, à chaque rafraîchissement de cotation.
- **Alertes opérateur** : automatiques, rien à configurer — elles signalent variation inhabituelle,
  dérive ou cotation périmée.
- **État des fournisseurs** : un voyant par source de données — utile pour savoir si un panneau
  vide vient d'une source en panne.
- **Macro — taux & courbe** : le contexte économique (taux Fed, courbe, inflation, Banque du
  Canada).

### 13c — Compte (optionnel)
La page **Connexion** prépare les usages multi-utilisateurs. **Par défaut elle est désactivée** et
n'apparaît pas : vous n'avez pas besoin de compte. Vos données restent dans le navigateur.

---

## 14. Confidentialité (pied de page → Mentions légales)

▶ Cliquez sur **Mentions légales** dans le **pied de page**. Vous y trouvez la politique de
confidentialité (Loi 25), rédigée d'après le comportement réel de l'app : tout est local, seuls des
symboles boursiers sont transmis aux fournisseurs de données, aucun cookie de pistage. Vos droits
(accès, rectification, retrait, portabilité) et les recours y sont décrits.

> ℹ️ Certaines mentions (identité de l'exploitant, responsable de la protection des renseignements)
> sont marquées « à compléter » : elles seront renseignées avant une mise en service publique.

---

## 15. Récapitulatif d'apprentissage et dépannage

**Vous savez maintenant :** chercher une valeur, lire sa fiche, créer un mandat, ajouter ou
importer des positions, enregistrer des transactions, lire le tableau de bord, faire apparaître les
mesures de performance/risque, équilibrer et contrôler le portefeuille, simuler, produire un
rapport PDF, et personnaliser votre espace.

**Petits problèmes fréquents :**

| Symptôme | Cause probable | Quoi faire |
|---|---|---|
| Un panneau est vide | Donnée absente (titre non-US, historique court, source muette) | Normal ; vérifier **État des fournisseurs** |
| Une mesure affiche « — » | Pas encore assez d'historique | Attendre que la série s'accumule |
| Le simulateur démarre plus tard que ma date | Données gratuites ~18 mois | Lecture normale, signalée à l'écran |
| Mes données ont « disparu » | Elles sont liées au navigateur/appareil | Réutiliser le même navigateur ; **exporter** pour sauvegarder |
| Le rééquilibrage ne propose rien | Aucune cible définie | Définir des cibles de pondération |
| Pas d'onglet Connexion | Couche de comptes désactivée (normal) | Aucune action requise |

**À retenir, toujours :** aucun chiffre n'est inventé, une case vide est une donnée absente, et
rien dans FIS n'est un conseil — ce sont des faits que **vous** interprétez.

---

*Pour les définitions des termes (TWR, drawdown, VaR, HHI…), voir le glossaire de la
[version intermédiaire](./USER_GUIDE.md#143--glossaire) ou l'[aide-mémoire](./USER_GUIDE_CHEATSHEET.md#glossaire-express).*
