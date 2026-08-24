import { useEffect, useState } from "react";
import NetInfo from "@react-native-community/netinfo";

/**
 * Tracks live connectivity so UI (the header's live-dot, the offline banner,
 * disabling send, etc.) can react to the device actually being online.
 *
 * isConnected          -> device has a network interface (wifi/cell) up
 * isInternetReachable  -> that interface can actually reach the internet
 *                         (null while NetInfo is still figuring it out)
 * isOnline             -> the single boolean most UI should use
 */
export default function useNetworkStatus() {
  const [state, setState] = useState({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((next) => {
      setState({
        isConnected: !!next.isConnected,
        isInternetReachable: next.isInternetReachable,
      });
    });

    // Prime initial state immediately instead of waiting for the first event.
    NetInfo.fetch().then((next) => {
      setState({
        isConnected: !!next.isConnected,
        isInternetReachable: next.isInternetReachable,
      });
    });

    return () => unsubscribe();
  }, []);

  const isOnline = state.isConnected && state.isInternetReachable !== false;

  return { isOnline, isConnected: state.isConnected, isInternetReachable: state.isInternetReachable };
}
