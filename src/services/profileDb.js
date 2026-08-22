import { openDatabaseAsync } from "expo-sqlite";

const DATABASE_NAME = "profile-offline.db";

let dbPromise = null;

/**
 * Migrations run in order. Every entry increments user_version once applied,
 * so a future schema change only appends a new migration — never wipes rows.
 */
const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS person (
    user_id      INTEGER PRIMARY KEY NOT NULL,
    phone_number TEXT,
    first_name   TEXT,
    middle_name  TEXT,
    last_name    TEXT,
    gender       TEXT,
    disabilities TEXT,
    age          INTEGER,
    city         TEXT,
    barangay     TEXT,
    street       TEXT,
    address      TEXT,
    updated_at   INTEGER NOT NULL
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
