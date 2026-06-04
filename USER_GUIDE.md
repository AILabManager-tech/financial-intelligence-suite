# User Guide — Financial Intelligence Suite
### Version intermédiaire (standard)
>
> Version du guide : 2026-06-03. Application en ligne : https://devlabai.tech

Ce manuel explique **chaque** fonction du logiciel : à quoi elle sert, où elle se trouve,
et surtout **comment lire ce qu'elle affiche**. Aucune connaissance financière préalable
n'est supposée — les termes sont définis au fil du texte, et regroupés dans le glossaire final.

**Ce guide existe en trois formats** — même périmètre, profondeur croissante :

| Format | Fichier | Pour quoi |
|---|---|---|
| **Détaillé** (pas-à-pas) | [`USER_GUIDE_DETAILED.md`](./USER_GUIDE_DETAILED.md) | Première prise en main, chaque étape décrite |
| **Intermédiaire** (ce document) | `USER_GUIDE.md` | Comprendre chaque fonction et comment la lire |
| **Aide-mémoire** (tables) | [`USER_GUIDE_CHEATSHEET.md`](./USER_GUIDE_CHEATSHEET.md) | Retrouver une fonction d'un coup d'œil |

> Les trois formats sont aussi consultables **directement dans l'application**, onglet **Guide**
> (`/guide`) : un sélecteur bascule entre Détaillé / Intermédiaire / Aide-mémoire, et le bouton
> « Imprimer / PDF » exporte le niveau affiché.

---

## Partie 1 — Concepts et prise en main

### 1.1 — À quoi sert FIS, et ce qu'il n'est pas

Financial Intelligence Suite (FIS) est un **outil d'analyse** pour suivre des compagnies cotées
en bourse et gérer un ou plusieurs portefeuilles d'investissement. Il rassemble au même endroit
le prix des actions, les chiffres financiers des entreprises, les actualités, et une batterie de
mesures de performance et de risque.

Ce que FIS **n'est pas** : ce n'est ni un courtier (on n'achète et ne vend rien à travers lui),
ni un conseiller. Le logiciel ne dit jamais « achète ceci » ou « vends cela ». Il présente des
**faits chiffrés** et vous laisse juger. Chaque panneau qui pourrait être pris pour une suggestion
porte la mention explicite « pas un conseil ».

### 1.2 — Vocabulaire de base

- **Action (ou titre, ou valeur)** : une part de propriété d'une entreprise. Si vous détenez une
  action d'Apple, vous possédez une fraction minuscule d'Apple.
- **Symbole (ticker)** : le code court d'une action en bourse. Apple = `AAPL`, Microsoft = `MSFT`.
- **Cours (ou cotation)** : le prix d'une action à un instant donné.
- **Portefeuille** : l'ensemble des positions que vous détenez réellement.
- **Position** : une ligne du portefeuille (par exemple : 10 actions d'Apple achetées à 150 $).
- **Dividende** : une somme que certaines entreprises versent régulièrement à leurs actionnaires.
- **Rendement** : de combien votre argent a augmenté ou diminué, en pourcentage.
- **Risque** : à quel point la valeur peut monter et descendre brutalement.
- **Benchmark (indice de référence)** : un panier d'actions servant de point de comparaison,
  comme le S&P 500 qui regroupe 500 grandes entreprises américaines.

### 1.3 — Le principe directeur : des faits, jamais d'invention

FIS applique une règle stricte : **aucune donnée n'est fabriquée**. Si une information n'est pas
disponible (par exemple les revenus d'une entreprise très petite), le champ est tout simplement
**masqué** — vous ne verrez jamais un « 0 » trompeur ou une valeur inventée pour combler le vide.
Chaque chiffre affiché provient d'une source identifiée (Finnhub, Twelve Data, FRED…) et porte sa
date. Quand le logiciel fait une projection (le simulateur), il l'étiquette clairement comme une
hypothèse, jamais comme une prédiction.

### 1.4 — L'interface et les huit onglets

En haut de l'écran se trouve une barre de navigation avec les **sept onglets principaux** :

| Onglet | Rôle |
|---|---|
| **Tableau de bord** (`/`) | Vue d'ensemble du portefeuille, composée de panneaux personnalisables |
| **Watchlist** (`/watchlist`) | Listes de surveillance de valeurs que vous suivez sans les détenir |
| **Démo** (`/demo`) | Simulateur « et si j'avais investi… » sur plusieurs valeurs |
| **Transactions** (`/transactions`) | Journal de vos achats, ventes, dividendes et frais |
| **Rapport** (`/report`) | Rapport imprimable par mandat |
| **Paramètres** (`/settings`) | Personnalisation complète de l'espace de travail |
| **Guide** (`/guide`) | Ce manuel, directement dans l'application (3 niveaux de détail, imprimable) |

À droite de ces onglets se trouvent aussi : le **sélecteur de mandat** (pour changer de
portefeuille), le **sélecteur de thème**, et un **indicateur d'état du marché** (avec bouton de
rafraîchissement). Deux pages supplémentaires existent hors de cette barre :

- **Mentions légales** (`/legal`) — accessible par les **liens du pied de page**.
- **Connexion** (`/login`) — n'apparaît dans le header **que si** la couche de comptes est activée
  (désactivée par défaut ; voir partie 13).

Quand vous cliquez sur une valeur (depuis la recherche, la watchlist ou le portefeuille), vous
ouvrez sa **fiche** : une page dédiée empilant tous les panneaux d'analyse de cette valeur.

---

## Partie 2 — Rechercher et consulter une valeur

### 2.1 — La recherche globale

La barre de recherche permet de trouver une compagnie par son **nom** (« Apple ») ou par son
**symbole** (« AAPL »). Les résultats proviennent du service Finnhub. Tapez les premières lettres
et une liste de correspondances apparaît.

### 2.2 — Lire les résultats

Chaque résultat est **enrichi** de sa bourse et de son pays. C'est important car une même
entreprise peut être cotée sur plusieurs marchés (par exemple à New York et à Toronto). Un
**filtre par pays** aide à isoler le bon marché, et la désambiguïsation évite de confondre deux
titres au symbole proche. Repérez le suffixe : `.TO` = Toronto, `.V` = TSX Venture, `.CN` = CSE,
`.NE` = Cboe Canada ; sans suffixe = généralement une bourse américaine.

### 2.3 — L'historique de recherche

Vos 20 dernières recherches sont mémorisées (sans doublons) et relançables d'un clic. Pratique
pour revenir rapidement à une valeur consultée récemment.

### 2.4 — Les favoris

Vous pouvez marquer une valeur comme favorite (étoile). Les favoris sont conservés localement sur
votre appareil et servent d'accès rapide. Ils sont distincts des watchlists thématiques (voir 4
et la partie watchlist), qui sont des listes nommées plus structurées.

---

## Partie 3 — La fiche d'une valeur

La fiche regroupe jusqu'à seize panneaux d'analyse pour une même valeur. Vous pouvez en masquer ou
réordonner certains via les Paramètres (partie 12). Voici chacun d'eux.

### 3.1 — Cotation en direct et variation du jour

En haut de la fiche, le **cours actuel** et sa **variation depuis l'ouverture** (en valeur et en
pourcentage, vert si en hausse, rouge si en baisse). La source primaire est Finnhub, avec Stooq en
secours. Le cours se rafraîchit automatiquement (toutes les ~20 secondes). Si une cotation devient
**périmée** (stale — la source ne répond plus), le logiciel le signale plutôt que d'afficher un
vieux prix comme s'il était à jour.

### 3.2 — Le graphique de prix et le sélecteur de période

Une courbe montre l'évolution du prix. Un sélecteur permet de choisir la fenêtre de temps :
**1J / 5J / 1M / 6M / YTD / 1A / 5A** (YTD = depuis le 1er janvier de l'année en cours). Les
données historiques viennent de Twelve Data. Note : le forfait gratuit remonte environ 18 mois,
donc les très longues fenêtres (3-5 ans) peuvent être partiellement vides — auquel cas le logiciel
n'affiche que ce qui existe réellement, sans extrapoler.

### 3.3 — Fondamentaux

Les chiffres clés de l'entreprise : capitalisation boursière, ratio cours/bénéfice (P/E),
bénéfice par action (EPS), revenus, marges, rendement du dividende, bêta, pays, secteur. Source
Finnhub, avec **provenance par champ** (chaque valeur porte sa source et sa date) et un cache de
6 heures. Un champ indisponible est masqué.

> Comment lire : le **P/E** indique combien les investisseurs paient pour 1 $ de bénéfice annuel.
> Un P/E élevé suggère de fortes attentes de croissance ; un P/E bas, une valorisation prudente
> (ou des inquiétudes). Ce n'est qu'un indicateur parmi d'autres.

### 3.4 — Recommandations analystes

Le consensus des analystes professionnels qui suivent la valeur (achat fort / achat / conserver /
vendre / vendre fort), la distribution de leurs avis, et la tendance sur 6 mois. Source Finnhub.
À lire comme une **opinion agrégée du marché**, pas comme une vérité.

### 3.5 — Actualités de la société

Les nouvelles récentes (environ 14 derniers jours) : titre, source, date et lien externe vers
l'article complet. Source Finnhub.

### 3.6 — Calendrier des résultats

Les dates de publication des résultats trimestriels, passés et à venir, avec la **surprise EPS**
(l'écart entre le bénéfice attendu et le bénéfice réel). Une surprise positive répétée est un
signal de solidité ; une surprise négative, un avertissement.

### 3.7 — Historique des dividendes

L'historique des dividendes versés sur 5 ans, avec la somme **TTM** (trailing twelve months — les
12 derniers mois) mise en évidence. Les dividendes sont collectés via une cascade de fournisseurs
(Finnhub, puis Alpha Vantage, puis Twelve Data) : si le premier ne répond pas, le suivant prend le
relais. Si aucun ne fournit la donnée, elle est marquée indisponible plutôt qu'inventée.

### 3.8 — Dépôts SEC et cotation canadienne

- **Dépôts SEC** : les documents officiels déposés auprès du régulateur américain, groupés par
  type avec libellés en français (rapports annuels et trimestriels, événements 8-K, transactions
  d'initiés, procurations…) et un lien direct vers le PDF. Source Finnhub, cache 24 h.
- **Cotation canadienne** : pour une valeur cotée au Canada, ce panneau indique la place (TSX,
  TSX-V, CSE, Cboe Canada), le pays et la devise usuelle (CAD). Il signale honnêtement ce qui
  n'est **pas** disponible : les dépôts SEDAR+ (pas d'API publique gratuite équivalente à celle de
  la SEC) et le traitement fiscal détaillé des dividendes canadiens.

### 3.9 — Comparaison sectorielle (pairs)

La liste des entreprises du même secteur, chacune avec sa cotation en direct et son écart de
performance (en points de pourcentage) par rapport à la valeur consultée, classées par variation.
Source Finnhub `/stock/peers`, cotations rafraîchies en lot. Utile pour situer une entreprise face
à ses concurrentes directes.

### 3.10 — Transactions et sentiment des initiés

- **Transactions d'initiés** : les achats et ventes d'actions déclarés par les dirigeants et gros
  actionnaires (formulaires SEC 3/4/5), avec le nom, la date, le type d'opération (libellé en
  français), la variation de titres et la valeur estimée. Le sens (achat en vert, vente en rouge)
  est déduit du signe de la variation.
- **Sentiment des initiés (MSPR)** : un indicateur mensuel synthétique (Monthly Share Purchase
  Ratio, entre −100 et +100) résumant si les initiés accumulent ou se délestent, avec une moyenne
  sur 12 mois. Source Finnhub.

> Ces données ne concernent que les valeurs américaines ; pour les autres, le panneau affiche un
> état vide honnête.

### 3.11 — Analyse Buffett (DCF)

Une évaluation inspirée de la méthode de Warren Buffett : le panneau calcule une **valeur
intrinsèque** (ce que l'entreprise « vaudrait » selon ses fondamentaux), la compare au cours pour
en déduire une **marge de sécurité**, et note l'entreprise sur six critères (rentabilité,
croissance, endettement…). Des curseurs `r` (taux d'actualisation) et `g` (croissance) permettent
de tester la sensibilité du résultat. La décomposition mathématique est affichée. Source : les
fondamentaux Finnhub.

> Comment lire : une marge de sécurité positive signifie que le cours est **inférieur** à la
> valeur intrinsèque estimée (potentiellement « bon marché ») ; négative, qu'il est au-dessus.
> C'est une estimation paramétrable, pas un verdict.

### 3.12 — Journal d'investissement

Un carnet de notes par valeur : votre **thèse** d'achat, votre niveau de **conviction** (1 à 5),
un **prix cible**, un **stop** (seuil de vente envisagé) et une **date de revue**. Tout est saisi
par vous et conservé localement par symbole. Le statut de revue (en retard / imminente / planifiée)
est calculé automatiquement. Prix cible et stop sont étiquetés « pas un conseil » : ce sont **vos**
repères, pas ceux du logiciel.

### 3.13 — Simulateur what-if au niveau d'une valeur

« Si j'avais investi un montant M à une date D dans cette valeur, combien aurais-je aujourd'hui ? »
Le panneau calcule le nombre de parts achetées, la valeur finale, le rendement total et le taux de
croissance annualisé (CAGR), à partir de l'historique réel. Un bandeau permanent rappelle qu'il
s'agit d'une hypothèse sur données factuelles, pas d'une prédiction. (Voir aussi la partie 9 pour
la version multi-positions.)

### 3.14 — Rendements, distribution et repli

Trois panneaux d'analyse du comportement passé du **prix** de la valeur :

- **Rendements standards** : rendement cumulé, CAGR, et une matrice par période (1M, 3M, 6M, YTD,
  1A, et au-delà selon les données disponibles), plus les rendements mois par mois. Les périodes
  hors données sont masquées.
- **Distribution des rendements** : le pourcentage de mois positifs, le meilleur et le pire mois,
  la moyenne, l'écart-type, et un histogramme. L'asymétrie (skewness) et l'aplatissement (kurtosis)
  sont affichés seulement s'ils sont statistiquement fiables.
- **Analyse de repli (drawdown)** : la pire baisse du sommet au creux (avec dates et durée), la
  baisse actuelle depuis le dernier sommet, et le statut (au plus haut / sous l'eau / récupéré).

> Ces trois panneaux portent sur les rendements de **prix** (hors dividendes réinvestis), ce qui
> est indiqué. Le drawdown ici concerne **une valeur** ; le drawdown du portefeuille entier est un
> panneau distinct (partie 7).

---

## Partie 4 — Le portefeuille et les mandats

### 4.1 — Notion de portefeuille

Le portefeuille rassemble les positions que vous détenez **réellement**. À l'ouverture, il est
vide : c'est un choix de factualité. Vous le remplissez vous-même, soit manuellement, soit par
import (4.5). Les données sont conservées localement sur votre appareil (voir 13.2).

### 4.2 — Ajouter, modifier, retirer une position

Depuis la recherche ou le tableau de bord, ajoutez une valeur en précisant la **quantité** et le
**prix de revient** (le prix auquel vous l'avez payée). Vous pouvez ensuite modifier ou supprimer
chaque position. La valeur de marché et le profit latent (non réalisé) se mettent à jour avec les
cotations en direct.

### 4.3 — Gérer plusieurs mandats

Un **mandat** est un portefeuille nommé et indépendant — typiquement un par client, ou un par
objectif. Chaque mandat porte un nom, un client, une **devise de base**, une date d'ouverture et un
type de compte (imposable, REER, CELI). Le sélecteur en haut du tableau de bord permet de basculer
de l'un à l'autre, d'en créer, renommer ou supprimer. Les positions de chaque mandat sont isolées.

### 4.4 — Devises et conversion

Chaque mandat a une devise de base (CAD ou USD). Le panneau **Exposition devises** convertit la
valeur totale du portefeuille vers cette devise, à partir de taux de change réels (provider ECB via
Frankfurter, avec secours exchangerate.host, cache 6 h). Un taux manquant n'est jamais inventé : la
valeur correspondante est masquée.

### 4.5 — Import d'un fichier courtier (CSV)

Vous pouvez importer un relevé exporté depuis votre courtier au format CSV. Le logiciel **détecte
automatiquement** la correspondance des colonnes (mapping) et affiche une **prévisualisation ligne
par ligne** avant validation, pour que vous vérifiiez avant d'importer.

### 4.6 — Export du portefeuille

Le portefeuille peut être exporté en **CSV** (pour un tableur) ou en **JSON** (pour une sauvegarde
ou un transfert). Utile pour conserver une copie hors de l'application.

---

## Partie 5 — Transactions et lots fiscaux

### 5.1 — Enregistrer ses opérations

L'onglet **Transactions** est un journal daté, propre à chaque mandat. On y enregistre quatre types
d'opérations : **achat**, **vente**, **dividende** et **frais**. C'est ce journal qui alimente les
calculs de profit réalisé et de fiscalité.

### 5.2 — Méthodes FIFO / LIFO

Quand vous vendez une partie de vos actions, encore faut-il savoir **lesquelles** sont vendues —
cela change le profit calculé. Deux méthodes d'appariement sont disponibles :

- **FIFO** (First In, First Out) : on vend d'abord les actions achetées en premier.
- **LIFO** (Last In, First Out) : on vend d'abord les plus récentes.

### 5.3 — Profit réalisé et positions ouvertes

À partir du journal, le moteur de lots calcule le **profit réalisé** (l'argent effectivement gagné
ou perdu sur les ventes, frais inclus) et l'état des **lots ouverts** restants par symbole. Une
survente (vendre plus que ce qu'on détient) est signalée.

> Réalisé vs latent : le profit **réalisé** vient des ventes effectuées ; le profit **latent**
> (non réalisé) est le gain « sur papier » des positions encore détenues.

---

## Partie 6 — Le tableau de bord

### 6.1 — Rôle et composition

Le tableau de bord est votre vue d'ensemble. Il est **composé de panneaux** que vous activez,
masquez et réordonnez librement (partie 12). Voici les panneaux non liés à la performance ; les
panneaux de performance et de risque font l'objet de la partie 7, et ceux de construction de
portefeuille de la partie 8.

### 6.2 — Top performances

Le classement des positions qui montent et descendent le plus dans le mandat actif. Repère rapide
des contributeurs et des freins.

### 6.3 — Gestionnaire de positions

La liste complète de vos positions avec quantité, prix de revient, valeur de marché et profit
latent. C'est le panneau central pour voir et gérer le contenu du mandat.

### 6.4 — Centre de risque et badge d'intégrité

- **Centre de risque** : une synthèse des principaux signaux de risque du portefeuille (dont un
  aperçu de l'exposition sectorielle).
- **Badge d'intégrité** : un indicateur de **fiabilité des données** affichées — il vous dit si ce
  que vous regardez s'appuie sur des sources fraîches et complètes, conformément au principe de
  factualité.

### 6.5 — Exposition devises

Décrit en 4.4 : la répartition de la valeur du portefeuille par devise, convertie vers la devise de
base du mandat.

---

## Partie 7 — Mesures de performance et de risque

> Ces panneaux du tableau de bord s'appuient sur la **série de valeur quotidienne** du portefeuille
> (les « snapshots »), accumulée jour après jour à partir des positions réelles. Ils ne calculent
> que sur les jours réellement enregistrés et masquent les fenêtres trop longues tant que
> l'historique ne remonte pas assez loin — jamais de remplissage artificiel.

### 7.1 — TWR vs MWR : effet gérant vs effet client

- **Rendement pondéré-temps (TWR)** : la performance du portefeuille **en neutralisant** vos
  apports et retraits d'argent. Il mesure la qualité des choix d'investissement indépendamment du
  moment où vous avez ajouté ou retiré des fonds — c'est l'**effet gérant**, et c'est le standard
  professionnel (GIPS).
- **Rendement pondéré-argent (MWR / IRR)** : la performance **telle que vous l'avez réellement
  vécue**, qui tient compte du moment de vos apports et retraits — c'est l'**effet client**.

> Comparer les deux est instructif : si le MWR est inférieur au TWR, c'est que le **timing** de vos
> mouvements d'argent a coûté ; s'il est supérieur, il a aidé. Le TWR annualisé et l'IRR ne
> s'affichent qu'à partir d'un an d'historique (sinon ce serait trompeur).

### 7.2 — Volatilité, repli et récupération

Le panneau **Risque** affiche la **volatilité** (à quel point la valeur oscille, exprimée en
écart-type annualisé), le **repli maximal** (la pire chute du sommet au creux, avec dates), la
**durée de récupération**, et le repli courant avec le statut (« au sommet » ou « sous l'eau »).

> Comment lire : une volatilité élevée = des variations amples, donc un parcours plus nerveux. Le
> repli maximal répond à « quelle est la pire baisse que j'aurais traversée ? ».

### 7.3 — Ratios de risque ajusté

Trois ratios qui rapportent le rendement au risque pris :

- **Sharpe** : rendement excédentaire par unité de volatilité totale.
- **Sortino** : variante qui ne pénalise que la volatilité **à la baisse** (plus juste, car on ne
  reproche pas à un portefeuille de monter fort).
- **Calmar** : rendement annualisé rapporté au pire repli (affiché à partir d'un an).

> Plus ces ratios sont élevés, mieux le rendement a rémunéré le risque. Le **taux sans risque**
> utilisé est une hypothèse étiquetée (0 % par défaut, paramétrable).

### 7.4 — Comparaison au benchmark et mesures associées

- **Comparaison au benchmark** : votre TWR face au rendement d'un indice de référence (sélecteur
  SPY / QQQ / DIA) sur **la même fenêtre**, et l'**excès de rendement** (avez-vous battu l'indice ?).
- **Beta & corrélation** : par une régression statistique, le **beta** (votre portefeuille
  amplifie-t-il ou amortit-il les mouvements du marché ?) et la **corrélation** (bougez-vous dans le
  même sens que l'indice ?).
- **Ratios vs benchmark** : alpha de Jensen (sur/sous-performance ajustée du risque), tracking
  error (écart de trajectoire), information ratio, Treynor, et capture haussière/baissière (captez-
  vous les hausses sans subir toutes les baisses ?).

> Un **beta** de 1 = vous bougez comme le marché ; supérieur à 1 = plus volatil que lui ; inférieur
> = plus calme. Chaque mesure est masquée si les données ne permettent pas un calcul fiable.

### 7.5 — Valeur à risque (VaR / CVaR)

La **VaR** estime la perte que vous ne devriez pas dépasser, sur une période, avec un niveau de
confiance donné (95 % ou 99 %). La **CVaR** va plus loin : la perte **moyenne** dans les pires cas
(au-delà du seuil VaR). Deux méthodes sont fournies : paramétrique (gaussienne) et historique. La
base est « par période de la série » (les horizons fixes 1j/10j sont volontairement écartés car les
snapshots sont irréguliers). À lire comme une **estimation** de l'ampleur d'une mauvaise journée.

### 7.6 — Statistiques opérationnelles

Vos habitudes de gestion, dérivées du journal de transactions : taux de rotation (turnover), durée
de détention moyenne, hit ratio (proportion d'opérations gagnantes), ratio gain/perte moyen, et
yield-on-cost (rendement du dividende rapporté au prix d'achat). Les mesures de clôture restent
masquées tant qu'aucune vente n'a eu lieu.

### 7.7 — Rendements standards et distribution

Versions « portefeuille » des analyses vues en 3.14 ; on y retrouve la lecture des rendements par
période et leur distribution. Ils complètent les ratios en montrant la **forme** des rendements.

---

## Partie 8 — Construction de portefeuille et conformité

### 8.1 — Concentration et diversification

Mesure si votre portefeuille est trop concentré sur quelques positions. Affiche l'indice **HHI**
(Herfindahl-Hirschman), avec les bandes de référence standards, le **nombre effectif de positions**
(combien de lignes « vraiment » vous diversifient), la plus grosse position, le top-5, et la
répartition sectorielle. Une concentration élevée est signalée en ambre.

> Comment lire : un nombre effectif de positions de 4 alors que vous avez 20 lignes signifie que
> 4 positions pèsent l'essentiel — la diversification est plus apparente que réelle.

### 8.2 — Corrélation entre positions

Une carte de chaleur des corrélations entre vos positions (à quel point elles montent et descendent
ensemble), plus la corrélation moyenne et les paires la plus / la moins corrélées. Deux titres très
corrélés diversifient peu ; un titre faiblement (ou négativement) corrélé est un bon
diversificateur. Une cellule est masquée si les données communes sont insuffisantes.

### 8.3 — Rééquilibrage

À partir de **cibles** de pondération que vous définissez, le panneau calcule la **dérive** de
chaque position (poids actuel vs cible) et propose un ordre d'achat ou de vente en dollars pour
revenir à la cible. Un seuil de dérive élimine les micro-ajustements inutiles. « Hypothèse, pas un
conseil. »

### 8.4 — Conformité du mandat

Définissez des **règles** par mandat : poids maximum par titre, poids maximum par secteur, titres
exclus. Le panneau liste ensuite les **violations** courantes. C'est un contrôle **indicatif**
(affichage), il ne bloque pas l'ajout d'une position. Une règle non renseignée n'est pas évaluée.

### 8.5 — Fiscalité

- **Gains/pertes réalisés par année** : un état de type T5008 (Canada) / 1099-B (États-Unis),
  dérivé du journal de transactions, qui regroupe les ventes par **année fiscale** avec produit,
  coût, gain et durée de détention. Exportable en CSV. Le gain est présenté **brut** des frais
  (lesquels sont nettés au niveau de l'année), la méthode FIFO/LIFO est indiquée, et le panneau
  précise qu'un T5008 officiel peut différer (notamment du PBR/ACB canadien). « Pas un conseil
  fiscal. »
- **Retenue US sur dividendes** : pour les positions américaines détenues, applique la règle du
  traité fiscal Canada–États-Unis (15 %, avec exemption en REER/FERR, non récupérable en CELI,
  récupérable en compte imposable via crédit pour impôt étranger) aux dividendes réellement déclarés
  des 12 derniers mois. Donne le brut, la retenue et le net estimés.

---

## Partie 9 — Le simulateur de démonstration

### 9.1 — Principe

Le simulateur répond à « si j'avais investi tel montant à telle date, combien aujourd'hui ? » à
partir de l'**historique réel** des prix. C'est un outil de démonstration et de pédagogie, pas de
prédiction.

### 9.2 — Sur une valeur unique

La version intégrée à la fiche d'une valeur (3.13) : un montant, une date, et le résultat
(parts achetées, valeur finale, rendement total, CAGR) avec une courbe de croissance.

### 9.3 — Portefeuille de démonstration multi-positions

L'onglet **Démo** permet de composer un portefeuille fictif de plusieurs positions (chacune avec sa
date et son montant d'entrée), de projeter sa valeur agrégée dans le temps, et de la **comparer à un
benchmark** (S&P 500). Idéal pour illustrer une stratégie.

### 9.4 — Lecture honnête

Un **bandeau permanent** rappelle qu'il s'agit d'une hypothèse construite sur des données
factuelles, pas d'un conseil ni d'une garantie de résultat futur. Si la date demandée précède les
données disponibles (forfait gratuit ~18 mois), la simulation entre au premier point réel
disponible et le signale, plutôt que d'inventer un point de départ.

---

## Partie 10 — Surveillance et contexte marché

### 10.1 — Alertes configurables

Définissez des seuils (prix, variation, dérive) sur vos valeurs. Quand une cotation franchit un
seuil, l'alerte se déclenche. Les alertes sont conservées localement et évaluées à chaque
rafraîchissement de cotation.

### 10.2 — Alertes opérateur

Des avertissements **automatiques** générés par le logiciel : variation inhabituelle, dérive du
portefeuille, cotation périmée. Ils ne se configurent pas — ils vous signalent ce qui mérite votre
attention.

### 10.3 — État des fournisseurs de données

Un **healthcheck** des sources (Finnhub, Twelve Data, Stooq, taux FX…) : chaque capacité a sa sonde
indiquant si le service répond. Si une analyse manque de données, ce panneau aide à savoir si c'est
la source qui est en cause.

### 10.4 — Indicateurs macro

Le contexte économique général via la base FRED : taux directeur de la Fed, taux du Trésor US à 2 et
10 ans, spread 10 ans − 2 ans (un indicateur de récession quand il devient négatif), inflation US
(IPC sur un an) et taux directeur de la Banque du Canada. Une clé FRED gratuite (optionnelle) active
la donnée ; sans elle, l'état « indisponible » est affiché honnêtement.

---

## Partie 11 — Rapport de mandat

### 11.1 — Composition

L'onglet **Rapport** produit un document propre pour le **mandat actif** : sommaire (valeur, coût,
profit latent, métadonnées du mandat), positions détenues triées par valeur, TWR, gains réalisés par
année, et une comparaison au benchmark (S&P 500). L'attribution sectorielle Brinson est
explicitement absente et documentée comme bloquée faute de source factuelle (composition d'indice
non disponible en gratuit) — elle n'est pas fabriquée.

### 11.2 — Commentaire du gestionnaire

Vous pouvez ajouter des **notes datées** (texte) au rapport. L'éditeur n'apparaît pas à
l'impression ; seules les entrées datées s'impriment dans le document final.

### 11.3 — Export PDF

Le rapport s'exporte en PDF via la fonction **« Imprimer / Enregistrer en PDF »** du navigateur. La
mise en page est optimisée pour l'impression (l'interface de navigation est masquée). Vous obtenez
un PDF par mandat.

---

## Partie 12 — Personnalisation de l'espace de travail

L'onglet **Paramètres** est le cœur de la personnalisation. Tout panneau, sur la fiche d'une valeur
comme sur le tableau de bord, peut être composé à votre goût.

### 12.1 — Activer / désactiver les panneaux

Pour chaque surface (fiche valeur et tableau de bord), une liste de panneaux par catégorie avec un
interrupteur de visibilité. Masquer un panneau le retire immédiatement de l'affichage.

### 12.2 — Colonnage

Chaque panneau peut s'afficher sur **1 ou 2 colonnes**, pour densifier ou aérer la mise en page.

### 12.3 — Réorganisation par glisser-déposer

Réordonnez les panneaux à la souris (glisser-déposer), ou avec les boutons monter/descendre.
L'ordre est mémorisé.

### 12.4 — Agencement optimal automatique

Le bouton **« Agencement optimal »** range automatiquement les panneaux selon des règles sensées :
les indicateurs de pilotage en haut, le monitoring au milieu, les documents en bas. Instantané et
déterministe (pas d'attente, pas d'aléatoire).

### 12.5 — Profils intégrés

Quatre **profils** prêts à l'emploi, applicables en un clic, configurent d'un coup l'ensemble des
panneaux et leur disposition selon un style :

- **Vue d'ensemble** : panorama équilibré.
- **Value investor** : focalisé sur les fondamentaux et la valorisation.
- **Trader** : resserré sur le prix et la performance.
- **Conseiller client** : orienté présentation et reporting.

Un profil appliqué reste ensuite ajustable.

### 12.6 — Profils personnalisés

Vous pouvez **enregistrer** votre disposition courante comme profil nommé, l'**appliquer** plus tard
et le **supprimer**. Vos profils sont conservés localement.

### 12.7 — Thèmes visuels

Trois thèmes optionnels (**Matrix**, **Cyber**, **Clair**) en plus de l'apparence FIS par défaut.
Le choix est persistant. Ils ne modifient que les couleurs, pas l'organisation.

### 12.8 — Réinitialisation

Un bouton remet l'agencement aux valeurs par défaut, si vous voulez repartir de zéro.

---

## Partie 13 — Compte et confidentialité

### 13.1 — La page de connexion

FIS prévoit une couche de **comptes utilisateur** (page Connexion : inscription, connexion,
déconnexion) reposant sur Supabase. C'est une couche **additive et optionnelle** : par défaut elle
est **désactivée**, et la page n'apparaît que si l'application est configurée pour. Elle prépare les
usages multi-utilisateurs (cabinet, portail client) à venir.

### 13.2 — Où sont stockées vos données

Par défaut, **tout reste sur votre appareil**, dans le stockage local du navigateur (localStorage) :
positions, mandats, watchlists, journal, alertes, préférences. Il n'y a pas de compte ni de serveur
qui détient vos données. Conséquence pratique : vos données sont attachées à **ce** navigateur sur
**cet** appareil — pensez à exporter (4.6) pour les sauvegarder.

### 13.3 — Confidentialité et mentions légales (Loi 25)

L'onglet **Mentions légales** présente la politique de confidentialité rédigée d'après le
comportement réel de l'application (local-first, seuls des symboles boursiers transmis aux
fournisseurs de données nommés, aucun cookie de pistage). Un **bandeau de consentement** s'affiche à
la première visite ; il s'agit d'un avis de consentement éclairé conforme à la Loi 25 québécoise.
Les droits associés (accès, rectification, retrait, portabilité) et les recours sont documentés.

> Note : certaines informations légales (identité de l'exploitant, responsable de la protection des
> renseignements personnels) figurent en tant que champs « à compléter » explicites — le logiciel ne
> fabrique pas ces données.

---

## Partie 14 — Référence

### 14.1 — Récapitulatif des fonctions par onglet

- **Tableau de bord** : positions, top performances, risque, devises, et tous les panneaux de
  performance/risque/construction que vous activez.
- **Watchlist** : listes de surveillance nommées (multi-listes), indépendantes du portefeuille.
- **Démo** : simulateur what-if multi-positions vs benchmark.
- **Transactions** : journal des opérations, profit réalisé, lots.
- **Rapport** : document imprimable par mandat + commentaire daté.
- **Paramètres** : visibilité, colonnage, ordre, agencement, profils, thèmes.
- **Guide** : ce manuel dans l'application, aux trois niveaux de détail, imprimable.
- **Mentions légales** : confidentialité, consentement.
- **Connexion** : compte optionnel.
- **Fiche d'une valeur** (en cliquant un titre) : les seize panneaux d'analyse de la partie 3.

### 14.2 — Erreurs fréquentes et bonnes pratiques

- **« Un panneau est vide »** : souvent normal — soit la valeur n'est pas américaine (initiés, SEC),
  soit l'historique est trop court, soit la donnée n'existe pas chez la source. Le vide honnête est
  voulu ; vérifiez l'**État des fournisseurs** (10.3) en cas de doute.
- **« Mes données ont disparu »** : elles sont liées au navigateur/appareil. Changez d'appareil ou
  videz le cache et elles ne suivent pas. Exportez régulièrement (4.6).
- **Prendre une simulation pour une prédiction** : le simulateur illustre le passé, il ne prédit
  rien.
- **Confondre profit réalisé et latent** : seul le réalisé correspond à de l'argent encaissé.
- **Ne définir aucune cible** avant d'utiliser le rééquilibrage : sans cibles, le panneau ne peut
  rien proposer.

### 14.3 — Glossaire

- **Action / titre / valeur** : part de propriété d'une entreprise.
- **Symbole (ticker)** : code boursier d'une action.
- **CAGR** : taux de croissance annualisé moyen.
- **TWR** : rendement pondéré-temps (neutralise les apports/retraits).
- **MWR / IRR** : rendement pondéré-argent (tient compte du timing des flux).
- **Volatilité** : amplitude des variations (écart-type des rendements).
- **Drawdown (repli)** : baisse du sommet au creux.
- **Sharpe / Sortino / Calmar** : rendement rapporté au risque (total / à la baisse / au pire repli).
- **Benchmark** : indice de référence pour comparer (ex. S&P 500).
- **Beta** : sensibilité au marché (1 = comme le marché).
- **Alpha** : sur/sous-performance ajustée du risque.
- **VaR / CVaR** : perte estimée à ne pas dépasser / perte moyenne dans les pires cas.
- **HHI** : indice de concentration d'un portefeuille.
- **Dividende** : versement régulier d'une entreprise à ses actionnaires.
- **TTM** : douze derniers mois glissants.
- **EPS** : bénéfice par action.
- **P/E** : ratio cours / bénéfice.
- **DCF** : actualisation des flux de trésorerie (méthode de valorisation).
- **FIFO / LIFO** : règles d'appariement des ventes aux achats.
- **Profit réalisé / latent** : gain encaissé sur ventes / gain « sur papier » non vendu.
- **PBR / ACB** : prix de base rajusté (coût fiscal au Canada).
- **Snapshot** : photo quotidienne de la valeur du portefeuille.

---

*Fin du guide. Ce manuel décrit l'application telle qu'elle fonctionne réellement à la date
indiquée. Les fonctions marquées « optionnelles » ou « à compléter » le sont par conception, dans le
respect du principe de factualité de FIS : aucune donnée n'est inventée, aucun champ manquant n'est
comblé artificiellement.*
