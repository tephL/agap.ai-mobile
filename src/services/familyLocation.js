import { getDb } from "./familyDb";
import { api } from "./api.js";

export async function fetchFamilyLocation(){
  const res = await api.get('/api/families/location');
  return res;
}

export async function getFamilyPositions(){
  const db = await getDb();
  return db.withExclusiveTransactionAsync(async (txn) => {
    const q = await txn.getAllAsync(
      'select user_id, longitude, latitude, last_seen from member;',
      []
    );
    console.log('query', q);
    return q;
  });
}

export async function setFamilyPositions({ latitude, longitude, millisec, user_id }){
  const db = await getDb();
  return db.withExclusiveTransactionAsync(async (txn) => {
    await txn.runAsync(
      `UPDATE member
       SET latitude = ?, longitude = ?, last_seen = ?, updated_at = ?
       WHERE user_id = ?`,
      [parseFloat(latitude), parseFloat(longitude), millisec, user_id, Date.now()]
    );
  });
}
