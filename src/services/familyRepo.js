import { getDb } from "./familyDb";


/**
 * Typed repository for the offline family cache.
 *
 * Application code never touches SQL directly — it goes through these helpers.
 * Read path: family screens try the network first, then fall back to these
 * read helpers so the tab still renders instantly when offline.
 *
 * Multi-user safety: every row is tagged with the logged-in user's id, and
 * `clearForUser` wipes only that user's snapshot on logout, so a different
 * account can never see stale data.
 */

export async function saveFamilySnapshot(userId, snapshot) {
  const db = await getDb();
  const now = Math.floor(Date.now() / 1000);

  // Exclusive write transaction so the snapshot commits atomically and can't be
  // interleaved with another query mid-refresh. Supported on iOS/Android.
  await db.withExclusiveTransactionAsync(async (txn) => {
    // Record / refresh the family row itself.
    await txn.runAsync(
      `INSERT OR REPLACE INTO family
         (family_id, name, created_by, is_creator, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [
        snapshot.family_id,
        snapshot.name ?? "",
        snapshot.created_by ?? null,
        snapshot.is_creator ? 1 : 0,
        now,
      ]
    );

    // Upsert each member (replace on id so edits never duplicate rows).
    const members = Array.isArray(snapshot.members) ? snapshot.members : [];
    for (const m of members) {
      await txn.runAsync(
        `INSERT OR REPLACE INTO member
           (family_member_id, user_id, family_id, username, phone_number,
            first_name, last_name, age, relation, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          m.family_member_id,
          m.user_id ?? null,
          snapshot.family_id,
          m.username ?? null,
          m.phone_number ?? null,
          m.first_name ?? null,
          m.last_name ?? null,
          m.age ?? null,
          m.relation ? String(m.relation).toLowerCase() : null,
          now,
        ]
      );
    }

    // Drop members removed on the server so they never resurface offline.
    if (members.length === 0) {
      await txn.runAsync(`DELETE FROM member WHERE family_id = ?`, [
        snapshot.family_id,
      ]);
    } else {
      const placeholders = members.map(() => "?").join(",");
      await txn.runAsync(
        `DELETE FROM member
          WHERE family_id = ?
            AND family_member_id NOT IN (${placeholders})`,
        [snapshot.family_id, ...members.map((m) => m.family_member_id)]
      );
    }

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

export async function getMyFamily(userId) {
  const db = await getDb();
  const family = await db.getFirstAsync(
    `SELECT family_id, name, is_creator FROM family WHERE family_id IN (
       SELECT family_id FROM member WHERE user_id = ?
     )
     ORDER BY updated_at DESC LIMIT 1`,
    [userId]
  );
  if (!family) return null;
  return hydrateFamily(db, family, userId);
}

async function hydrateFamily(db, family, userId) {
  const members = await db.getAllAsync(
    `SELECT family_member_id, user_id, username, phone_number, first_name,
            last_name, age, relation
     FROM member
     WHERE family_id = ?
     ORDER BY family_member_id ASC`,
    [family.family_id]
  );

  const lastSyncedRow = await db.getFirstAsync(
    `SELECT value FROM meta WHERE key = ?`,
    [`last_synced_${userId}`]
  );

  return {
    family_id: family.family_id,
    name: family.name,
    is_creator: !!family.is_creator,
    members: members.map((m) => ({
      family_member_id: m.family_member_id,
      user_id: m.user_id,
      username: m.username,
      phone_number: m.phone_number,
      first_name: m.first_name,
      last_name: m.last_name,
      age: m.age,
      relation: m.relation,
    })),
    last_synced_at: lastSyncedRow ? Number(lastSyncedRow.value) : null,
  };
}

/**
 * Wipe this user's cached snapshot (on logout).
 *
 * Scoped to the given user: their member rows, families left orphaned by
 * that removal, and their per-user sync metadata. Other accounts' offline
 * caches on a shared device stay intact. Falls back to a full wipe when no
 * identity is available (e.g. unreadable token), since stale data must
 * never outlive its owner.
 */
export async function clearForUser(userId) {
  try {
    const db = await getDb();
    await db.withExclusiveTransactionAsync(async (txn) => {
      if (userId != null) {
        await txn.runAsync(`DELETE FROM member WHERE user_id = ?`, [userId]);
        await txn.runAsync(
          `DELETE FROM family WHERE family_id NOT IN (
             SELECT DISTINCT family_id FROM member
           )`
        );
        await txn.runAsync(`DELETE FROM meta WHERE key IN (?, ?)`, [
          `last_synced_${userId}`,
          `has_snapshot_${userId}`,
        ]);
      } else {
        await txn.runAsync(`DELETE FROM member;`);
        await txn.runAsync(`DELETE FROM family;`);
        await txn.runAsync(`DELETE FROM meta;`);
      }
    });
  } catch (e) {
    console.log('failed to delete db ', e);
  }
}
