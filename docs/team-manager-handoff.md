# Team Manager Handoff (Reports & Map tabs)

For whoever builds the **Reports** and **Map** tabs. Everything team-related
lives behind the seams below — you never need to read or modify Team Manager
code, and it never needs yours.

## Ownership boundaries

| Yours (Reports/Map) | Team Manager's |
|---|---|
| Cluster list UI on Reports tab | `src/app/(admin)/team.jsx` (Teams tab) |
| Map + Action Plan / Report Summary sub-tabs | `src/app/team-detail.jsx` |
| "Assign Team" button placement | `src/components/dispatcher/*` incl. `AssignTeamModal` |
| Cluster React Context provider | `src/services/teamService.js`, `src/utils/haversine.js` |

Do **not** edit: `.env`, database migrations, `teamService.js` internals
(import its functions; ask if you need a new one).

## API contract (`/api/dispatcher`, requires dispatcher token, role_id 911)

```
GET   /api/dispatcher/teams                     → (none)
POST  /api/dispatcher/teams                     → name, contact_number, latitude, longitude
GET   /api/dispatcher/teams/:teamId/assignment  → teamId
GET   /api/dispatcher/clusters                  → status   (query, optional: open|saved|resolved)
PATCH /api/dispatcher/clusters/:id/status       → id, status          (open|saved|resolved)
POST  /api/dispatcher/assignments               → team_id, cluster_id
PATCH /api/dispatcher/assignments/:id/status    → id, status          (pending|dispatched|resolved)
```

- Validation failures return **422** with `{ errors: [...] }`. Other
  failures return `{ error: "..." }` — read it via
  `assignmentError(err, fallback)` from `teamService.js` instead of
  `err.message`, which only yields axios generics like
  "Request failed with status code 409".
- Everything under `/api/dispatcher` is scoped to the dispatcher's own
  city (resolved server-side via users → people → cities). Teams and
  clusters from other cities are never returned, and cross-city
  assignments are rejected with a 404.
- Teams come back with `location_text` set to the team's **city name**
  (the schema no longer stores free-text locations) and `status`
  derived server-side: `offline` when archived, `busy` while it has an
  active assignment (`teams.assigned_to`), else `available`. Newly
  created teams are always `available` and land in the dispatcher's
  city.
- Teams/clusters come back with `lat` / `lng` keys (already aliased server-side).
- Cluster objects include: `cluster_id, name, lat, lng, priority, report_count, people_affected`.
  `name` is a server-generated label (`Cluster #<id>`) — the live
  clusters table has no name column.

## Easiest integration: `AssignTeamModal`

The popup your Action Plan needs already exists. One import, no team logic:

```jsx
import AssignTeamModal from "@/components/dispatcher/AssignTeamModal";

// state
const [assignOpen, setAssignOpen] = useState(false);

// your Assign Team button
<Button title="Assign a Team" onPress={() => setAssignOpen(true)} />

// the popup itself
<AssignTeamModal
  visible={assignOpen}
  clusterId={activeClusterId}        // required (number or numeric string)
  clusterName={activeClusterName}    // optional display fallback
  onClose={() => setAssignOpen(false)}
  onAssigned={(assignment, team) => {
    // refresh your cluster UI here; assignment.team_id / .cluster_id / .status
  }}
/>
```

It loads teams itself (nearest-first when coordinates exist), shows
Assign/Call per team, and only allows assigning `available` teams.

## React Context proposal

Shared so all three tabs agree on which cluster is selected:

```jsx
// src/context/ClusterContext.jsx  (owner: Reports/Map side)
const ClusterContext = createContext({ activeClusterId: null, setActiveClusterId: () => {} });
```

- Provider mounts in `src/app/_layout.jsx` (root), so stack screens
  outside the tabs (e.g. `team-detail`) share the same state.
- Reports tab sets `activeClusterId` when a cluster is tapped.
- Map tab reads it to center the map; Action Plan reads it for `clusterId`.
- `focusTeam(teamId)` (from the Team detail screen) asks the Map tab to
  select the team's pin and fly the camera to its position.
- Team Manager receives cluster via URL param (`assignClusterId`) or
  context (`activeClusterId`).

## Status enums (API rejects anything else)

- Team: `available | busy | offline`
- Cluster: `open | saved | resolved`
- Assignment: `pending → dispatched → resolved` (forward-only; the API
  answers **409** on any regression, e.g. `resolved → dispatched`)

## Assignment lifecycle rules (server-enforced)

- A team can hold only one active (`pending`/`dispatched`) assignment at
  a time; a second `POST /assignments` fails with **409**.
- Resolving an assignment frees the team (`assigned_to` cleared) once it
  has no other active assignment, and **deletes the cluster** when no
  other active assignment references it — resolved clusters disappear
  from `/api/clusters`, `/api/dispatcher/clusters`, and the map. Citizen
  reports themselves are kept; only the cluster and its report links go.
- Marking a cluster `resolved` via `PATCH /clusters/:id/status` also
  resolves its active assignments, frees the responding teams, and
  removes the cluster entirely — teams never stay busy against a
  resolved cluster.
- Teams carry `assigned_to` (the cluster id they are dispatched to), so
  callers can tell which clusters already have a team.
- Deleting empty clusters (server cleanup job) cascades their
  assignments away, so affected teams become `available`.
