// Seed runner — insertion idempotente et reset des portefeuilles de démo.
// Aligné sur la persistance RÉELLE (localStorage via les stores) : mandats dans
// portfolioListStore, transactions dans transactionStore, positions DÉRIVÉES des
// transactions via le lotEngine puis écrites dans portfolioStore. Les démos sont
// taguées par préfixe d'id `demo-` (normalizeMandate efface les champs inconnus,
// donc pas de flag isDemo possible sans modifier le store).
//
// Pur où possible (build*/derive*), effets isolés (apply*/reset*).

import { applyTransactions } from "../utils/lotEngine";
import { normalizeTransaction } from "../services/transactionStore";
import {
  loadPortfolioList,
  savePortfolioList,
  normalizeState,
} from "../services/portfolioListStore";
import { saveTransactions, STORAGE_KEY as TX_KEY } from "../services/transactionStore";
import { savePortfolioAssets, STORAGE_KEY as POS_KEY } from "../services/portfolioStore";
import { DEMO_PREFIX, DEMO_PROFILES } from "./profils.seed";
import { buildDemoSnapshots } from "./demoSnapshots";
import { saveDemoSnapshots, removeDemoSnapshots } from "./demoSnapshotStore";

const EPS = 1e-9;

export function isDemoMandate(mandateOrId) {
  const id = typeof mandateOrId === "string" ? mandateOrId : mandateOrId?.id;
  return typeof id === "string" && id.startsWith(DEMO_PREFIX);
}

// Expand a profile's declarative transactions into normalized records:
// fill missing `date` from the profile's dateDebut, normalize via the store's
// own rules, drop invalid ones, and assign stable ids t1..tN.
export function expandTransactions(profile) {
  const raw = Array.isArray(profile?.transactions) ? profile.transactions : [];
  const out = [];
  let n = 0;
  for (const t of raw) {
    const normalized = normalizeTransaction({ ...t, date: t.date ?? profile.dateDebut });
    if (!normalized) continue;
    out.push({ ...normalized, id: `t${++n}` });
  }
  return out;
}

// Derive held positions from the transaction log (FIFO/LIFO open lots), so the
// positions store and the transaction journal can never disagree. `price` is 0
// by default; live quotes fill it at mount, exactly like a manually-entered
// position. `prices` lets a profile seed a static reference price per symbol for
// titles the free tier won't quote (e.g. `.TO` Canadian listings) — otherwise
// they'd stay at 0 and read as a fake −100 % loss. A live quote, when available,
// still overrides it at mount; when it isn't, the merge labels it static.
export function derivePositions(transactions, method = "fifo", prices = {}) {
  const bySymbol = applyTransactions(transactions, { method });
  const positions = [];
  for (const [symbol, acc] of Object.entries(bySymbol)) {
    const quantity = acc.lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (quantity <= EPS) continue;
    const costBasis = acc.lots.reduce((sum, lot) => sum + lot.quantity * lot.costPerShare, 0);
    const staticPrice = prices?.[symbol];
    positions.push({
      symbol,
      name: symbol,
      sector: "Démo",
      price: Number.isFinite(staticPrice) ? staticPrice : 0,
      change: 0,
      changePct: 0,
      volume: 0,
      position: {
        quantity,
        averageCost: quantity > 0 ? costBasis / quantity : 0,
        targetWeight: 0,
      },
    });
  }
  return positions;
}

export function buildDemoMandate(profile) {
  return {
    id: profile.id,
    name: profile.name,
    client: profile.client ?? "",
    baseCurrency: profile.baseCurrency ?? "USD",
    accountType: profile.accountType ?? "taxable",
    openedAt: profile.dateDebut ?? null,
  };
}

// Pure: the full plan (mandate + transactions + derived positions) per profile.
export function buildSeedPlan(profiles = DEMO_PROFILES, { method = "fifo" } = {}) {
  return profiles.map((profile) => {
    const transactions = expandTransactions(profile);
    return {
      mandate: buildDemoMandate(profile),
      transactions,
      positions: derivePositions(transactions, method, profile.prixCourant),
      snapshots: buildDemoSnapshots(profile, transactions),
    };
  });
}

// --- Effects (localStorage) --------------------------------------------------

// Idempotent: existing demo mandates are replaced (ids are fixed), real mandates
// are untouched. Returns the demo mandate ids written.
export function applyDemoSeed(profiles = DEMO_PROFILES, { method = "fifo" } = {}) {
  const plan = buildSeedPlan(profiles, { method });
  const state = loadPortfolioList();
  const realMandates = state.portfolios.filter((p) => !isDemoMandate(p));
  const demoMandates = plan.map((entry) => entry.mandate);
  const next = normalizeState({
    activeId: state.activeId,
    portfolios: [...realMandates, ...demoMandates],
  });
  savePortfolioList(next);
  for (const { mandate, transactions, positions, snapshots } of plan) {
    saveTransactions(transactions, mandate.id);
    savePortfolioAssets(positions, mandate.id);
    saveDemoSnapshots(snapshots, mandate.id);
  }
  return demoMandates.map((m) => m.id);
}

// Purge demo mandates and their namespaced keys; never touches real mandates.
// Returns the demo mandate ids removed.
export function resetDemoSeed() {
  const state = loadPortfolioList();
  const demoIds = state.portfolios.filter(isDemoMandate).map((p) => p.id);
  for (const id of demoIds) {
    try {
      localStorage.removeItem(`${TX_KEY}::${id}`);
      localStorage.removeItem(`${POS_KEY}::${id}`);
    } catch {
      // private browsing / quota — non-fatal
    }
    removeDemoSnapshots(id);
  }
  const realMandates = state.portfolios.filter((p) => !isDemoMandate(p));
  const next = normalizeState({ activeId: state.activeId, portfolios: realMandates });
  savePortfolioList(next);
  return demoIds;
}
