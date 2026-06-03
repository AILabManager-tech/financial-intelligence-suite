// Transaction journal API client (P3 server parity). Mirrors portfolioApi:
// the 'default' mandate uses the bare endpoint, others append ?portfolio=<id>.
// Dev SQLite is the mirror; localStorage (transactionStore) stays the durable
// fallback, exactly like positions.
import { devBackendAvailable } from "./devBackend";

const TRANSACTIONS_ENDPOINT = "/api/transactions";

function scoped(portfolioId) {
  return portfolioId && portfolioId !== "default"
    ? `${TRANSACTIONS_ENDPOINT}?portfolio=${encodeURIComponent(portfolioId)}`
    : TRANSACTIONS_ENDPOINT;
}

export async function fetchTransactionsFromApi(portfolioId = "default") {
  if (!devBackendAvailable) return []; // prod: localStorage is the source of truth
  const response = await fetch(scoped(portfolioId));
  if (!response.ok) {
    throw new Error(`Transactions API unavailable (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload.transactions) ? payload.transactions : [];
}

export async function saveTransactionsToApi(transactions, portfolioId = "default") {
  if (!devBackendAvailable) return transactions; // prod: no SQLite mirror, no-op
  const response = await fetch(scoped(portfolioId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transactions }),
  });
  if (!response.ok) {
    throw new Error(`Transactions API save failed (${response.status})`);
  }
  const payload = await response.json();
  return Array.isArray(payload.transactions) ? payload.transactions : transactions;
}
