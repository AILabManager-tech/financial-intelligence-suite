-- 002 portfolio mandate columns (P3.2c). Adds the mandate metadata the client
-- tracks (portfolioListStore: client, base currency, opened-at) to the dev SQLite
-- `portfolios` table, for dev parity of multi-portfolio mandates. SQLite
-- ALTER ... ADD COLUMN is safe here: each migration runs exactly once per DB
-- (tracked in schema_migrations), so the columns are never added twice. This slot
-- was reserved when 003_transactions.sql shipped first (P3.3b); the numbering gap
-- is intentional and harmless — migrations are tracked independently and 003 does
-- not depend on these columns.

ALTER TABLE portfolios ADD COLUMN client TEXT NOT NULL DEFAULT '';
ALTER TABLE portfolios ADD COLUMN base_currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE portfolios ADD COLUMN opened_at TEXT;
