import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Shared "which cluster is selected" state for the dispatcher tabs.
 *
 * Reports writes it when a cluster is tapped, Map/Action Plan and the
 * Team tab read it. Lives above the Tabs navigator so the selection
 * survives switching between tabs (unlike navigation params).
 *
 * Usage:
 *   const { activeClusterId, setActiveClusterId, focusNonce, focusCluster,
 *           clustersNonce, invalidateClusters,
 *           focusTeamId, focusTeamNonce, focusTeam } = useCluster();
 *
 * focusCluster(id) additionally bumps focusNonce so screens can react
 * to a cluster being re-selected even when its id didn't change.
 *
 * focusTeam(id) is the team equivalent: it stores the team and bumps
 * focusTeamNonce so the Map tab can select the team's pin and fly the
 * camera to its position.
 *
 * invalidateClusters() bumps clustersNonce after any screen mutates
 * clusters (resolve an assignment, dispatch a team, ...) so the Map
 * tab can refetch right away instead of waiting for its poll cycle.
 */
const ClusterContext = createContext({
  activeClusterId: null,
  setActiveClusterId: () => {},
  focusNonce: 0,
  focusCluster: () => {},
  clustersNonce: 0,
  invalidateClusters: () => {},
  focusTeamId: null,
  focusTeamNonce: 0,
  focusTeam: () => {},
});

export function ClusterProvider({ children }) {
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);
  const [clustersNonce, setClustersNonce] = useState(0);
  const [focusTeamId, setFocusTeamId] = useState(null);
  const [focusTeamNonce, setFocusTeamNonce] = useState(0);

  const focusCluster = useCallback((clusterId) => {
    setActiveClusterId(clusterId);
    setFocusNonce((n) => n + 1);
  }, []);

  const invalidateClusters = useCallback(() => {
    setClustersNonce((n) => n + 1);
  }, []);

  const focusTeam = useCallback((teamId) => {
    setFocusTeamId(teamId);
    setFocusTeamNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({
      activeClusterId,
      setActiveClusterId,
      focusNonce,
      focusCluster,
      clustersNonce,
      invalidateClusters,
      focusTeamId,
      focusTeamNonce,
      focusTeam,
    }),
    [
      activeClusterId,
      focusNonce,
      focusCluster,
      clustersNonce,
      invalidateClusters,
      focusTeamId,
      focusTeamNonce,
      focusTeam,
    ]
  );

  return (
    <ClusterContext.Provider value={value}>
      {children}
    </ClusterContext.Provider>
  );
}

export function useCluster() {
  return useContext(ClusterContext);
}
