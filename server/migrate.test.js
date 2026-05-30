import { describe, it, expect } from "vitest";
import { join } from "node:path";
import Database from "better-sqlite3";
import { applyMigrations, loadMigrations, runMigrations } from "./migrate.js";

const MIGRATIONS_DIR = join(process.cwd(), "server", "migrations");

function memDb() {
  const db = new Database(":memory:");
  db.pragma("foreign_keys = ON");
  return db;
}

const M = [
  { version: "001", name: "a", sql: "CREATE TABLE a (id INTEGER PRIMARY KEY);" },
  { version: "002", name: "b", sql: "CREATE TABLE b (id INTEGER PRIMARY KEY);" },
];

function tableNames(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
}

describe("applyMigrations", () => {
  it("crée schema_migrations et applique les migrations en attente, en ordre", () => {
    const db = memDb();
    const applied = applyMigrations(db, M);
    expect(applied).toEqual(["001", "002"]);
    expect(tableNames(db)).toEqual(expect.arrayContaining(["schema_migrations", "a", "b"]));
    const recorded = db.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((r) => r.version);
    expect(recorded).toEqual(["001", "002"]);
  });

  it("est idempotent : un 2e passage n'applique rien", () => {
    const db = memDb();
    applyMigrations(db, M);
    expect(applyMigrations(db, M)).toEqual([]);
  });

  it("n'applique que les migrations nouvelles", () => {
    const db = memDb();
    applyMigrations(db, [M[0]]);
    expect(applyMigrations(db, M)).toEqual(["002"]);
  });

  it("trie par version même si fournies dans le désordre", () => {
    const db = memDb();
    expect(applyMigrations(db, [M[1], M[0]])).toEqual(["001", "002"]);
  });

  it("rollback : une migration invalide n'est pas enregistrée et ne casse pas la table de suivi", () => {
    const db = memDb();
    const bad = [{ version: "001", name: "bad", sql: "CREATE TABLE oops (" }];
    expect(() => applyMigrations(db, bad)).toThrow();
    const recorded = db.prepare("SELECT version FROM schema_migrations").all();
    expect(recorded).toEqual([]);
    expect(tableNames(db)).not.toContain("oops");
  });
});

describe("loadMigrations / runMigrations (dossier réel)", () => {
  it("charge la migration initiale 001 depuis server/migrations", () => {
    // chemin par défaut résolu par runMigrations ; on vérifie via loadMigrations sur le même dossier
    const db = memDb();
    const applied = runMigrations(db);
    expect(applied).toContain("001");
    // le schéma du portefeuille est en place
    expect(tableNames(db)).toEqual(expect.arrayContaining(["portfolios", "positions", "portfolio_snapshots"]));
  });

  it("runMigrations est idempotent sur le dossier réel", () => {
    const db = memDb();
    runMigrations(db);
    expect(runMigrations(db)).toEqual([]);
  });

  it("loadMigrations ignore les fichiers non conformes et lit le SQL", () => {
    const migrations = loadMigrations(MIGRATIONS_DIR);
    expect(migrations.length).toBeGreaterThanOrEqual(1);
    expect(migrations[0].version).toBe("001");
    expect(migrations[0].sql).toMatch(/CREATE TABLE/);
  });
});
