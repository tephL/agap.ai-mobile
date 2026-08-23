import { getDb } from "./profileDb";

/**
 * Typed repository for the offline profile cache.
 *
 * Mirrors familyRepo: screens try the network first, then fall back to these
 * read helpers so the tab still renders instantly when offline.
 *
 * Multi-user safety: the person row is keyed by the logged-in user's id, and
 * `clearProfileForUser` wipes only that user's snapshot on logout, so a
 * different account can never see stale data.
 */

export async function saveProfileSnapshot(userId, profile) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);

  // Exclusive write transaction so the snapshot commits atomically.
  await db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `INSERT OR REPLACE INTO person
         (user_id, phone_number, first_name, middle_name, last_name, gender,
          disabilities, age, city, barangay, street, address, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        profile.phone_number ?? null,
        profile.first_name ?? null,
        profile.middle_name ?? null,
        profile.last_name ?? null,
        profile.gender ?? null,
        profile.disabilities == null
          ? null
          : JSON.stringify(profile.disabilities),
        profile.age ?? null,
        profile.city ?? null,
        profile.barangay ?? null,
        profile.street ?? null,
        profile.address ?? null,
        now,
      ]
    );

    // Stamp last-synced time for the "saved X ago" indicator + user scoping.
    await txn.runAsync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('last_synced_${userId}', ?)`,
      [String(now)]
    );
    await txn.runAsync(
      `INSERT OR REPLACE INTO meta (key, value) VALUES ('has_snapshot_${userId}', '1')`
    );
  });
}

export async function getProfileFromCache(userId) {
  const db = await getDb();
  const row = await db.getFirstAsync(
    `SELECT user_id, phone_number, first_name, middle_name, last_name,
            gender, disabilities, age, city, barangay, street, address
     FROM person WHERE user_id = ?`,
    [userId]
  );
  if (!row) return null;

  const lastSyncedRow = await db.getFirstAsync(
    `SELECT value FROM meta WHERE key = ?`,
    [`last_synced_${userId}`]
  );

  let disabilities = null;
  if (row.disabilities != null) {
    try {
      disabilities = JSON.parse(row.disabilities);
    } catch {
      disabilities = row.disabilities;
    }
  }

  return {
    user_id: row.user_id,
    phone_number: row.phone_number,
    first_name: row.first_name,
    middle_name: row.middle_name,
    last_name: row.last_name,
    gender: row.gender,
    disabilities,
    age: row.age,
    city: row.city,
    barangay: row.barangay,
    street: row.street,
    address: row.address,
    last_synced_at: lastSyncedRow ? Number(lastSyncedRow.value) : null,
  };
}

/** Wipe only this user's cached snapshot (on logout). */
export async function clearProfileForUser(userId) {
  const db = await getDb();
  await db.runAsync(`DELETE FROM person WHERE user_id = ?`, [userId]);
  await db.runAsync(`DELETE FROM meta WHERE key LIKE ?`, [`%_${userId}`]);
}
