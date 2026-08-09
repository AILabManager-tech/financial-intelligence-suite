# Théorie et méthodes de calcul

Cette section documente **la théorie derrière chaque chiffre de l'application** : la définition, la ou les formules, les **différentes méthodes de calcul** possibles, et la méthode retenue par Financial Intelligence Suite (FIS). Notation : `r` = rendement, `σ` = écart-type, `∏` = produit, `Σ` = somme, `√` = racine, `μ` = moyenne.

> Principe transversal : FIS ne calcule que sur des données réelles. Une fenêtre non couverte est **masquée**, jamais remplie de zéros. Une série reconstruite est **étiquetée** comme telle.

---

## 1. Rendements de base

### Définition
Le rendement mesure la variation de valeur d'un actif ou d'un portefeuille sur une période.

### Formules
- **Rendement simple (arithmétique)** : `r = (V_fin − V_début) / V_début`
- **Rendement logarithmique** : `r_log = ln(V_fin / V_début)`
- **Rendement cumulé** sur n périodes : `R = ∏(1 + rᵢ) − 1`
- **Rendement annualisé (CAGR)** : `CAGR = (V_fin / V_début)^(1/années) − 1`

### Méthodes alternatives
Le rendement **simple** s'additionne mal dans le temps mais se moyenne bien sur des actifs (portefeuille) ; le rendement **logarithmique** s'additionne dans le temps mais pas sur les actifs. La finance de portefeuille utilise le simple pour l'agrégation transversale et le chaînage multiplicatif pour le temps.

### Comment FIS le calcule
Rendements **simples** chaînés multiplicativement (`returnsCalculator.js`). Le CAGR est masqué tant que la série ne couvre pas au moins un an. Matrice par période (1M, 3M, 6M, AAC, 1A, 3A, origine) : chaque cellule est masquée si la période dépasse l'historique disponible.

---

## 2. Rendement pondéré dans le temps — TWR (Time-Weighted Return)

### Définition
Rendement qui **neutralise l'effet des apports et retraits de capital**. Il mesure la performance du *gérant*, indépendamment du calendrier des flux du client. C'est la mesure de référence GIPS.

### Formule
On découpe la période à chaque flux, on calcule le rendement de chaque **sous-période**, puis on les chaîne :

```
r_sous-période = (V_fin − flux) / V_début − 1
TWR = ∏(1 + r_sous-période) − 1
TWR_annualisé = (1 + TWR)^(365 / jours) − 1
```

### Méthodes alternatives
- **True Time-Weighted** (revalorisation à chaque flux) — la plus exacte, exige une valeur à chaque date de flux.
- **Modified Dietz** — approxime le TWR avec une pondération temporelle des flux, sans valorisation quotidienne.
- **Simple Dietz** — pondère les flux à 50 % de la période.

### Comment FIS le calcule
True Time-Weighted (`computeTimeWeightedReturn` + `computeSubPeriodReturns`) : chaînage des rendements de sous-période entre snapshots journaliers, flux buy/sell neutralisés (supposés en début de sous-période). Annualisé seulement si la série couvre ≥ 1 an. Hors dividendes en espèces.

---

## 3. Rendement pondéré par l'argent — MWR / IRR (Money-Weighted Return)

### Définition
Rendement qui **tient compte du calendrier et de la taille des flux**. Il mesure l'expérience réelle du *client* (l'effet « timing »). C'est le taux de rendement interne (TRI / IRR) des flux.

### Formule
On cherche le taux `d` qui annule la valeur actuelle nette des flux datés :

```
0 = Σ  Fₜ / (1 + d)^(tₙ)      où Fₜ = flux à la date t
```

Flux investisseur : `−V_début`, `−apport`, `+retrait`, `+V_fin`.

### Méthodes alternatives
- **Newton-Raphson** — convergence rapide, sensible au point de départ.
- **Bisection** — robuste, plus lente, garantie de converger si un changement de signe existe.
- **XIRR** — IRR sur flux à dates irrégulières (le cas réel d'un portefeuille).

### Comment FIS le calcule
`computeMoneyWeightedReturn` : Newton-Raphson sur les flux datés, avec **repli par bisection** si Newton ne converge pas. Le MWR de période est toujours donné ; l'IRR annualisé n'est affiché que si la série ≥ 1 an. Masqué si aucune convergence (jamais un chiffre inventé). Comparer TWR (effet gérant) et MWR (effet timing du client) éclaire la différence.

---

## 4. Volatilité

### Définition
Dispersion des rendements autour de leur moyenne ; proxy usuel du risque.

### Formule
Écart-type d'échantillon, puis annualisation :

```
σ_période = √( Σ(rᵢ − μ)² / (n − 1) )
σ_annualisée = σ_période × √(365 / durée_moyenne_jours)
```

### Méthodes alternatives
- **Échantillon (n−1)** vs **population (n)** — l'échantillon est non biaisé pour un historique fini.
- **Annualisation** : `×√(365 / espacement moyen en jours calendaires)`, c'est-à-dire √(nombre de sous-périodes réellement observées par an). Les deux termes partagent la même unité — mettre 252 (jours de bourse) au numérateur d'un espacement calendaire sous-estimait toute volatilité annualisée d'environ 15 %. La formule reste juste dans les deux régimes : une série de jours de bourse rend ~261 périodes/an (la convention √252 aux fériés près), une série calendaire 7 j/7 rend 365, ce qui compense exactement les week-ends à rendement nul.
- **EWMA / GARCH** — volatilité conditionnelle qui pondère davantage le passé récent (non utilisé ici).

### Comment FIS le calcule
`computePortfolioRisk` : écart-type **d'échantillon** des rendements de sous-période flux-neutralisés, annualisé par `×√(365 / jours moyens)` pour tenir compte de l'espacement réel des points. Fenêtre = origine tant que la série est jeune.

---

## 5. Repli maximal (Maximum Drawdown)

### Définition
Plus forte baisse du **sommet au creux** sur la période, et durée pour récupérer le sommet.

### Formule
```
Drawdownₜ = (Vₜ − max(V₀..Vₜ)) / max(V₀..Vₜ)
MaxDrawdown = min(Drawdownₜ)
```

### Comment FIS le calcule
`computePortfolioRisk` : repli maximal pic→creux avec ses dates, durée de récupération, plus le repli **courant** et le statut (récupéré / sous l'eau). Disponible aussi au niveau de l'actif (`DrawdownPanel`) à partir de `/api/history`.

---

## 6. Ratios de rendement ajusté au risque

### Définitions et formules
- **Sharpe** — excès de rendement par unité de volatilité totale :
  `Sharpe = (R − R_f) / σ`
- **Sortino** — comme Sharpe, mais ne pénalise que la volatilité **à la baisse** :
  `Sortino = (R − R_f) / σ_downside`  où `σ_downside = √(Σ min(rᵢ − R_f, 0)² / n)`
- **Calmar** — rendement annualisé rapporté au repli maximal :
  `Calmar = R_annualisé / |MaxDrawdown|`

### Méthodes alternatives
Le taux sans risque `R_f` peut être 0, un taux monétaire, ou le taux des bons du Trésor. Le Sortino peut utiliser un seuil (MAR) différent de `R_f`.

### Comment FIS le calcule
`computePortfolioRatios` : Sharpe = excès/σ ×√périodes ; Sortino = excès/déviation à la baisse ; Calmar = rendement annualisé / |repli max| (gated ≥ 1 an). Le **taux sans risque est une hypothèse étiquetée** (défaut 0 %).

---

## 7. Valeur à risque — VaR et CVaR

### Définition
La **VaR** au seuil α est la perte que l'on ne dépasse qu'avec probabilité (1 − α) sur une période. La **CVaR** (Expected Shortfall) est la perte *moyenne* au-delà de la VaR.

### Formules
- **VaR paramétrique (gaussienne)** : `VaR_α = μ − z_α · σ`  (z₉₅ ≈ 1,645 ; z₉₉ ≈ 2,326)
- **VaR historique** : le quantile (1 − α) empirique des rendements observés.
- **CVaR** : `CVaR_α = moyenne des rendements ≤ VaR_α`

### Méthodes alternatives
- **Paramétrique** — suppose une loi normale ; rapide, sous-estime les queues épaisses.
- **Historique** — sans hypothèse de loi ; exige assez d'observations.
- **Monte-Carlo** — simule des scénarios ; coûteux (non utilisé ici).

### Comment FIS le calcule
`computeValueAtRisk` : VaR **paramétrique** toujours ; VaR + CVaR **historiques** dès 10 observations ; seuils 95 % et 99 %, sur les rendements flux-neutralisés. Base « par période » (les périodes étant irrégulières, FIS n'affiche pas de fausse VaR « 1 jour / 10 jours »).

---

## 8. Comparaison à un indice (benchmark)

### Définition
Situer la performance du portefeuille face à un indice de référence (S&P 500, Nasdaq 100, Dow Jones) sur la **même fenêtre**.

### Formule
```
Excès = TWR_portefeuille − Rendement_prix_indice
```

### Comment FIS le calcule
`computeBenchmarkComparison` : TWR du portefeuille vs rendement de **prix** de l'indice (hors dividendes réinvestis) sur l'intervalle commun. Clôture on-or-before la date cible. **Masqué (n/d)** si la série de l'indice ne couvre pas la période. Le prix de l'indice est **sourcé et daté** dans le rendu (`BenchmarkSourceNote`, ex. « prix SPY : twelvedata.com, série jusqu'au JJ »).

---

## 9. Beta, corrélation et ratios étendus

### Définitions et formules
- **Beta** (sensibilité au marché) par régression OLS :
  `β = Cov(r_p, r_b) / Var(r_b)`
- **Corrélation de Pearson** : `ρ = Cov(r_p, r_b) / (σ_p · σ_b)`
- **R²** = ρ² (part de variance expliquée par l'indice).
- **Alpha de Jensen** : `α = R_p − [R_f + β(R_b − R_f)]`
- **Tracking error** : `TE = σ(r_p − r_b)` (annualisée).
- **Information ratio** : `IR = (R_p − R_b) / TE`
- **Treynor** : `(R_p − R_f) / β`
- **Up / Down capture** : rendement du portefeuille les périodes de hausse (resp. baisse) de l'indice, rapporté à celui de l'indice.

### Méthodes alternatives
Corrélation de **Pearson** (linéaire) vs **Spearman** (rangs, robuste aux valeurs extrêmes). FIS utilise Pearson.

### Comment FIS le calcule
`computeBenchmarkStats` / `pairBenchmarkReturns` : apparie les rendements de sous-période du portefeuille au prix de l'indice sur le même intervalle, régression OLS → beta, corrélation, R². Alpha annualisé, TE annualisée, IR, Treynor, up/down capture ; `null` si le dénominateur est nul (jamais forcé). Matrice de corrélation **inter-positions** disponible séparément.

---

## 10. Distribution des rendements

### Définitions et formules
- **% de mois positifs**, meilleur / pire mois.
- **Asymétrie (skewness g1)** : `g1 = (1/n) Σ((rᵢ − μ)/σ)³` — signe de l'asymétrie de la distribution.
- **Aplatissement excédentaire (kurtosis g2)** : `g2 = (1/n) Σ((rᵢ − μ)/σ)⁴ − 3` — épaisseur des queues (0 = loi normale).

### Comment FIS le calcule
`computeDistribution` : part de mois positifs, moyenne, écart-type d'échantillon, skewness g1, kurtosis excédentaire g2 (`null` si σ = 0 ou n < 3), histogramme en 8 tranches dont la somme égale le nombre de mois.

---

## 11. Reconstruction factuelle de la série de valeurs

### Définition
Au démarrage à froid (journal importé mais pas encore de relevés accumulés), FIS **reconstruit** la série de valeurs pour allumer la performance dès le jour 1.

### Formule
```
Valeur(t) = Σ  quantité_détenue(symbole, t) × clôture_réelle(symbole, t)
```

### Comment FIS le calcule
`reconstructSnapshots` : rejoue les quantités détenues depuis le journal de transactions × **clôtures historiques réelles** (`closeOnOrBefore`). C'est de l'arithmétique sur **deux jeux de données réels**, pas une fabrication. Règle stricte : un jour où un titre détenu n'a **aucune** clôture au ou avant est **omis, jamais interpolé**. La série reconstruite est de même forme que l'accrual et étiquetée « factuelle mais rétrospective ». Dès qu'il existe ≥ 2 relevés accumulés réels, ils priment.

---

## 12. Lots fiscaux et gains réalisés (FIFO)

### Définition
À la vente, il faut apparier les titres vendus à des lots d'achat pour calculer le gain/perte réalisé et la base de coût.

### Méthodes alternatives
- **FIFO** (premier entré, premier sorti) — méthode par défaut, souvent exigée fiscalement.
- **LIFO** (dernier entré, premier sorti).
- **Coût moyen** — un seul coût moyen pondéré.
- **Spécifique** — le gérant choisit les lots.

### Comment FIS le calcule
`lotEngine.js` (`applyTransactions`) : moteur **FIFO** (LIFO disponible), gains réalisés par lot, frais imputés, dividendes et survente gérés. Alimente les gains/pertes réalisés par année fiscale et les statistiques opérationnelles (rotation, hit ratio, détention moyenne, rendement sur coût). Trie chronologiquement les transactions avant appariement.

---

## 13. Concentration et diversification

### Définitions et formules
- **Indice de Herfindahl-Hirschman (HHI)** : `HHI = Σ wᵢ²` (wᵢ = poids de la position). Élevé = concentré.
- **Nombre effectif de positions** : `1 / HHI`.
- Plus grosse position, poids du top-5, dispersion sectorielle.

### Comment FIS le calcule
Panneau dérivé des positions (valeur de marché) : HHI, nombre effectif, plus grosse position, top-5, spread sectoriel. Aucun appel réseau.

---

## 14. Conformité et rééquilibrage

### Définitions
- **Conformité** : contrôle des contraintes (poids max par titre, par secteur, exclusions), pondéré par la valeur de marché.
- **Rééquilibrage** : écart entre poids réel et **poids cible**, puis ordres d'achat/vente pour rejoindre la cible.

### Comment FIS le calcule
`checkCompliance` : contrôle **indicatif** (affiche les violations, ne bloque pas). Une règle absente n'est pas évaluée. `computeRebalance` : dérive vs `targetWeight`, ordre en $, seuil de dérive servant de proxy de coûts (supprime les micro-ajustements). « Hypothèse, pas un conseil ».

---

## 15. Multi-devises (FX)

### Définition
Convertir valeur, coût et P&L de la devise de cotation vers la **devise de référence** du mandat.

### Comment FIS le calcule
`fx.js` : taux quotidiens via Frankfurter (BCE), repli exchangerate.host. Chaque position porte sa devise native. Valeur masquée si le taux manque (jamais converti au hasard). Source et date affichées.

---

## 16. Analyse Buffett — valeur intrinsèque par DCF

### Définition
Estimer la **valeur intrinsèque** d'une action par actualisation des flux de trésorerie disponibles futurs, puis comparer au prix pour une **marge de sécurité**.

### Formule (modèle de croissance actualisée)
```
Valeur_intrinsèque ≈ Σ  FCFₜ / (1 + r)^t  +  Valeur_terminale
Marge_de_sécurité = (Valeur_intrinsèque − Prix) / Prix
```
avec `r` = taux d'actualisation, `g` = taux de croissance.

### Méthodes alternatives
- **DCF à deux étages** (croissance forte puis stable).
- **Gordon-Shapiro** (dividendes) : `V = D / (r − g)`.
- **Multiples comparables** (P/E, P/FCF sectoriels).

### Comment FIS le calcule
`buffettReadiness.js` : valeur intrinsèque + marge de sécurité + score /6 (6 critères : ROE, croissance BPA 5 ans, dette/capitaux, price/FCF, etc.) + signal, à partir des fondamentaux réels (Finnhub). Curseurs `r` (actualisation) et `g` (croissance) pour tester la sensibilité. Décomposition mathématique affichée (KaTeX). Une valeur négative de marge = « signal défavorable ».

---

## 17. Provenance par champ (le modèle de factualité)

### Définition
Chaque indicateur porte sa propre provenance, pas une source globale par panneau.

### Structure
```
champ = { value, source, asOf }
```

### Comment FIS l'applique
Un champ dont `value` est absente n'est **pas affiché**. La source (ex. `finnhub.io`, `twelvedata.com`, `fred.stlouisfed.org`) et la date (`asOf`) accompagnent chaque KPI. C'est ce qui permet, devant un client, de répondre à « d'où vient ce chiffre ? » — et ce qui distingue FIS d'un terminal générique.

---

## Cache et fraîcheur des données

FIS ajuste la durée de cache à la volatilité de chaque donnée : cotations 20 s, actualités 30 min, fondamentaux 6 h, résultats 6 h, dividendes 24 h, historique 6 h, recherche 10 min, état de santé 60 s. Côté client, un `AbortController` annule les requêtes obsolètes au changement de symbole.
