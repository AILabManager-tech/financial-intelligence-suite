// The dev SQLite mirror endpoints (/api/portfolio, /api/transactions,
// /api/portfolio/snapshots, /api/health/market-data) are served only by the
// Vite dev middleware. In any production build they 404 — localStorage is the
// durable source of truth — so clients skip them in prod to avoid useless
// requests and 404 console noise. In dev and under tests this stays true, so
// the existing behaviour (and its tests) are unchanged.
export const devBackendAvailable = !import.meta.env.PROD;
