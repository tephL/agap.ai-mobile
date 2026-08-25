import { openDatabaseAsync } from "expo-sqlite";

export const DATABASE_NAME = "hazard-prefs.db";

let dbPromise = null;

/**
 * Migrations run in order. Every entry increments user_version once applied,
 * so a future schema change only appends a new migration — never wipes rows.
 */
const MIGRATIONS = [
  `
  CREATE TABLE IF NOT EXISTS hazard_layer_pref (
    layer_id TEXT PRIMARY KEY NOT NULL,
    enabled  INTEGER NOT NULL
  );
  `,
];

async function openDb() {
  if (!dbPromise) {
    dbPromise = openDatabaseAsync(DATABASE_NAME).then(async (db) => {
      // Durable concurrent reads — same setup as family-offline.db.
      await db.execAsync("PRAGMA journal_mode = WAL;");
      await db.execAsync("PRAGMA foreign_keys = ON;");

      const row = await db.getFirstAsync("PRAGMA user_version;");
      let current = row ? Number(row.user_version ?? 0) : 0;

      while (current < MIGRATIONS.length) {
        const migration = MIGRATIONS[current];
        if (typeof migration === "function") {
          await migration(db);
        } else {
          await db.execAsync(migration);
        }
        current += 1;
        await db.execAsync(`PRAGMA user_version = ${current};`);
      }

      return db;
    });
  }
  return dbPromise;
}

/** Saved visibility prefs keyed by layer id; layers absent here are unset. */
export async function getHazardLayerPrefs() {
  const db = await openDb();
  const rows = await db.getAllAsync(
    "SELECT layer_id, enabled FROM hazard_layer_pref;"
  );
  return Object.fromEntries(
    rows.map((row) => [row.layer_id, Number(row.enabled) === 1])
  );
}

export async function setHazardLayerPref(layerId, enabled) {
  const db = await openDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO hazard_layer_pref (layer_id, enabled) VALUES (?, ?);`,
    [layerId, enabled ? 1 : 0]
  );
}
