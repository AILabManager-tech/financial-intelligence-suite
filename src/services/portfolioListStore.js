// Multi-portfolio (mandate) store (P3.2). Holds the list of mandates and the
// active one, persisted client-side (localStorage fis:portfolios:v1) — the prod
// source of truth, mirrored into SQLite in dev. A mandate is metadata only here:
// { id, name, client, baseCurrency, openedAt }; its POSITIONS live in
// portfolioStore, namespaced by mandate id.
//
// Pure helpers operate on a state object { activeId, portfolios } and return new
// state; load/save handle persistence (graceful on private browsing).
const KEY = "fis:portfolios:v1";
export const DEFAULT_PORTFOLIO_ID = "default";

// Account type drives US dividend withholding treatment (P5.5 unblock). The
// Canada-US treaty exempts RRSP/RRIF from the 15% US withholding; TFSA is
// withheld at 15% but not creditable; a taxable account is withheld at 15% but
// recoverable via the foreign tax credit. Persisted on the mandate (the account).
export const ACCOUNT_TYPES = Object.freeze([
  { id: "taxable", label: "Non enregistré (imposable)" },
  { id: "rrsp", label: "REER / FERR" },
  { id: "tfsa", label: "CELI" },
]);
const VALID_ACCOUNT_TYPES = new Set(ACCOUNT_TYPES.map((a) => a.id));
const DEFAULT_ACCOUNT_TYPE = "taxable";

export function defaultPortfolioState() {
  return {
    activeId: DEFAULT_PORTFOLIO_ID,
    portfolios: [
      { id: DEFAULT_PORTFOLIO_ID, name: "Portefeuille principal", client: "", baseCurrency: "USD", accountType: DEFAULT_ACCOUNT_TYPE, openedAt: null },
    ],
  };
}

function isValidMandate(m) {
  return m && typeof m === "object" && typeof m.id === "string" && typeof m.name === "string";
}

function normalizeMandate(m) {
  return {
    id: m.id,
    name: m.name,
    client: typeof m.client === "string" ? m.client : "",
    baseCurrency: typeof m.baseCurrency === "string" && m.baseCurrency ? m.baseCurrency.toUpperCase() : "USD",
    accountType: VALID_ACCOUNT_TYPES.has(m.accountType) ? m.accountType : DEFAULT_ACCOUNT_TYPE,
    openedAt: m.openedAt ?? null,
  };
}

// Reconcile a (possibly partial/corrupt) stored state into a valid one.
export function normalizeState(raw) {
  const portfolios = Array.isArray(raw?.portfolios) ? raw.portfolios.filter(isValidMandate).map(normalizeMandate) : [];
  if (portfolios.length === 0) return defaultPortfolioState();
  const activeId = portfolios.some((p) => p.id === raw?.activeId) ? raw.activeId : portfolios[0].id;
  return { activeId, portfolios };
}

export function loadPortfolioList() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultPortfolioState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultPortfolioState();
  }
}

export function savePortfolioList(state) {
  try {
    const clean = normalizeState(state);
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // private browsing / quota — non-fatal
  }
}

// Stable, collision-free id from a name (no Date.now/random).
export function makePortfolioId(name, existing = []) {
  const slug =
    String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "mandat";
  const ids = new Set(existing.map((p) => p.id));
  let id = slug;
  let n = 2;
  while (ids.has(id)) id = `${slug}-${n++}`;
  return id;
}

// --- Pure mutators (return new state) ----------------------------------------

export function createPortfolio(state, { name, client = "", baseCurrency = "USD", accountType = DEFAULT_ACCOUNT_TYPE, openedAt = null } = {}) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return state;
  const id = makePortfolioId(trimmed, state.portfolios);
  const mandate = normalizeMandate({ id, name: trimmed, client, baseCurrency, accountType, openedAt });
  return { activeId: id, portfolios: [...state.portfolios, mandate] };
}

export function updatePortfolio(state, id, fields) {
  return {
    ...state,
    portfolios: state.portfolios.map((p) => (p.id === id ? normalizeMandate({ ...p, ...fields, id: p.id }) : p)),
  };
}

export function removePortfolio(state, id) {
  if (state.portfolios.length <= 1) return state; // never remove the last mandate
  const portfolios = state.portfolios.filter((p) => p.id !== id);
  const activeId = state.activeId === id ? portfolios[0].id : state.activeId;
  return { activeId, portfolios };
}

export function setActivePortfolio(state, id) {
  if (!state.portfolios.some((p) => p.id === id)) return state;
  return { ...state, activeId: id };
}

export function getActivePortfolio(state) {
  return state.portfolios.find((p) => p.id === state.activeId) ?? state.portfolios[0];
}
