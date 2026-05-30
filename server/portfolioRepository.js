import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runMigrations } from "./migrate.js";

const defaultDbPath = resolve(process.cwd(), "data/financial-intelligence.sqlite");
const DEFAULT_PORTFOLIO_ID = "default";

function cleanNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeAsset(asset) {
  const position = asset.position ?? {};

  return {
    symbol: String(asset.symbol ?? "").trim().toUpperCase(),
    name: asset.name || asset.symbol,
    sector: asset.sector || "Portefeuille — Non classé",
    quantity: cleanNumber(position.quantity, 0),
    averageCost: cleanNumber(position.averageCost, asset.price ?? 0),
    targetWeight: cleanNumber(position.targetWeight, 0),
  };
}

function rowToAsset(row) {
  return {
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    price: 0,
    change: 0,
    changePct: 0,
    volume: 0,
    position: {
      quantity: row.quantity,
      averageCost: row.average_cost,
      targetWeight: row.target_weight,
    },
  };
}

function rowToMandate(row) {
  return {
    id: row.id,
    name: row.name,
    client: row.client ?? "",
    baseCurrency: row.base_currency ?? "USD",
    openedAt: row.opened_at ?? null,
  };
}

function normalizeMandate(mandate) {
  const id = String(mandate?.id ?? "").trim();
  return {
    id,
    name: String(mandate?.name ?? "").trim() || id,
    client: typeof mandate?.client === "string" ? mandate.client : "",
    baseCurrency:
      typeof mandate?.baseCurrency === "string" && mandate.baseCurrency
        ? mandate.baseCurrency.toUpperCase()
        : "USD",
    openedAt: mandate?.openedAt ?? null,
  };
}

function normalizeSnapshot(snapshot) {
  const metrics = snapshot.metrics ?? snapshot;

  return {
    capturedAt: snapshot.capturedAt || new Date().toISOString(),
    totalMarketValue: cleanNumber(metrics.totalMarketValue, 0),
    totalCost: cleanNumber(metrics.totalCost, 0),
    unrealizedPnl: cleanNumber(metrics.unrealizedPnl, 0),
    unrealizedPnlPct: cleanNumber(metrics.unrealizedPnlPct, 0),
    positionsCount: cleanNumber(metrics.positionsCount, 0),
    liveQuotesCount: cleanNumber(metrics.liveQuotesCount, 0),
  };
}

function rowToSnapshot(row) {
  return {
    id: row.id,
    capturedAt: row.captured_at,
    totalMarketValue: row.total_market_value,
    totalCost: row.total_cost,
    unrealizedPnl: row.unrealized_pnl,
    unrealizedPnlPct: row.unrealized_pnl_pct,
    positionsCount: row.positions_count,
    liveQuotesCount: row.live_quotes_count,
  };
}

const TRANSACTION_TYPES = new Set(["buy", "sell", "dividend", "fee"]);

// Normalize a raw transaction for storage. Mirrors the client transactionStore
// shape ({ id, type, symbol, date, quantity, price, fee, amount }); the DB column
// for `date` is `trade_date`. Returns null for records that can't be valid
// (unknown type, missing symbol/date) so they're dropped rather than persisted.
function normalizeTransaction(transaction) {
  if (!transaction || !TRANSACTION_TYPES.has(transaction.type)) return null;
  const symbol = String(transaction.symbol ?? "").trim().toUpperCase();
  const date = String(transaction.date ?? "").trim();
  if (!symbol || !date) return null;
  return {
    id: typeof transaction.id === "string" && transaction.id ? transaction.id : null,
    type: transaction.type,
    symbol,
    date,
    quantity: cleanNumber(transaction.quantity, 0),
    price: cleanNumber(transaction.price, 0),
    fee: cleanNumber(transaction.fee, 0),
    amount: cleanNumber(transaction.amount, 0),
  };
}

function rowToTransaction(row) {
  return {
    id: row.id,
    type: row.type,
    symbol: row.symbol,
    date: row.trade_date,
    quantity: row.quantity,
    price: row.price,
    fee: row.fee,
    amount: row.amount,
  };
}

function portfolioId(value) {
  const id = String(value ?? "").trim();
  return id || DEFAULT_PORTFOLIO_ID;
}

// Mandate-aware portfolio repository (P3.2c). Positions, snapshots and mandate
// metadata are all scoped by `portfolio_id`; the dev SQLite DB now mirrors the
// client's multi-portfolio store (portfolioListStore + namespaced positions).
// Position/snapshot methods take an optional trailing portfolioId (default
// 'default') so existing single-portfolio callers keep working unchanged.
export function createPortfolioRepository(dbPath = defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  // Schema is owned by versioned migrations (P3.1+), not an inline CREATE block.
  runMigrations(db);

  const ensureDefaultPortfolio = db.prepare(`
    INSERT OR IGNORE INTO portfolios (id, name) VALUES ('default', 'Default portfolio')
  `);
  ensureDefaultPortfolio.run();

  // Keep a position/snapshot insert from violating the FK when a mandate row was
  // never registered via savePortfolio (name falls back to the id).
  const ensurePortfolio = db.prepare(`
    INSERT OR IGNORE INTO portfolios (id, name) VALUES (@id, @name)
  `);

  const listPortfoliosStmt = db.prepare(`
    SELECT id, name, client, base_currency, opened_at
    FROM portfolios
    ORDER BY (id = 'default') DESC, name ASC
  `);

  const upsertPortfolio = db.prepare(`
    INSERT INTO portfolios (id, name, client, base_currency, opened_at)
    VALUES (@id, @name, @client, @baseCurrency, @openedAt)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      client = excluded.client,
      base_currency = excluded.base_currency,
      opened_at = excluded.opened_at,
      updated_at = CURRENT_TIMESTAMP
  `);

  const deletePortfolioStmt = db.prepare("DELETE FROM portfolios WHERE id = ?");

  const listStmt = db.prepare(`
    SELECT symbol, name, sector, quantity, average_cost, target_weight
    FROM positions
    WHERE portfolio_id = ?
    ORDER BY symbol ASC
  `);

  const deletePositions = db.prepare("DELETE FROM positions WHERE portfolio_id = ?");
  const insertPosition = db.prepare(`
    INSERT INTO positions (
      portfolio_id, symbol, name, sector, quantity, average_cost, target_weight
    ) VALUES (
      @portfolioId, @symbol, @name, @sector, @quantity, @averageCost, @targetWeight
    )
  `);
  const touchPortfolio = db.prepare("UPDATE portfolios SET updated_at = CURRENT_TIMESTAMP WHERE id = ?");

  const replacePositions = db.transaction((id, assets) => {
    ensurePortfolio.run({ id, name: id });
    deletePositions.run(id);
    assets
      .map(normalizeAsset)
      .filter((asset) => asset.symbol)
      .forEach((asset) => insertPosition.run({ ...asset, portfolioId: id }));
    touchPortfolio.run(id);
  });

  const insertSnapshot = db.prepare(`
    INSERT INTO portfolio_snapshots (
      portfolio_id, captured_at, total_market_value, total_cost,
      unrealized_pnl, unrealized_pnl_pct, positions_count, live_quotes_count
    ) VALUES (
      @portfolioId, @capturedAt, @totalMarketValue, @totalCost,
      @unrealizedPnl, @unrealizedPnlPct, @positionsCount, @liveQuotesCount
    )
  `);

  const listSnapshotsStmt = db.prepare(`
    SELECT id, captured_at, total_market_value, total_cost, unrealized_pnl,
           unrealized_pnl_pct, positions_count, live_quotes_count
    FROM portfolio_snapshots
    WHERE portfolio_id = @portfolioId
    ORDER BY captured_at DESC
    LIMIT @limit
  `);

  const listTransactionsStmt = db.prepare(`
    SELECT id, type, symbol, trade_date, quantity, price, fee, amount
    FROM transactions
    WHERE portfolio_id = ?
    ORDER BY trade_date ASC, id ASC
  `);

  const deleteTransactions = db.prepare("DELETE FROM transactions WHERE portfolio_id = ?");
  const insertTransaction = db.prepare(`
    INSERT INTO transactions (
      id, portfolio_id, type, symbol, trade_date, quantity, price, fee, amount
    ) VALUES (
      @id, @portfolioId, @type, @symbol, @date, @quantity, @price, @fee, @amount
    )
  `);

  // Replace-all per mandate, mirroring saveAssets: the client owns the full
  // transaction array (with its own stable tN ids), so each save is a snapshot.
  // A null id (older client record) gets a deterministic positional fallback so
  // the PRIMARY KEY is always satisfied.
  const replaceTransactions = db.transaction((id, transactions) => {
    ensurePortfolio.run({ id, name: id });
    deleteTransactions.run(id);
    transactions
      .map(normalizeTransaction)
      .filter(Boolean)
      .forEach((transaction, index) => {
        insertTransaction.run({
          ...transaction,
          id: transaction.id ?? `t${index + 1}`,
          portfolioId: id,
        });
      });
    touchPortfolio.run(id);
  });

  return {
    // --- Mandates -----------------------------------------------------------
    listPortfolios() {
      return listPortfoliosStmt.all().map(rowToMandate);
    },
    savePortfolio(mandate) {
      const normalized = normalizeMandate(mandate);
      if (!normalized.id) throw new Error("portfolio id is required");
      upsertPortfolio.run(normalized);
      return normalized;
    },
    removePortfolio(id) {
      const result = deletePortfolioStmt.run(portfolioId(id));
      return result.changes > 0;
    },

    // --- Positions ----------------------------------------------------------
    listAssets(id = DEFAULT_PORTFOLIO_ID) {
      return listStmt.all(portfolioId(id)).map(rowToAsset);
    },
    saveAssets(assets, id = DEFAULT_PORTFOLIO_ID) {
      const scoped = portfolioId(id);
      replacePositions(scoped, Array.isArray(assets) ? assets : []);
      return this.listAssets(scoped);
    },

    // --- Snapshots ----------------------------------------------------------
    saveSnapshot(snapshot, id = DEFAULT_PORTFOLIO_ID) {
      const scoped = portfolioId(id);
      ensurePortfolio.run({ id: scoped, name: scoped });
      const normalized = normalizeSnapshot(snapshot ?? {});
      const result = insertSnapshot.run({ ...normalized, portfolioId: scoped });
      return { id: result.lastInsertRowid, ...normalized };
    },
    listSnapshots(limit = 120, id = DEFAULT_PORTFOLIO_ID) {
      const normalizedLimit = Math.min(Math.max(Number(limit) || 120, 1), 500);
      return listSnapshotsStmt
        .all({ portfolioId: portfolioId(id), limit: normalizedLimit })
        .map(rowToSnapshot)
        .reverse();
    },

    // --- Transactions (P3.3 server parity) ----------------------------------
    listTransactions(id = DEFAULT_PORTFOLIO_ID) {
      return listTransactionsStmt.all(portfolioId(id)).map(rowToTransaction);
    },
    saveTransactions(transactions, id = DEFAULT_PORTFOLIO_ID) {
      const scoped = portfolioId(id);
      replaceTransactions(scoped, Array.isArray(transactions) ? transactions : []);
      return this.listTransactions(scoped);
    },

    close() {
      db.close();
    },
  };
}
