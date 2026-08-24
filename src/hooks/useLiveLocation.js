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
  const latestCoordsRef = useRef(null);

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
        latestCoordsRef.current = seeded;
      }

      subscription = await Location.watchPositionAsync(
        WATCH_OPTIONS,
        (location) => {
          if (cancelled) return;
          const coords = toCoords(location);
          if (coords) {
            latestCoordsRef.current = coords;
          }
        }
      );
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  const getCachedCoords = useCallback(() => latestCoordsRef.current, []);

  const resolveCoords = useCallback(async () => {
    if (latestCoordsRef.current) {
      return latestCoordsRef.current;
    }

    const lastKnown = await fetchLastKnownCoords();
    if (lastKnown) {
      latestCoordsRef.current = lastKnown;
      return lastKnown;
    }

    const fresh = await fetchCurrentCoordsWithTimeout();
    if (fresh) {
      latestCoordsRef.current = fresh;
    } else {
      console.log("no location available");
    }
    return fresh;
  }, []);

  return { locationGranted, getCachedCoords, resolveCoords };
}
