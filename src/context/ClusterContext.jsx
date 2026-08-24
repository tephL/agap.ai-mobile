import { createContext, useContext, useMemo, useState } from "react";

/**
 * Shared "which cluster is selected" state for the dispatcher tabs.
 *
 * Reports writes it when a cluster is tapped, Map/Action Plan and the
 * Team tab read it. Lives above the Tabs navigator so the selection
 * survives switching between tabs (unlike navigation params).
 *
 * Usage:
 *   const { activeClusterId, setActiveClusterId } = useCluster();
 */
const ClusterContext = createContext({
  activeClusterId: null,
  setActiveClusterId: () => {},
});

export function ClusterProvider({ children }) {
  const [activeClusterId, setActiveClusterId] = useState(null);

  const value = useMemo(
    () => ({ activeClusterId, setActiveClusterId }),
    [activeClusterId]
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
