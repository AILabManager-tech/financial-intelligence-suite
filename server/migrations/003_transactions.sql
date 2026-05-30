-- 003 transactions — tax-lot journal (P3.3b). Mirrors the client transactionStore
-- (localStorage fis:transactions:v1) for dev parity, keyed by mandate. The
-- server-side repo + API that read/write this table are deferred (the dev API is
-- scoped to the 'default' mandate until P3.2c); this migration just establishes
-- the schema so dev databases are ready. Slot 002 is reserved for the P3.2c
-- mandate columns — a numbering gap is safe: each migration is tracked
-- independently and 003 only depends on portfolios (001).

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  portfolio_id TEXT NOT NULL,
  type TEXT NOT NULL,
  symbol TEXT NOT NULL,
  trade_date TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  price REAL NOT NULL DEFAULT 0,
  fee REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_portfolio_date
  ON transactions (portfolio_id, trade_date);
