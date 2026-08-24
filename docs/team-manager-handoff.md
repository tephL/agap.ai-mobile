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
POST  /api/dispatcher/teams                     → name, contact_number, location_text, latitude, longitude
GET   /api/dispatcher/teams/:teamId/assignment  → teamId
GET   /api/dispatcher/clusters                  → status   (query, optional: open|saved|resolved)
PATCH /api/dispatcher/clusters/:id/status       → id, status          (open|saved|resolved)
POST  /api/dispatcher/assignments               → team_id, cluster_id
PATCH /api/dispatcher/assignments/:id/status    → id, status          (pending|dispatched|resolved)
```

- Validation failures return **422** with `{ errors: [...] }`.
- Teams/clusters come back with `lat` / `lng` keys (already aliased server-side).
- Cluster objects include: `cluster_id, name, lat, lng, priority, report_count, people_affected`.

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

- Provider mounts in `src/app/(admin)/_layout.jsx`.
- Reports tab sets `activeClusterId` when a cluster is tapped.
- Map tab reads it to center the map; Action Plan reads it for `clusterId`.
- Team Manager currently receives cluster via URL param (`assignClusterId`)
  and will migrate to context when the provider lands.

## Status enums (API rejects anything else)

- Team: `available | busy | offline`
- Cluster: `open | saved | resolved`
- Assignment: `pending → dispatched → resolved`
