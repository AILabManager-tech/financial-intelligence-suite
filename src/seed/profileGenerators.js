// Programmatic demo profiles — too large to hand-declare, so generated from a
// seeded RNG (deterministic: same seed → same portfolio every run, no Date.now /
// Math.random). Two shapes:
//   A. a wide portfolio (50+ positions across sectors) to stress the dashboard,
//      concentration, correlation and the asset table at scale;
//   B. a long DCA history (~8 years of monthly buys) to exercise the long
//      performance series (TWR/risk over many sub-periods).
//
// Each returns a profile object in the same declarative shape as
// `profils.seed.js` (consumed by buildSeedPlan). Prices are static demo values
// (labelled by the merge / reconstituted-snapshot banner), never live data.

import { makeRng } from "./seedRandom";

// Fixed universe of real US large caps with a plausible reference price and a
// "Famille — sous-secteur" string (getSectorFamily keeps the part before "—").
const UNIVERSE = [
  ["AAPL", "Technologie — Matériel", 232], ["MSFT", "Technologie — Logiciel", 470],
  ["NVDA", "Technologie — Semiconducteurs", 138], ["AVGO", "Technologie — Semiconducteurs", 232],
  ["AMD", "Technologie — Semiconducteurs", 168], ["ORCL", "Technologie — Logiciel", 175],
  ["CRM", "Technologie — Logiciel", 290], ["ADBE", "Technologie — Logiciel", 480],
  ["CSCO", "Technologie — Réseaux", 64], ["INTC", "Technologie — Semiconducteurs", 21],
  ["GOOGL", "Communication — Internet", 178], ["META", "Communication — Internet", 600],
  ["NFLX", "Communication — Médias", 920], ["DIS", "Communication — Médias", 112],
  ["T", "Communication — Télécom", 23], ["VZ", "Communication — Télécom", 42],
  ["AMZN", "Consommation — Distribution", 205], ["TSLA", "Consommation — Automobile", 250],
  ["HD", "Consommation — Détail", 405], ["MCD", "Consommation — Restauration", 300],
  ["NKE", "Consommation — Vêtement", 78], ["SBUX", "Consommation — Restauration", 96],
  ["KO", "Consommation — Boissons", 63], ["PEP", "Consommation — Boissons", 152],
  ["PG", "Consommation — Ménage", 168], ["COST", "Consommation — Distribution", 920],
  ["WMT", "Consommation — Distribution", 92], ["JPM", "Finance — Banque", 245],
  ["BAC", "Finance — Banque", 44], ["WFC", "Finance — Banque", 73],
  ["GS", "Finance — Banque", 580], ["MS", "Finance — Banque", 128],
  ["V", "Finance — Paiements", 315], ["MA", "Finance — Paiements", 525],
  ["BRK.B", "Finance — Holding", 470], ["BLK", "Finance — Gestion d'actifs", 1020],
  ["UNH", "Santé — Assurance", 510], ["JNJ", "Santé — Pharmaceutique", 152],
  ["LLY", "Santé — Pharmaceutique", 790], ["PFE", "Santé — Pharmaceutique", 26],
  ["MRK", "Santé — Pharmaceutique", 98], ["ABBV", "Santé — Pharmaceutique", 178],
  ["TMO", "Santé — Équipement", 520], ["ABT", "Santé — Équipement", 115],
  ["XOM", "Énergie — Pétrole", 112], ["CVX", "Énergie — Pétrole", 150],
  ["COP", "Énergie — Pétrole", 98], ["SLB", "Énergie — Services", 42],
  ["NEE", "Services publics — Électricité", 72], ["DUK", "Services publics — Électricité", 110],
  ["CAT", "Industrie — Machinerie", 380], ["DE", "Industrie — Machinerie", 420],
  ["BA", "Industrie — Aérospatiale", 178], ["GE", "Industrie — Aérospatiale", 175],
  ["HON", "Industrie — Conglomérat", 220], ["UPS", "Industrie — Logistique", 130],
  ["LIN", "Matériaux — Chimie", 460], ["SHW", "Matériaux — Chimie", 360],
  ["PLD", "Immobilier — REIT", 108], ["AMT", "Immobilier — REIT", 195],
];

function round2(v) {
  return Math.round(v * 100) / 100;
}

function isoAddDays(iso, days) {
  const d = new Date(`${iso}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// A — wide portfolio of `count` distinct positions (default 52).
export function generateLargePortfolioProfile({
  id = "demo-gen-large",
  count = 52,
  seed = "large-v1",
  startDate = "2024-01-15",
} = {}) {
  const rng = makeRng(seed);
  const pool = [...UNIVERSE];
  const picked = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i += 1) {
    const idx = Math.floor(rng.next() * pool.length);
    picked.push(pool.splice(idx, 1)[0]);
  }

  const prixCourant = {};
  const meta = {};
  const transactions = [];
  picked.forEach(([symbol, sector, refPrice], i) => {
    // Buy somewhere in the ~18 months before as-of, at a fraction of the
    // reference price → a realistic mix of gains and losses.
    const buyDate = isoAddDays(startDate, rng.int(0, 500));
    const buyPrice = round2(refPrice * rng.range(0.55, 1.15));
    // Target a spread of position sizes (small to chunky) without a few names
    // dwarfing everything: scale quantity to ~$3k–$20k of cost.
    const budget = rng.range(3000, 20000);
    const quantity = Math.max(1, Math.round(budget / buyPrice));
    transactions.push({ type: "buy", symbol, date: buyDate, quantity, price: buyPrice });
    prixCourant[symbol] = refPrice;
    meta[symbol] = { sector, name: symbol };
    void i;
  });

  return {
    id,
    name: `Portefeuille large — ${picked.length} positions`,
    client: "Démo générée",
    accountType: "taxable",
    baseCurrency: "USD",
    dateDebut: startDate,
    prixCourant,
    meta,
    transactions,
  };
}

// B — long monthly DCA history on a couple of index ETFs + one stock.
export function generateLongHistoryProfile({
  id = "demo-gen-history",
  seed = "history-v1",
  startDate = "2018-01-08",
  months = 100,
} = {}) {
  const rng = makeRng(seed);
  // Each holding: a base price at the start that drifts upward over the span,
  // so the buy anchors trace a plausible long climb (with seeded variation).
  const holdings = [
    { symbol: "VOO", sector: "Indiciel — S&P 500", start: 235, end: 545, every: 1, shares: 2 },
    { symbol: "VTI", sector: "Indiciel — Marché total", start: 130, end: 300, every: 3, shares: 3 },
    { symbol: "AAPL", sector: "Technologie — Matériel", start: 42, end: 232, every: 6, shares: 8 },
  ];

  const transactions = [];
  const prixCourant = {};
  const meta = {};

  for (const h of holdings) {
    prixCourant[h.symbol] = h.end;
    meta[h.symbol] = { sector: h.sector, name: h.symbol };
    for (let m = 0; m < months; m += 1) {
      if (m % h.every !== 0) continue;
      const frac = months > 1 ? m / (months - 1) : 0;
      const trend = h.start + (h.end - h.start) * frac;
      const price = round2(trend * rng.range(0.94, 1.06));
      const date = isoAddDays(startDate, Math.round(m * 30.4));
      transactions.push({ type: "buy", symbol: h.symbol, date, quantity: h.shares, price });
    }
  }

  // Sort chronologically so the journal reads naturally.
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return {
    id,
    name: "Historique long — DCA mensuel (~8 ans)",
    client: "Démo générée",
    accountType: "rrsp",
    baseCurrency: "USD",
    dateDebut: startDate,
    prixCourant,
    meta,
    transactions,
  };
}

// Both generated profiles, ready to append to DEMO_PROFILES.
export function buildGeneratedProfiles() {
  return [generateLargePortfolioProfile(), generateLongHistoryProfile()];
}
