import { api } from "./api";
import { getCurrentUserId } from "./currentUser";
import {
  saveFamilySnapshot,
  getMyFamily as getMyFamilyFromCache,
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

export async function getMyFamily() {
  const userId = await getCurrentUserId();

  try {
    const { data } = await api.get("/api/families/mine");

    if (userId && data?.members) {
      await saveFamilySnapshot(userId, data);
    }

    return data;
  } catch (err) {
    console.log("=== FAMILY ERROR DEBUG ===");
    console.log("message:", err?.message);
    console.log("status:", err?.response?.status);
    console.log("response data:", err?.response?.data);
    console.log("has response:", !!err?.response);
    console.log("==========================");
    // 404 = account has no family.
    if (Number(err?.response?.status) === 404) {
      return null;
    }

    // Network/offline = try SQLite.
    if (userId && !err?.response) {
      const cached = await getMyFamilyFromCache(userId);

      if (cached) {
        return cached;
      }
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
