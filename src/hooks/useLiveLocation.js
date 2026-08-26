import { useCallback, useEffect, useRef, useState } from "react";
import * as Location from "expo-location";

const WATCH_OPTIONS = {
  accuracy: Location.Accuracy.Balanced,
  distanceInterval: 5,
};

const CURRENT_FIX_TIMEOUT_MS = 10000;

function toCoords(locationObject) {
  if (
    !locationObject ||
    locationObject.coords?.latitude == null ||
    locationObject.coords?.longitude == null
  ) {
    return null;
  }
  return {
    latitude: locationObject.coords.latitude,
    longitude: locationObject.coords.longitude,
  };
}

async function fetchLastKnownCoords() {
  try {
    return toCoords(await Location.getLastKnownPositionAsync());
  } catch {
    return null;
  }
}

function fetchCurrentCoordsWithTimeout() {
  return Promise.race([
    Location.getCurrentPositionAsync(WATCH_OPTIONS).then(toCoords),
    new Promise((resolve) =>
      setTimeout(() => resolve(null), CURRENT_FIX_TIMEOUT_MS)
    ),
  ]).catch(() => null);
}

export default function useLiveLocation() {
  const [locationGranted, setLocationGranted] = useState(false);
  // Reactive mirror of the ref below — consumers that render from the
  // position (hazard corridors/routes) subscribe to this; promise-based
  // consumers keep using getCachedCoords/resolveCoords.
  const [coords, setCoords] = useState(null);
  const latestCoordsRef = useRef(null);

  const updateCoords = useCallback((next) => {
    if (!next) return;
    latestCoordsRef.current = next;
    setCoords((prev) =>
      prev &&
      prev.latitude === next.latitude &&
      prev.longitude === next.longitude
        ? prev
        : next
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    let subscription = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (cancelled) return;

      const granted = status === "granted";
      setLocationGranted(granted);
      if (!granted) {
        console.log("permission denied");
        return;
      }

      const seeded = await fetchLastKnownCoords();
      if (!cancelled && seeded) {
        updateCoords(seeded);
      }

      subscription = await Location.watchPositionAsync(
        WATCH_OPTIONS,
        (location) => {
          if (cancelled) return;
          updateCoords(toCoords(location));
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [updateCoords]);

  const getCachedCoords = useCallback(() => latestCoordsRef.current, []);

  const resolveCoords = useCallback(async () => {
    if (latestCoordsRef.current) {
      return latestCoordsRef.current;
    }

    const lastKnown = await fetchLastKnownCoords();
    if (lastKnown) {
      updateCoords(lastKnown);
      return lastKnown;
    }

    const fresh = await fetchCurrentCoordsWithTimeout();
    if (fresh) {
      updateCoords(fresh);
    } else {
      console.log("no location available");
    }
    return fresh;
  }, [updateCoords]);

  return { locationGranted, coords, getCachedCoords, resolveCoords };
}
