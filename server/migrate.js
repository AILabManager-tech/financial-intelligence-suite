import { readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Versioned SQLite migrations (P3.1). Replaces the startup CREATE TABLE IF NOT
// EXISTS block: a `schema_migrations` table tracks applied versions, and pending
// `migrations/NNN_name.sql` files run in order, each in its own transaction.
//
// Loading (fs) is split from applying (db) so the apply logic is testable with
// an in-memory better-sqlite3 database and inline migration objects.

// Read `NNN_name.sql` files from a directory into ordered migration objects.
export function loadMigrations(dir) {
  return readdirSync(dir)
    .filter((file) => file.endsWith(".sql"))
    .sort()
    .map((file) => {
      const match = file.match(/^(\d+)_(.+)\.sql$/);
      if (!match) return null;
      return { version: match[1], name: match[2], sql: readFileSync(join(dir, file), "utf8") };
    })
    .filter(Boolean);
}

// Apply not-yet-applied migrations, in version order, each transactionally.
// Returns the versions applied during this call. Idempotent.
export function applyMigrations(db, migrations) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const applied = new Set(
    db.prepare("SELECT version FROM schema_migrations").all().map((row) => row.version),
  );
  const pending = [...migrations]
    .sort((a, b) => a.version.localeCompare(b.version))
    .filter((m) => !applied.has(m.version));

  const record = db.prepare("INSERT INTO schema_migrations (version, name) VALUES (?, ?)");
  for (const migration of pending) {
    const tx = db.transaction(() => {
      db.exec(migration.sql);
      record.run(migration.version, migration.name);
    });
    tx();
  }
  return pending.map((m) => m.version);
}

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), "migrations");

// Convenience: load from the default migrations dir and apply.
export function runMigrations(db, dir = MIGRATIONS_DIR) {
  return applyMigrations(db, loadMigrations(dir));
}
