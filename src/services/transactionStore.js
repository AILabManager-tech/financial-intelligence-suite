// Transaction journal store (P3.3b). Persists the chronological transaction log
// per mandate (localStorage fis:transactions:v1, namespaced by mandate id like
// positions in portfolioStore) — the prod source of truth. The pure tax-lot
// engine (src/utils/lotEngine.js) consumes these to derive realized P&L and open
// lots; a future AI layer can read the same normalized log + summary through a
// clean data seam, no engine change required.
//
// Transaction shape: { id, type, symbol, date, quantity, price, fee, amount }
//   type: "buy" | "sell" | "dividend" | "fee"
//   buy/sell carry quantity/price/fee; dividend/fee carry amount.

const STORAGE_KEY = "fis:transactions:v1";
const DEFAULT_PORTFOLIO_ID = "default";
const VALID_TYPES = new Set(["buy", "sell", "dividend", "fee"]);

// Positions/transactions are namespaced per mandate (P3.2/P3.3). The 'default'
// mandate keeps the base key (back-compat); others get a suffixed key.
function storageKeyFor(portfolioId = DEFAULT_PORTFOLIO_ID) {
  return portfolioId && portfolioId !== DEFAULT_PORTFOLIO_ID ? `${STORAGE_KEY}::${portfolioId}` : STORAGE_KEY;
}

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

function num(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

// Normalize a raw transaction; returns null when it can't be a valid record
// (unknown type, or missing symbol/date) so callers can filter it out.
export function normalizeTransaction(t) {
  if (!t || !VALID_TYPES.has(t.type)) return null;
  const symbol = String(t.symbol ?? "").trim().toUpperCase();
  const date = String(t.date ?? "").trim();
  if (!symbol || !date) return null;
  return {
    id: typeof t.id === "string" && t.id ? t.id : "",
    type: t.type,
    symbol,
    date,
    quantity: num(t.quantity),
    price: num(t.price),
    fee: num(t.fee),
    amount: num(t.amount),
  };
}

// Stable, collision-free id (no Date.now/random) — max existing `tN` + 1.
export function makeTransactionId(existing = []) {
  let max = 0;
  for (const t of existing) {
    const match = /^t(\d+)$/.exec(t?.id ?? "");
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `t${max + 1}`;
}

// --- Pure mutators (return new arrays) ---------------------------------------

export function addTransaction(transactions, draft) {
  const normalized = normalizeTransaction(draft);
  if (!normalized) return transactions;
  return [...transactions, { ...normalized, id: makeTransactionId(transactions) }];
}

export function removeTransaction(transactions, id) {
  return transactions.filter((t) => t.id !== id);
}

// --- Persistence (graceful on private browsing / corrupt data) ---------------

export function loadTransactions(portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(portfolioId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTransaction).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveTransactions(transactions, portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return;
  const clean = (Array.isArray(transactions) ? transactions : []).map(normalizeTransaction).filter(Boolean);
  window.localStorage.setItem(storageKeyFor(portfolioId), JSON.stringify(clean));
}
