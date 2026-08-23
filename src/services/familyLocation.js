import { getDb } from "./familyDb";
import { api } from "./api.js";
import * as SecureStore from "expo-secure-store";

export async function fetchFamilyLocation(){
  const res = await api.get('/api/families/location');
  return res;
}

// Reads the logged-in user's id, stored as a string during login.
// Returns null if it isn't set (e.g. not logged in).
async function getStoredUserId(){
  const stored = await SecureStore.getItemAsync("user_id");
  return stored ? Number(stored) : null;
}

export async function getFamilyPositions(){
  const db = await getDb();
  const currentUserId = await getStoredUserId();
  let rows = [];
  await db.withExclusiveTransactionAsync(async (txn) => {
    rows = await txn.getAllAsync(
      `select
         user_id,
         first_name,
         last_name,
         relation,
         phone_number,
         age,
         longitude,
         latitude,
         last_seen
       from member
       where user_id is not ?;`,
      [currentUserId]
    );
  });
  return rows;
}

export async function setFamilyPositions({ latitude, longitude, millisec, user_id }) {
  const db = await getDb();
  return db.withExclusiveTransactionAsync(async (txn) => {
    const result = await txn.runAsync(
      `UPDATE member
       SET latitude = ?, longitude = ?, last_seen = ?, updated_at = ?
       WHERE user_id = ?`,
      [parseFloat(latitude), parseFloat(longitude), millisec, Date.now(), user_id]
    );
  });
}
