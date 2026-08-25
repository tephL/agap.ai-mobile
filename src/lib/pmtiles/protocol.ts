import { PMTiles, Protocol } from "pmtiles";
import ExpoFileSource from "./ExpoFileSource";

/**
 * HOW TILES REACH THE MAP — READ BEFORE "SIMPLIFYING" THIS FILE:
 *
 * There is NO `MapLibreGL.addProtocol()` in @maplibre/maplibre-react-native
 * v11. Tile requests are executed by MapLibre Native (C++), not JS, so a
 * maplibre-gl-js-style JS protocol handler cannot be hooked in; the
 * maintainers explicitly declined to add one
 * (https://github.com/maplibre/maplibre-react-native/issues/28).
 *
 * Instead, MapLibre Native itself understands `pmtiles://` URLs since
 * Android SDK 11.7 / iOS 6.10 — including byte-range reads from device
 * storage via `pmtiles://file:///...` (the versions bundled by
 * maplibre-react-native 11.x are well past those). That is why offline
 * rendering here is: download archive -> point VectorSource at
 * `pmtiles://<local file uri>` (see pmtilesUrlFor below).
 *
 * The `Protocol`/`PMTiles` instances registered through this module are for
 * JS-side access (header/metadata/tile reads via lib/pmtiles/*.ts) and keep
 * this module's surface identical to a web/maplibre-gl-js setup, where you
 * would additionally call `maplibregl.addProtocol("pmtiles", protocol.tile)`.
 * Do NOT try to call addProtocol on MapLibreRN — it does not exist.
 */

const protocol = new Protocol();

/** Set once the first layer has been registered; guards repeat setup. */
let initialized = false;

/** layerId -> PMTiles instance backed by the local file. */
const instances = new Map<string, PMTiles>();

/**
 * URL for a VectorSource pointing at a downloaded archive. `localUri` is an
 * absolute file:// URI (e.g. FileSystem.documentDirectory + ...), so the
 * result is the `pmtiles://file:///...` form MapLibre Native requires for
 * device-storage archives.
 */
export function pmtilesUrlFor(localUri: string): string {
  return `pmtiles://${localUri}`;
}

/**
 * Idempotently exposes a local archive to the pmtiles protocol registry so
 * JS-side code can read it, and marks the protocol as initialized. Safe to
 * call multiple times for the same or different layers.
 */
export function registerLocalPMTiles(layerId: string, localUri: string): void {
  if (!initialized) {
    // One-time hook point for anything that must run before first use.
    // Kept as a guard so future code can never double-register globals.
    initialized = true;
  }

  if (!instances.has(layerId)) {
    const instance = new PMTiles(new ExpoFileSource(localUri));
    instances.set(layerId, instance);
    protocol.add(instance);
  }
}

export function unregisterLocalPMTiles(layerId: string): void {
  const instance = instances.get(layerId);
  if (instance) {
    protocol.tiles.delete(instance.source.getKey());
    instances.delete(layerId);
  }
}

/** JS-side access to a registered archive (headers/metadata/getZxy). */
export function getRegisteredPMTiles(layerId: string): PMTiles | undefined {
  return instances.get(layerId);
}

export default protocol;
