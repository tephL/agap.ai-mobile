import { api } from "./api";
import { getCurrentUserId } from "./currentUser";
import {
  saveFamilySnapshot,
  getMyFamily as getMyFamilyFromCache,
  clearForUser,
} from "./familyRepo";

export const RELATIONS = [
  "son",
  "daughter",
  "father",
  "mother",
  "grandfather",
  "grandmother",
];

// Display labels keep the stored value lowercase but show Capital First casing.
export const RELATION_OPTIONS = RELATIONS.map((r) => ({
  value: r,
  label: r.charAt(0).toUpperCase() + r.slice(1),
}));

export const relationLabel = (relation) =>
  relation ? relation.charAt(0).toUpperCase() + relation.slice(1) : "";

export async function createFamily({ name, relation }) {
  const { data } = await api.post("/api/families", { name, relation });
  return data; // { family_id, name }
}

export async function getFamilyMembers(familyId) {
  const { data } = await api.get(`/api/families/${familyId}/members`);
  return data; // { family_id, name, members: [...] }
}

export async function getMyFamily() {
  const userId = await getCurrentUserId();
  try {
    const { data } = await api.get("/api/families/mine");
    if (userId && data?.members) {
      // Going online → refresh the local mirror so it's ready for offline.
      saveFamilySnapshot(userId, data).catch(() => {});
    }
    return data; // { family_id, name, is_creator, members: [...] }
  } catch (err) {
    // Offline or fetch failed → fall back to the SQLite snapshot so the tab
    // still renders. `last_synced_at` tells the UI this is stale data.
    if (userId && (err?.response?.status === 404 || !err?.response)) {
      const cached = await getMyFamilyFromCache(userId);
      if (cached) return cached;
    }
    throw err;
  }
}

export async function inviteMember(familyId, { phone_number, relation }) {
  const { data } = await api.post(`/api/families/${familyId}/invite`, {
    phone_number,
    relation,
  });
  return data;
}

export async function removeMember(familyId, memberId) {
  await api.delete(`/api/families/${familyId}/members/${memberId}`);
}

export async function getMyInvitations() {
  const { data } = await api.get("/api/invitations");
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.invitations)) return data.invitations;
  return [];
}

export async function acceptInvitation(id) {
  const { data } = await api.patch(`/api/invitations/${id}/accept`);
  return data;
}

export async function rejectInvitation(id) {
  const { data } = await api.patch(`/api/invitations/${id}/reject`);
  return data;
}