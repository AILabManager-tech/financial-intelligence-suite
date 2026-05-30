-- 001 initial schema — portfolios, positions, snapshots.
-- IF NOT EXISTS is kept so existing dev databases (created by the pre-migration
-- inline CREATE TABLE) adopt the migration system without error: version 001
-- runs once as a no-op on already-present tables, then gets recorded.

CREATE TABLE IF NOT EXISTS portfolios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS positions (
  portfolio_id TEXT NOT NULL,
  symbol TEXT NOT NULL,
  name TEXT NOT NULL,
  sector TEXT NOT NULL,
  quantity REAL NOT NULL DEFAULT 0,
  average_cost REAL NOT NULL DEFAULT 0,
  target_weight REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (portfolio_id, symbol),
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  portfolio_id TEXT NOT NULL,
  captured_at TEXT NOT NULL,
  total_market_value REAL NOT NULL DEFAULT 0,
  total_cost REAL NOT NULL DEFAULT 0,
  unrealized_pnl REAL NOT NULL DEFAULT 0,
  unrealized_pnl_pct REAL NOT NULL DEFAULT 0,
  positions_count INTEGER NOT NULL DEFAULT 0,
  live_quotes_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_portfolio_snapshots_captured_at
  ON portfolio_snapshots (portfolio_id, captured_at DESC);
