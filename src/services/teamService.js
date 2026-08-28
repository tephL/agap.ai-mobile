// Dispatcher Teams tab backend client.
//
// Every function here matches the /api/dispatcher endpoints and returns
// the same shapes the UI already consumes (snake_case DB columns).
import { api } from "./api";

export const ASSIGNMENT_STATUSES = ["pending", "dispatched", "resolved"];

export async function getTeams() {
  const { data } = await api.get("/api/dispatcher/teams");
  return data.teams ?? [];
}

export async function createTeam({
  name,
  contact_number,
  latitude,
  longitude,
  is_public = false,
}) {
  const { data } = await api.post("/api/dispatcher/teams", {
    name,
    contact_number,
    latitude,
    longitude,
    is_public,
  });
  return data.team;
}

export async function getOpenClusters() {
  const { data } = await api.get("/api/dispatcher/clusters", {
    params: { status: "open" },
  });
  return data.clusters ?? [];
}

export async function getAssignmentForTeam(teamId) {
  const { data } = await api.get(
    `/api/dispatcher/teams/${teamId}/assignment`
  );
  return data.assignment ?? null;
}

export async function assignTeamToCluster(teamId, clusterId) {
  const { data } = await api.post("/api/dispatcher/assignments", {
    team_id: teamId,
    cluster_id: clusterId,
  });
  return data.assignment;
}

export async function updateAssignmentStatus(assignmentId, status) {
  const { data } = await api.patch(
    `/api/dispatcher/assignments/${assignmentId}/status`,
    { status }
  );
  return data.assignment;
}

// The backend reports failures as { error: "..." } (e.g. 409 "Team already
// has an active assignment"). Axios errors otherwise hide it behind a
// generic message, so screens should show this instead of err.message.
export async function updateClusterStatus(clusterId, status) {
  const { data } = await api.patch(
    `/api/dispatcher/clusters/${clusterId}/status`,
    { status }
  );
  return data.cluster;
}

export function assignmentError(err, fallback) {
  return err?.response?.data?.error ?? fallback;
}

export async function updateTeamVisibility(teamId, is_public) {
  const { data } = await api.patch(`/api/dispatcher/teams/${teamId}`, {
    is_public,
  });
  return data.team;
}

export async function relocateTeam(teamId, latitude, longitude) {
  const { data } = await api.patch(`/api/dispatcher/teams/${teamId}/relocate`, {
    latitude,
    longitude,
  });
  return data.team;
}

export async function getPublicTeams() {
  const { data } = await api.get("/api/public-teams");
  return data.teams ?? [];
}
