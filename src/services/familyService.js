import { api } from "./api";

export const RELATIONS = [
  "son",
  "daughter",
  "father",
  "mother",
  "grandfather",
  "grandmother",
];

export async function createFamily({ name, relation }) {
  const { data } = await api.post("/api/families", { name, relation });
  return data; // { family_id, name }
}

export async function getFamilyMembers(familyId) {
  const { data } = await api.get(`/api/families/${familyId}/members`);
  return data; // { family_id, name, members: [...] }
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