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
  location_text,
}) {
  const { data } = await api.post("/api/dispatcher/teams", {
    name,
    contact_number,
    location_text,
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
