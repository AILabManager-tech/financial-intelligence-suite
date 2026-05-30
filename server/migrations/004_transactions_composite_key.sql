-- 004 transactions composite key (Phase 3 closure). The 003 table used a global
-- `id TEXT PRIMARY KEY`, but client transaction ids (t1, t2, …) are only unique
-- per mandate (transactionStore namespaces by mandate), so the same id legitimately
-- recurs across mandates. Recreate the table with a composite PRIMARY KEY
-- (portfolio_id, id). Safe: the table was never written to before this migration
-- (the server repo lands in this same change), so dropping it loses no data; dev
-- DBs that ran 003 get the corrected shape.

DROP TABLE IF EXISTS transactions;

CREATE TABLE transactions (
  id TEXT NOT NULL,
  portfolio_id TEXT NOT NULL,
  type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  trade_date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  fee REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (portfolio_id, id),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date
  ON transactions (portfolio_id, trade_date);
