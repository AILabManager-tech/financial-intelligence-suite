// Thematic watchlists store (P5.4). Holds the list of named watchlists and the
// active one, persisted client-side (localStorage fis:watchlists:v1). A list is
// metadata only here: { id, name }; its ASSETS live in watchlistStore,
// namespaced by list id. Mirrors portfolioListStore (mandates) so the header
// selector reuses the same switch/create/rename/delete pattern.
//
// Backward-compat: the 'default' list reuses watchlistStore's legacy storage key,
// so an existing flat watchlist transparently becomes the "Défaut" list with no
// data migration step.
//
// Pure helpers operate on a state object { activeId, lists } and return new
// state; load/save handle persistence (graceful on private browsing).
const KEY = "fis:watchlists:v1";
export const DEFAULT_WATCHLIST_ID = "default";

export function defaultWatchlistState() {
  return {
    activeId: DEFAULT_WATCHLIST_ID,
    lists: [{ id: DEFAULT_WATCHLIST_ID, name: "Défaut" }],
  };
}

function isValidList(l) {
  return l && typeof l === "object" && typeof l.id === "string" && typeof l.name === "string";
}

function normalizeList(l) {
  return { id: l.id, name: l.name };
}

// Reconcile a (possibly partial/corrupt) stored state into a valid one.
export function normalizeState(raw) {
  const lists = Array.isArray(raw?.lists) ? raw.lists.filter(isValidList).map(normalizeList) : [];
  if (lists.length === 0) return defaultWatchlistState();
  const activeId = lists.some((l) => l.id === raw?.activeId) ? raw.activeId : lists[0].id;
  return { activeId, lists };
}

export function loadWatchlistList() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultWatchlistState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return defaultWatchlistState();
  }
}

export function saveWatchlistList(state) {
  try {
    const clean = normalizeState(state);
    localStorage.setItem(KEY, JSON.stringify(clean));
  } catch {
    // private browsing / quota — non-fatal
  }
}

// Stable, collision-free id from a name (no Date.now/random).
export function makeWatchlistId(name, existing = []) {
  const slug =
    String(name).trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "liste";
  const ids = new Set(existing.map((l) => l.id));
  let id = slug;
  let n = 2;
  while (ids.has(id)) id = `${slug}-${n++}`;
  return id;
}

// --- Pure mutators (return new state) ----------------------------------------

export function createWatchlist(state, { name } = {}) {
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return state;
  const id = makeWatchlistId(trimmed, state.lists);
  return { activeId: id, lists: [...state.lists, { id, name: trimmed }] };
}

export function updateWatchlist(state, id, fields) {
  return {
    ...state,
    lists: state.lists.map((l) =>
      l.id === id ? normalizeList({ ...l, ...fields, id: l.id }) : l,
    ),
  };
}

export function removeWatchlist(state, id) {
  if (state.lists.length <= 1) return state; // never remove the last list
  const lists = state.lists.filter((l) => l.id !== id);
  const activeId = state.activeId === id ? lists[0].id : state.activeId;
  return { activeId, lists };
}

export function setActiveWatchlist(state, id) {
  if (!state.lists.some((l) => l.id === id)) return state;
  return { ...state, activeId: id };
}

export function getActiveWatchlist(state) {
  return state.lists.find((l) => l.id === state.activeId) ?? state.lists[0];
}
