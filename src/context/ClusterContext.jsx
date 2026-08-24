import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Shared "which cluster is selected" state for the dispatcher tabs.
 *
 * Reports writes it when a cluster is tapped, Map/Action Plan and the
 * Team tab read it. Lives above the Tabs navigator so the selection
 * survives switching between tabs (unlike navigation params).
 *
 * Usage:
 *   const { activeClusterId, setActiveClusterId, focusNonce, focusCluster } =
 *     useCluster();
 *
 * focusCluster(id) additionally bumps focusNonce so screens can react
 * to a cluster being re-selected even when its id didn't change.
 */
const ClusterContext = createContext({
  activeClusterId: null,
  setActiveClusterId: () => {},
  focusNonce: 0,
  focusCluster: () => {},
});

export function ClusterProvider({ children }) {
  const [activeClusterId, setActiveClusterId] = useState(null);
  const [focusNonce, setFocusNonce] = useState(0);

  const focusCluster = useCallback((clusterId) => {
    setActiveClusterId(clusterId);
    setFocusNonce((n) => n + 1);
  }, []);

  const value = useMemo(
    () => ({ activeClusterId, setActiveClusterId, focusNonce, focusCluster }),
    [activeClusterId, focusNonce, focusCluster]
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
