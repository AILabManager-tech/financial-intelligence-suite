# Formation — prendre l'application en main

Formation progressive, du premier lancement aux fonctions avancées. Les modules marqués **(roadmap)** décrivent le produit cible ; ils ne sont pas encore actifs aujourd'hui.

> Fil rouge : tous les exemples utilisent le portefeuille de démonstration « Gear Code » (données simulées, clairement étiquetées).

---

## Démarrage rapide — votre premier résultat en 5 minutes

1. Sur le tableau de bord, dans la zone du portefeuille, cliquez sur **« Charger un portefeuille d'exemple (simulé) »**.
2. Observez le mandat « Gear Code » se charger : 13 positions valorisées, bandeau de performance reconstruite.
3. Faites défiler jusqu'aux panneaux de performance (TWR, Risque, Ratios) : ils s'affichent immédiatement.
4. Cliquez sur **Brief** pour voir la note de préparation de rencontre.
5. Cliquez sur **Rapport** pour voir le rapport de mandat prêt à remettre.

---

## Partie I — Modules fondamentaux

### M1 — Naviguer et choisir son thème
**Objectif :** vous déplacer dans l'application, adapter son apparence.
Dans l'en-tête, cliquez une section (Tableau de bord, Watchlist, Démo, Transactions, Rapport, Brief, Paramètres, Guide). À droite, choisissez un thème (FIS, Matrix, Cyber, Clair) — purement visuel, jamais un impact sur les données. Le thème « Clair » est optimisé pour l'impression.

### M2 — Gérer ses mandats (multi-portefeuilles)
**Objectif :** un portefeuille isolé par client.
Ouvrez le sélecteur de mandat dans l'en-tête → **Créer un mandat** → nom, client, devise de référence, date. Le mandat devient actif ; ses positions lui sont propres. Renommez ou supprimez depuis le même sélecteur.
> **Attention :** si des positions « manquent », vérifiez le mandat actif — les données sont cloisonnées par mandat.

### M3 — Rechercher un titre et lire sa fiche
**Objectif :** analyser un titre, chaque donnée sourcée.
Recherche marché → saisissez un symbole (ex. AAPL) → **Rechercher** → cliquez le bon marché. La fiche empile : cotation, fondamentaux (avec puce de source par champ), analyse Buffett, actualités, résultats, dividendes, analystes, dépôts SEC, initiés. « Fondamentaux indisponibles » = le fournisseur ne publie pas ce titre ; aucune valeur inventée.

### M4 — Constituer un portefeuille
**Objectif :** saisir ou importer des positions.
Section « Positions sauvegardées » → **Importer CSV** → choisir le fichier → vérifier l'aperçu (lignes reconnues / rejetées) → confirmer. Ou saisie manuelle (symbole, quantité, coût moyen, poids cible) → **Ajouter**. Exports CSV / JSON disponibles. Un import de positions donne une **photo** ; pour la performance, importez plutôt le journal (M5).

### M5 — Tenir le journal de transactions
**Objectif :** l'historique des opérations et les gains réalisés.
**Transactions** → **Importer CSV** (relevé FR ou EN) → aperçu → confirmer. Le moteur de lots FIFO calcule les gains réalisés et reconstruit la valeur.
> **Important :** triez le relevé du plus ancien au plus récent. Une date ambiguë (JJ/MM vs MM/JJ) ou un type inconnu est **rejeté** — l'outil ne devine jamais.

---

## Partie II — Modules intermédiaires

### M6 — Analyser la performance
**Objectif :** lire performance et risque, standards GIPS.
Tableau de bord → panneaux **TWR**, **MWR**, **Risque (volatilité & repli)**, **Ratios (Sharpe/Sortino/Calmar)**, **VaR**. Une note ambre signale une série reconstruite (factuelle mais rétrospective). « Série de valeur insuffisante » → importez le journal (M5) ou attendez l'accumulation.

### M7 — Comparer à un indice
**Objectif :** un excès de rendement défendable.
Panneau **Comparaison au benchmark** → choisir SPY / QQQ / DIA → lire portefeuille, indice, excès. La **source datée du prix de l'indice** est affichée sous le panneau. « n/d » = les séries ne se recouvrent pas (masqué, jamais inventé). Panneaux **Beta & corrélation** et **Ratios vs benchmark** pour alpha, tracking error, capture.

### M8 — Piloter risque, concentration et conformité
**Objectif :** repérer dérive et violation de contrainte.
Panneaux **Conformité du mandat** (règles poids max / exclusions, contrôle indicatif), **Rééquilibrage** (ordres vers les cibles), **Concentration & diversification**, **Exposition devises**, **Statistiques opérationnelles**, **Macro — taux & courbe** (FRED).

### M9 — Simuler et démontrer
**Objectif :** une démonstration what-if honnête.
Fiche titre → **Simulateur what-if** → montant + date → capital final, rendement total, CAGR, courbe. Section **Démo** pour un panier multi-positions vs indice. Bandeau permanent « hypothèse à partir de données factuelles, pas un conseil ».

### M10 — Personnaliser son espace
**Objectif :** composer votre tableau de bord.
**Paramètres** → basculez chaque panneau **Visible**/masqué, choisissez 1 ou 2 colonnes, réordonnez (glisser-déposer ou flèches). Profils préconfigurés (Vue d'ensemble, Value investor, Trader, Conseiller client), **Agencement optimal** (automatique), et enregistrement de profils personnalisés. Réglages conservés sur l'appareil.

---

## Partie III — Modules avancés

### M11 — Préparer une rencontre (Brief)
**Objectif :** une note de préparation en un clic.
**Brief** → renseignez la date de la dernière rencontre → sommaire (valeur, coût, P&L, positions) + section **Données absentes** (déclarées honnêtement) → **Copier le brief**. « Faits sourcés uniquement, aucune recommandation » : le jugement reste au planificateur.

### M12 — Produire un rapport de mandat
**Objectif :** un document client formel.
**Rapport** → vérifier l'en-tête (client, compte, devise, date) → sommaire, performance, positions → **Imprimer / PDF** → « Enregistrer en PDF ». Le bloc performance porte l'étiquette « série reconstruite » (scopée au seul bloc, pas au sommaire ni aux positions).

### M13 — Sujets de rencontre assistés par IA **(partiel)**
Requiert une clé de modèle configurée. Dans le Brief, la section « Sujets probables » liste des sujets **sélectionnés et cités** à partir d'articles fournis. Le modèle ne peut pas émettre de fait ; toute citation inconnue est jetée. Sans clé : section simplement absente, jamais une erreur.

### M14 — Agent de préparation (ligne de commande) **(partiel)**
Utilitaire hors application : exportez le mandat en JSON (M4), lancez l'agent en lui fournissant le fichier. Il explore l'actualité des titres **détenus uniquement** et renvoie un commentaire + la **trace complète** de ses consultations. L'agent commente, il ne calcule pas.

---

## Partie IV — Administration et cabinet **(roadmap)**

Ces modules décrivent l'étage multi-utilisateur du produit cible. Ils ne sont **pas actifs aujourd'hui** : l'application fonctionne en mode local mono-utilisateur, sans compte.

- **M15 — Comptes, connexion, sécurité d'accès :** écran de connexion, création d'accès, récupération de mot de passe, MFA.
- **M16 — Rôles et permissions :** Planificateur / Client (lecture seule) / Conformité / Administrateur ; portée par mandat.
- **M17 — Journal d'audit :** historique horodaté des modifications (avant/après), export conformité.
- **M18 — Multi-cabinet et portail client :** cabinets isolés, portail client en lecture seule d'un mandat.

---

## Partie V — Intégrations et automatisations

### M19 — Sources de données et fournisseurs
Panneau **Provenance & Fiabilité** → **État fournisseurs** : statut en direct de Finnhub, Twelve Data, Stooq, FRED, FX, avec latence. Premier réflexe de diagnostic quand une donnée manque. Les clés d'API se règlent dans l'environnement (hors interface, par l'administrateur).

### M20 — Alertes et automatisations
Panneau **Alertes configurables** → type (prix, variation, dérive) → symbole, seuil, note → **Ajouter**. Évaluées à chaque rafraîchissement des prix (côté navigateur ; gardez l'onglet ouvert). Alertes serveur, tâches planifiées et exports fiscaux (T5008 / 1099-B) : **roadmap**.

---

## Bonnes pratiques

- Un mandat par client (le rapport et le brief en dépendent).
- Importez le journal, pas seulement les positions (débloque la performance au jour 1).
- Citez toujours la source (la provenance par champ est là pour ça).
- Gardez l'étiquette « reconstruit » : elle protège votre crédibilité.
- Exportez régulièrement (CSV / JSON) : vos données sont locales, l'export est votre sauvegarde.
