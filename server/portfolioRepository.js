import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { runMigrations } from "./migrate.js";

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

  // Schema is owned by versioned migrations (P3.1), not an inline CREATE block.
  runMigrations(db);

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
