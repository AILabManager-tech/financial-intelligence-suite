// PM commentary store (P6.3). Dated portfolio-manager notes (markdown text),
// persisted per mandate (localStorage fis:pm-commentary:v1, namespaced by mandate
// id like positions/transactions) — the prod source of truth. Integrated into the
// mandate report (P6.1). Factuality: it is the PM's own narrative, stored
// verbatim; no external data, no fabrication.
//
// Entry shape: { id, date, text } — date "YYYY-MM-DD", text raw markdown.
const STORAGE_KEY = "fis:pm-commentary:v1";
const DEFAULT_PORTFOLIO_ID = "default";

function storageKeyFor(portfolioId = DEFAULT_PORTFOLIO_ID) {
  return portfolioId && portfolioId !== DEFAULT_PORTFOLIO_ID ? `${STORAGE_KEY}::${portfolioId}` : STORAGE_KEY;
}

function hasStorage() {
  return typeof window !== "undefined" && Boolean(window.localStorage);
}

// Returns null when the entry can't be valid (missing date or empty text) so
// callers can filter it out.
export function normalizeComment(c) {
  const date = String(c?.date ?? "").trim();
  const text = String(c?.text ?? "").trim();
  if (!date || !text) return null;
  return { id: typeof c.id === "string" && c.id ? c.id : "", date, text };
}

// Stable, collision-free id (no Date.now/random).
export function makeCommentId(existing = []) {
  let max = 0;
  for (const c of existing) {
    const match = /^c(\d+)$/.exec(c?.id ?? "");
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `c${max + 1}`;
}

// --- Pure mutators (return new arrays) ---------------------------------------

export function addComment(comments, draft) {
  const normalized = normalizeComment(draft);
  if (!normalized) return comments;
  return [...comments, { ...normalized, id: makeCommentId(comments) }];
}

export function removeComment(comments, id) {
  return comments.filter((c) => c.id !== id);
}

// --- Persistence (graceful on private browsing / corrupt data) ---------------

function sortByDateDesc(comments) {
  return [...comments].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function loadCommentary(portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return [];
  try {
    const raw = window.localStorage.getItem(storageKeyFor(portfolioId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return sortByDateDesc(parsed.map(normalizeComment).filter(Boolean));
  } catch {
    return [];
  }
}

export function saveCommentary(comments, portfolioId = DEFAULT_PORTFOLIO_ID) {
  if (!hasStorage()) return;
  const clean = (Array.isArray(comments) ? comments : []).map(normalizeComment).filter(Boolean);
  window.localStorage.setItem(storageKeyFor(portfolioId), JSON.stringify(clean));
}
