# Simulation de portefeuille — Gear Code

## Contenu

- **gear_code_simulation_portefeuille_2015_2022.xlsx** : classeur d'analyse complet.
- **gear_code_transactions_app.csv** : format simplifié pour importer les événements.
- **gear_code_ledger_enrichi.csv** : grand livre enrichi avec trésorerie, positions et P&L FIFO.
- **gear_code_portfolio_simulation.json** : objet portefeuille complet avec métadonnées, transactions et positions finales.

## Hypothèses importantes

1. La période 2015 à 2022 inclusivement contient **8 années civiles**, même si elle est parfois appelée « sept ans » dans le langage courant.
2. Les apports externes totalisent exactement **100 000 CAD**.
3. Les prix sont **synthétiques mais calibrés à l'époque**. Ils ne doivent pas être présentés comme des clôtures historiques officielles.
4. Tous les prix et toutes les quantités sont **normalisés après les fractionnements connus jusqu'à la fin de 2022**. Il ne faut donc pas ajouter une seconde fois les fractionnements Apple, Tesla, NVIDIA, Alphabet, Amazon ou Shopify.
5. Les dividendes sont agrégés annuellement et servent surtout à tester les flux de trésorerie.
6. Le calcul du gain réalisé utilise la méthode **FIFO**.
7. Le solde de trésorerie reste toujours positif; la simulation n'utilise ni marge ni emprunt.

## Schéma principal

- `type`: `deposit`, `buy`, `sell`, `dividend`
- `price`: prix par action en USD pour les achats et ventes
- `fx_rate_to_cad`: conversion utilisée pour calculer la valeur CAD
- `cash_amount_cad`: montant des dépôts et dividendes
- `fees_cad`: commission de transaction
- `split_adjusted`: toujours `true` dans cette simulation

## Adaptation à un schéma minimal

Une application qui accepte seulement les champs `type`, `symbol`, `date`, `quantity` et `price` peut importer uniquement les lignes `buy` et `sell` du CSV simplifié. Les dépôts et dividendes devront alors être gérés dans un registre de flux distinct.
