// Déclaratif — profils de démo (faux clients) pour tester l'UI selon le type de
// compte / la composition. ÉDITABLE À LA MAIN sans toucher à la logique : changer
// une date, un ticker, une quantité ou un prix se reflète au prochain seed.
//
// Forme d'un profil (aligné sur le schéma réel — le code fait foi) :
//   {
//     id: "demo-...",            // PRÉFIXE "demo-" obligatoire (tag de reset)
//     name, client,
//     accountType: "taxable" | "rrsp" | "tfsa",   // ACCOUNT_TYPES réels
//     baseCurrency: "USD" | "CAD",
//     dateDebut: "YYYY-MM-DD",   // défaut appliqué aux transactions sans `date`
//     prixCourant?: { SYMBOLE: prix },   // prix de référence STATIQUE par titre
//     transactions: [ { type, symbol, date?, quantity?, price?, fee?, amount? } ]
//   }
//
// `prixCourant` : prix de référence statique pour les titres que le free tier ne
//   cote pas (typiquement les `.TO` canadiens). Sans lui, la position reste à
//   `price: 0` → valeur 0 et faux P&L −100 %. Avec lui, la fiche affiche une
//   valeur plausible ; une cotation live, quand elle existe (titres US), écrase
//   ce prix au montage. Quand elle n'existe pas, le merge étiquette « données
//   statiques conservées » — donc jamais présenté comme une cotation live.
//   Clés en MAJUSCULES (symbole normalisé). Démo dev-only : non visible en prod.
//
// Transaction (transactionStore) : type ∈ buy|sell|dividend|fee ;
//   buy/sell → quantity + price (+ fee) ; dividend/fee → amount.
//   `date` omise → dateDebut du profil. `price` omis → résolu via l'historique
//   (resolver), sinon utilisé tel quel. Ici les prix sont FOURNIS (déterminisme +
//   pas de dépendance réseau ; dates anciennes non couvertes par le free tier).

import { buildGeneratedProfiles } from "./profileGenerators";
import { GEAR_CODE_TRANSACTIONS, GEAR_CODE_REF_PRICES, GEAR_CODE_END_DATE } from "./gearCodeSimulation";

export const DEMO_PREFIX = "demo-";

// Hand-declared profiles (realistic small portfolios + edge cases).
const DECLARED_PROFILES = [
  // 1 — Sur-concentration tech → teste Concentration & diversification.
  {
    id: "demo-marc-tremblay",
    name: "Marc Tremblay — Tech concentré",
    client: "Marc Tremblay",
    accountType: "tfsa",
    baseCurrency: "USD",
    dateDebut: "2024-02-12",
    transactions: [
      { type: "buy", symbol: "AAPL", date: "2024-02-12", quantity: 120, price: 184.4 },
      { type: "buy", symbol: "MSFT", date: "2024-03-04", quantity: 60, price: 414.9 },
      { type: "buy", symbol: "NVDA", date: "2024-05-20", quantity: 90, price: 95.0 },
      { type: "buy", symbol: "GOOGL", date: "2024-06-18", quantity: 80, price: 175.4 },
    ],
  },

  // 2 — Dividendes canadiens → teste Gains/pertes annuels + flux dividendes.
  {
    id: "demo-sophie-belanger",
    name: "Sophie Bélanger — Dividendes CA",
    client: "Sophie Bélanger",
    accountType: "rrsp",
    baseCurrency: "CAD",
    dateDebut: "2024-01-10",
    // Prix de référence statiques (TSX non couvert par le free tier de cotation).
    prixCourant: { "RY.TO": 178.0, "TD.TO": 92.0, "ENB.TO": 62.0, "BCE.TO": 33.0 },
    transactions: [
      { type: "buy", symbol: "RY.TO", date: "2024-01-10", quantity: 100, price: 132.5 },
      { type: "buy", symbol: "TD.TO", date: "2024-01-10", quantity: 150, price: 81.2 },
      { type: "buy", symbol: "ENB.TO", date: "2024-02-15", quantity: 300, price: 47.1 },
      { type: "buy", symbol: "BCE.TO", date: "2024-03-01", quantity: 120, price: 53.4 },
      { type: "dividend", symbol: "RY.TO", date: "2024-05-24", amount: 138.0 },
      { type: "dividend", symbol: "TD.TO", date: "2024-04-30", amount: 153.0 },
      { type: "dividend", symbol: "ENB.TO", date: "2024-06-01", amount: 274.5 },
      { type: "dividend", symbol: "BCE.TO", date: "2024-07-15", amount: 119.7 },
    ],
  },

  // 3 — Growth volatil + une vente partielle → teste Centre de risque + P&L réalisé.
  {
    id: "demo-liam-cote",
    name: "Liam Côté — Growth volatil",
    client: "Liam Côté",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: "2024-03-01",
    transactions: [
      { type: "buy", symbol: "TSLA", date: "2024-03-01", quantity: 40, price: 201.5 },
      { type: "buy", symbol: "PLTR", date: "2024-04-10", quantity: 300, price: 22.3 },
      { type: "buy", symbol: "COIN", date: "2024-05-02", quantity: 50, price: 215.0 },
      { type: "buy", symbol: "MSTR", date: "2024-06-12", quantity: 25, price: 148.0 },
      { type: "sell", symbol: "COIN", date: "2024-09-18", quantity: 25, price: 268.0, fee: 4.95 },
    ],
  },

  // 4 — Indiciel DCA étalé → teste Performance pondérée-temps vs S&P 500.
  {
    id: "demo-nadia-khaled",
    name: "Nadia Khaled — Indiciel DCA",
    client: "Nadia Khaled",
    accountType: "rrsp",
    baseCurrency: "USD",
    dateDebut: "2024-01-05",
    transactions: [
      { type: "buy", symbol: "VOO", date: "2024-01-05", quantity: 20, price: 436.0 },
      { type: "buy", symbol: "VOO", date: "2024-04-05", quantity: 18, price: 472.0 },
      { type: "buy", symbol: "VOO", date: "2024-07-05", quantity: 16, price: 503.0 },
      { type: "buy", symbol: "VTI", date: "2024-02-20", quantity: 30, price: 245.0 },
      { type: "buy", symbol: "QQQ", date: "2024-03-15", quantity: 25, price: 438.0 },
    ],
  },

  // 5 — Trader actif, lots multiples + ventes partielles + rachat → teste FIFO/LIFO.
  {
    id: "demo-julien-roy",
    name: "Julien Roy — Trader actif",
    client: "Julien Roy",
    accountType: "tfsa",
    baseCurrency: "CAD",
    dateDebut: "2024-01-08",
    // Prix de référence statiques (TSX non couvert par le free tier de cotation).
    prixCourant: { "SHOP.TO": 165.0, "AC.TO": 22.0 },
    transactions: [
      { type: "buy", symbol: "SHOP.TO", date: "2024-01-08", quantity: 100, price: 105.0, fee: 9.95 },
      { type: "buy", symbol: "SHOP.TO", date: "2024-02-20", quantity: 100, price: 92.0, fee: 9.95 },
      { type: "sell", symbol: "SHOP.TO", date: "2024-04-15", quantity: 120, price: 118.0, fee: 9.95 },
      { type: "buy", symbol: "SHOP.TO", date: "2024-06-10", quantity: 80, price: 88.0, fee: 9.95 },
      { type: "buy", symbol: "AC.TO", date: "2024-01-22", quantity: 500, price: 18.4, fee: 9.95 },
      { type: "sell", symbol: "AC.TO", date: "2024-03-28", quantity: 200, price: 19.9, fee: 9.95 },
      { type: "sell", symbol: "AC.TO", date: "2024-05-30", quantity: 150, price: 16.2, fee: 9.95 },
      { type: "buy", symbol: "AC.TO", date: "2024-08-14", quantity: 300, price: 15.1, fee: 9.95 },
    ],
  },

  // 6 — EDGE : vide → empty states.
  {
    id: "demo-edge-vide",
    name: "EDGE — Vide",
    client: "—",
    accountType: "tfsa",
    baseCurrency: "USD",
    dateDebut: "2024-01-01",
    transactions: [],
  },

  // 7 — EDGE : 100% perte (achats au sommet 2021) → P&L latent négatif, formatage.
  {
    id: "demo-edge-perte",
    name: "EDGE — 100% perte",
    client: "—",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: "2021-11-01",
    // Prix de référence statiques (2026) bien sous le sommet 2021 → P&L latent et
    // performance fortement négatifs (l'intention du cas limite). Évite aussi le
    // faux −100 % si la cotation live d'un de ces titres ne résout pas.
    prixCourant: { PYPL: 71.0, INTC: 21.0, BABA: 82.0 },
    transactions: [
      { type: "buy", symbol: "PYPL", date: "2021-07-26", quantity: 60, price: 308.0 },
      { type: "buy", symbol: "INTC", date: "2021-04-09", quantity: 200, price: 67.0 },
      { type: "buy", symbol: "BABA", date: "2021-10-27", quantity: 80, price: 185.0 },
    ],
  },

  // 8 — EDGE : montants extrêmes → formatage K/M, tickers longs, ligne de frais seule.
  {
    id: "demo-edge-extreme",
    name: "EDGE — Montants extrêmes",
    client: "—",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: "2024-01-02",
    transactions: [
      { type: "buy", symbol: "BRK.A", date: "2024-01-02", quantity: 2, price: 548000.0 },
      { type: "buy", symbol: "SNDL", date: "2024-01-02", quantity: 50000, price: 1.62 },
      { type: "fee", symbol: "BRK.A", date: "2024-01-02", amount: 19.95 },
    ],
  },

  // 9 — RESOLVER : prix d'achat OMIS → résolus depuis l'historique réel au
  // chargement (dates récentes, couvertes par le free tier). Hors ligne / hors
  // couverture, ces achats sont droppés (jamais de position coût-0 fabriquée).
  {
    id: "demo-resolver",
    name: "Démo — prix résolus depuis l'historique",
    client: "—",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: "2025-09-15",
    transactions: [
      { type: "buy", symbol: "AAPL", date: "2025-09-15", quantity: 25 }, // price omis → résolu
      { type: "buy", symbol: "MSFT", date: "2025-10-01", quantity: 12 }, // price omis → résolu
    ],
  },

  // 10 — GEAR CODE : simulation RÉALISTE 2015-2022 (8 ans civils, ~100k CAD d'apports,
  //   prix synthétiques calibrés à l'époque — NON des clôtures officielles, cf.
  //   méthodologie du jeu de données). Base USD (prix par action USD, cohérent avec
  //   les cotations live US). `asOf` = fin 2022 → la série reconstituée couvre les 8
  //   ans et alimente TOUTE la surface performance (TWR/risque/ratios/gains réalisés)
  //   sur un historique long, clairement étiquetée « reconstituée » (bannière démo).
  //   Données générées dans gearCodeSimulation.js depuis simulation/gear-code/.
  {
    id: "demo-gear-code",
    name: "Gear Code — Tech 2015-2022 (simulé)",
    client: "Gear Code",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: "2015-02-02",
    asOf: GEAR_CODE_END_DATE,
    prixCourant: GEAR_CODE_REF_PRICES,
    transactions: GEAR_CODE_TRANSACTIONS,
  },
];

// Final list = hand-declared + programmatically generated (50+ positions,
// long DCA history). Generators are deterministic (seeded), so this is stable
// across runs. Their ids carry the `demo-` prefix → reset removes them too.
export const DEMO_PROFILES = [...DECLARED_PROFILES, ...buildGeneratedProfiles()];
