import { openDatabaseAsync } from "expo-sqlite";

const DATABASE_NAME = "family-offline.db";

let dbPromise = null;

/**
 * Migrations run in order. Every entry increments user_version once applied,
 * so a future schema change only appends a new migration — never wipes rows.
 */
const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS family (
    family_id        INTEGER PRIMARY KEY NOT NULL,
    name             TEXT NOT NULL,
    created_by       INTEGER,
    is_creator       INTEGER NOT NULL DEFAULT 0,
    updated_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS member (
    family_member_id INTEGER PRIMARY KEY NOT NULL,
    user_id          INTEGER NOT NULL,
    family_id        INTEGER NOT NULL,
    username         TEXT,
    phone_number     TEXT,
    first_name       TEXT,
    last_name        TEXT,
    age              INTEGER,
    relation         TEXT,
    updated_at       INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY NOT NULL,
    value TEXT
  );
  `,
];

async function openDb() {
  if (dbPromise) return dbPromise;

  dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
    // Durable concurrent reads — avoids lock contention while offline renders.
    await db.execAsync("PRAGMA journal_mode = WAL;");
    await db.execAsync("PRAGMA foreign_keys = ON;");

    // Read current schema version; apply each missing migration in order.
    const row = await db.getFirstAsync("PRAGMA user_version;");
    let current = row ? Number(row.user_version ?? row[0] ?? 0) : 0;

    while (current < MIGRATIONS.length) {
      await db.execAsync(MIGRATIONS[current]);
      current += 1;
      await db.execAsync(`PRAGMA user_version = ${current};`);
    }

    return db;
  });

  return dbPromise;
}

/** Expose the shared handle for transactional or direct use. */
export async function getDb() {
  return openDb();
}