import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";

const defaultDbPath = resolve(process.cwd(), "data/financial-intelligence.sqlite");

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

export function createPortfolioRepository(dbPath = defaultDbPath) {
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
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
  `);

  const ensureDefaultPortfolio = db.prepare(`
    INSERT OR IGNORE INTO portfolios (id, name)
    VALUES ('default', 'Default portfolio')
  `);
  ensureDefaultPortfolio.run();

  const list = db.prepare(`
    SELECT symbol, name, sector, quantity, average_cost, target_weight
    FROM positions
    WHERE portfolio_id = 'default'
    ORDER BY symbol ASC
  `);

  const replacePositions = db.transaction((assets) => {
    db.prepare("DELETE FROM positions WHERE portfolio_id = 'default'").run();
    const insert = db.prepare(`
      INSERT INTO positions (
        portfolio_id, symbol, name, sector, quantity, average_cost, target_weight
      ) VALUES (
        'default', @symbol, @name, @sector, @quantity, @averageCost, @targetWeight
      )
    `);

    assets.map(normalizeAsset).filter((asset) => asset.symbol).forEach((asset) => insert.run(asset));
    db.prepare("UPDATE portfolios SET updated_at = CURRENT_TIMESTAMP WHERE id = 'default'").run();
  });

  const insertSnapshot = db.prepare(`
    INSERT INTO portfolio_snapshots (
      portfolio_id,
      captured_at,
      total_market_value,
      total_cost,
      unrealized_pnl,
      unrealized_pnl_pct,
      positions_count,
      live_quotes_count
    ) VALUES (
      'default',
      @capturedAt,
      @totalMarketValue,
      @totalCost,
      @unrealizedPnl,
      @unrealizedPnlPct,
      @positionsCount,
      @liveQuotesCount
    )
  `);

  const listSnapshots = db.prepare(`
    SELECT
      id,
      captured_at,
      total_market_value,
      total_cost,
      unrealized_pnl,
      unrealized_pnl_pct,
      positions_count,
      live_quotes_count
    FROM portfolio_snapshots
    WHERE portfolio_id = 'default'
    ORDER BY captured_at DESC
    LIMIT @limit
  `);

  return {
    listAssets() {
      return list.all().map(rowToAsset);
    },
    saveAssets(assets) {
      replacePositions(Array.isArray(assets) ? assets : []);
      return this.listAssets();
    },
    saveSnapshot(snapshot) {
      const normalized = normalizeSnapshot(snapshot ?? {});
      const result = insertSnapshot.run(normalized);
      return {
        id: result.lastInsertRowid,
        ...normalized,
      };
    },
    listSnapshots(limit = 120) {
      const normalizedLimit = Math.min(Math.max(Number(limit) || 120, 1), 500);
      return listSnapshots.all({ limit: normalizedLimit }).map(rowToSnapshot).reverse();
    },
    close() {
      db.close();
    },
  };
}
