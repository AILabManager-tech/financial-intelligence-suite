# User Guide — Financial Intelligence Suite
### Aide-mémoire

> Référence rapide, sous forme de tableaux. Pour les explications complètes, voir la
> [version détaillée](./USER_GUIDE.md).
> Statut : **bêta** · Version : 2026-06-03 · App : https://devlabai.tech

---

## Les 8 onglets

| Onglet | Pour quoi faire |
|---|---|
| **Tableau de bord** (`/`) | Vue d'ensemble du mandat, panneaux personnalisables |
| **Watchlist** (`/watchlist`) | Listes de surveillance nommées (sans détenir les titres) |
| **Démo** (`/demo`) | Simulateur « et si j'avais investi… », multi-positions vs benchmark |
| **Transactions** (`/transactions`) | Journal achats / ventes / dividendes / frais |
| **Rapport** (`/report`) | Document imprimable (PDF) par mandat |
| **Paramètres** (`/settings`) | Visibilité, ordre, colonnage, profils, thèmes |
| **Mentions légales** (`/legal`) | Confidentialité, consentement (Loi 25) |
| **Connexion** (`/login`) | Compte optionnel (désactivé par défaut) |

> Cliquer sur un titre ouvre sa **fiche** : tous les panneaux d'analyse de cette valeur.

---

## « Je veux… → où aller »

| Objectif | Chemin |
|---|---|
| Trouver une compagnie | Barre de recherche → taper nom ou symbole |
| Suivre une valeur sans la détenir | L'ajouter à une **Watchlist** |
| Enregistrer ce que je possède | **Tableau de bord** → ajouter une position (quantité + prix) |
| Importer depuis mon courtier | Portefeuille → **Import CSV** (mapping auto + aperçu) |
| Sauvegarder mes données | **Export CSV / JSON** |
| Noter mes achats/ventes | Onglet **Transactions** |
| Voir mon vrai gain/perte | Transactions → profit **réalisé** ; positions → profit **latent** |
| Comparer au marché | Panneau **Comparaison au benchmark** (SPY/QQQ/DIA) |
| Tester un scénario passé | **Démo** (multi-titres) ou simulateur dans la fiche (1 titre) |
| Produire un rapport client | Onglet **Rapport** → commentaire daté → Imprimer/PDF |
| Réorganiser mon espace | **Paramètres** → toggles / glisser-déposer / Agencement optimal |
| Repartir à zéro | Paramètres → **Réinitialiser** |

---

## Fiche d'une valeur — 16 panneaux

| Panneau | Donne | Source |
|---|---|---|
| Cotation live | Prix actuel + variation du jour (maj ~20 s, alerte si périmé) | Finnhub / Stooq |
| Graphique + période | Courbe, fenêtres 1J→5A | Twelve Data |
| Fondamentaux | Cap., P/E, EPS, revenus, marges, bêta, secteur | Finnhub |
| Recommandations analystes | Consensus + tendance 6 mois | Finnhub |
| Actualités | Nouvelles ~14 jours (lien externe) | Finnhub |
| Calendrier des résultats | Dates passées/à venir + surprise EPS | Finnhub |
| Historique des dividendes | 5 ans + total TTM | Finnhub→AlphaV→Twelve |
| Dépôts SEC | Documents officiels groupés + PDF | Finnhub |
| Cotation canadienne | Place (TSX/.V/.CN/.NE) + devise CAD | Déterministe (suffixe) |
| Comparaison sectorielle | Pairs + cotation + écart % | Finnhub |
| Transactions d'initiés | Achats/ventes des dirigeants (SEC 3/4/5) | Finnhub (US) |
| Sentiment des initiés (MSPR) | Accumulation/distribution mensuelle | Finnhub (US) |
| Analyse Buffett (DCF) | Valeur intrinsèque + marge de sécurité + 6 critères | Finnhub |
| Journal d'investissement | Thèse, conviction, cible, stop, revue (saisi) | Local |
| Simulateur what-if | « M investi à D → valeur aujourd'hui » | Twelve Data |
| Rendements / distribution / repli | Périodes, % mois +, drawdown du titre | Twelve Data |

---

## Tableau de bord — panneaux par catégorie

**Vue d'ensemble / positions**

| Panneau | Donne |
|---|---|
| Top performances | Qui monte / descend le plus |
| Gestionnaire de positions | Liste complète + valeur + profit latent |
| Centre de risque | Synthèse des signaux de risque |
| Badge d'intégrité | Fiabilité des données affichées |
| Exposition devises | Répartition par devise (taux ECB) |
| Concentration & diversification | HHI, nb effectif de positions, top-5 |
| Corrélation des positions | Heatmap : titres qui bougent ensemble |
| Conformité du mandat | Violations vs règles (max titre/secteur, exclusions) |
| Rééquilibrage | Ordres pour revenir aux cibles |
| Gains/pertes par année | État fiscal T5008/1099-B + export CSV |
| Retenue US sur dividendes | Brut/retenue/net (traité Canada-US 15 %) |
| Statistiques opérationnelles | Rotation, détention, hit ratio, yield-on-cost |

**Performance / risque** *(basés sur les snapshots quotidiens du portefeuille)*

| Panneau | Donne | Lecture rapide |
|---|---|---|
| TWR | Rendement hors apports/retraits | Effet **gérant** |
| MWR / IRR | Rendement vécu (timing inclus) | Effet **client** |
| Risque (vol & repli) | Volatilité + pire baisse + récupération | Nervosité du parcours |
| Ratios ajustés | Sharpe / Sortino / Calmar | Plus haut = mieux payé pour le risque |
| Comparaison benchmark | Excès vs SPY/QQQ/DIA | Ai-je battu l'indice ? |
| Beta & corrélation | Sensibilité au marché | 1 = comme le marché |
| Ratios vs benchmark | Alpha, tracking error, IR, Treynor, capture | Qualité vs indice |
| Valeur à risque (VaR/CVaR) | Perte estimée à 95 %/99 % | Ampleur d'une mauvaise période |

**Monitoring**

| Panneau | Donne |
|---|---|
| Alertes configurables | Seuils prix/variation/drift définis par vous |
| Alertes opérateur | Avertissements automatiques (variation, drift, stale) |
| État des fournisseurs | Healthcheck des sources de données |
| Macro — taux & courbe | Fed, Trésor 2/10 ans, spread, inflation, BdC (FRED) |

---

## Personnalisation (Paramètres)

| Action | Effet |
|---|---|
| Toggle visibilité | Afficher/masquer un panneau |
| Colonnage 1/2 | Densifier ou aérer |
| Glisser-déposer | Réordonner |
| Agencement optimal | Rangement auto (pilotage haut, docs bas) |
| Profils intégrés | Vue d'ensemble · Value · Trader · Conseiller |
| Profils personnalisés | Sauvegarder/appliquer/supprimer son agencement |
| Thèmes | Matrix · Cyber · Clair (couleurs seulement) |
| Réinitialiser | Retour aux valeurs par défaut |

---

## Glossaire express

| Terme | En une ligne |
|---|---|
| Action / titre | Part de propriété d'une entreprise |
| Symbole (ticker) | Code boursier (AAPL, MSFT) |
| CAGR | Taux de croissance annualisé moyen |
| TWR / MWR | Rendement hors flux / rendement vécu (timing inclus) |
| Volatilité | Amplitude des variations |
| Drawdown | Baisse du sommet au creux |
| Sharpe / Sortino / Calmar | Rendement vs risque (total / baisse / pire repli) |
| Benchmark | Indice de référence (ex. S&P 500) |
| Beta / Alpha | Sensibilité au marché / sur-performance ajustée |
| VaR / CVaR | Perte à ne pas dépasser / perte moyenne des pires cas |
| HHI | Indice de concentration |
| Dividende / TTM | Versement aux actionnaires / 12 derniers mois |
| EPS / P/E | Bénéfice par action / cours sur bénéfice |
| FIFO / LIFO | Règles d'appariement vente↔achat |
| Réalisé / latent | Gain encaissé / gain « sur papier » |
| Snapshot | Photo quotidienne de la valeur du portefeuille |

---

## À garder en tête

- **Aucune donnée inventée.** Un panneau vide = donnée absente (souvent normal : titre non
  américain pour les initiés/SEC, historique trop court, ou source muette). Vérifier l'**État des
  fournisseurs** en cas de doute.
- **Données locales.** Tout est stocké dans ce navigateur, sur cet appareil. Pas de compte par
  défaut → **exporter** régulièrement pour sauvegarder.
- **Jamais un conseil.** Cibles, simulations, ratios = repères factuels, pas des recommandations.
- **Réalisé ≠ latent.** Seul le profit réalisé est de l'argent effectivement encaissé.
