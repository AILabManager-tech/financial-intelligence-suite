// Production API router (Vercel). All /api/* endpoints are served by a single
// catch-all function (api/[...path].js) to stay under the Hobby plan's 12
// Serverless Function limit — 14 separate handlers would exceed it. As a bonus
// this means one warm function instead of 14 cold ones.
//
// Each handler keeps its original (request, response) shape and lives under
// api/_handlers/ (the leading underscore tells Vercel NOT to treat these as
// functions). The dev server is unaffected: vite.config.js has its own inline
// /api middleware and never imports these files.
import quotes from "./quotes.js";
import history from "./history.js";
import search from "./search.js";
import fundamentals from "./fundamentals.js";
import companyNews from "./company-news.js";
import earnings from "./earnings.js";
import dividends from "./dividends.js";
import analystRatings from "./analyst-ratings.js";
import insiderTransactions from "./insider-transactions.js";
import insiderSentiment from "./insider-sentiment.js";
import macro from "./macro.js";
import secFilings from "./sec-filings.js";
import peers from "./peers.js";
import fx from "./fx.js";
import health from "./health.js";

// Maps the first path segment of /api/<endpoint> to its handler. Keys mirror
// the kebab-case the client services already call.
export const ROUTES = {
  quotes,
  history,
  search,
  fundamentals,
  "company-news": companyNews,
  earnings,
  dividends,
  "analyst-ratings": analystRatings,
  "insider-transactions": insiderTransactions,
  "insider-sentiment": insiderSentiment,
  macro,
  "sec-filings": secFilings,
  peers,
  fx,
  // /api/health/market-data → resolveEndpoint returns the first segment "health".
  health,
};

// Resolve the endpoint name. Prefer the catch-all route param when Vercel
// populates it; fall back to parsing request.url (the reliable source — the
// route param injection has proven flaky for the raw Node handler shape).
export function resolveEndpoint(request) {
  const fromParam = [].concat(request?.query?.path ?? []).filter(Boolean);
  if (fromParam.length) return fromParam[0];

  const pathname = String(request?.url ?? "").split("?")[0];
  const parts = pathname.split("/").filter(Boolean); // e.g. ["api","quotes"]
  const apiIdx = parts.indexOf("api");
  const after = apiIdx >= 0 ? parts.slice(apiIdx + 1) : parts;
  return after[0];
}

// Dispatch /api/<endpoint> to its handler. `routes` is injectable for tests.
export async function dispatch(request, response, routes = ROUTES) {
  const endpoint = resolveEndpoint(request);
  const route = routes[endpoint];

  if (!route) {
    response.statusCode = 404;
    response.setHeader("Content-Type", "application/json");
    response.end(JSON.stringify({ error: `unknown endpoint: ${endpoint ?? ""}` }));
    return undefined;
  }

  return route(request, response);
}
