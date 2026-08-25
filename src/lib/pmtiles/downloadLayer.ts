import * as FileSystem from "expo-file-system/legacy";
import ExpoFileSource from "./ExpoFileSource";

/**
 * WHY MANUAL DOWNLOADS INSTEAD OF MapLibreGL's offlineManager:
 *
 * The built-in OfflineManager cannot archive PMTiles sources (it only
 * understands regular tile URLs / style packs). So we download the raw
 * .pmtiles archive to app storage ourselves and hand the local file to the
 * map via a `pmtiles://file://...` source URL (see lib/pmtiles/protocol.ts).
 */

// Update here if the dataset moves.
const HUGGINGFACE_BASE_URL =
  "https://huggingface.co/datasets/bettergovph/project-noah-hazard-maps/resolve/main/PMTiles/layers";

export type HazardType = "flood" | "landslide" | "debris-flow" | "storm-surge";

export interface HazardLayerConfig {
  /** Stable identifier used for file names, registration and lookups. */
  id: string;
  /** Human-readable label for UI. */
  label: string;
  /** File name on HuggingFace. Verified against the dataset on 2026-08-24. */
  remoteFileName: string;
  /** Vector source-layer name inside the PMTiles archive. */
  sourceLayerId: string;
  hazardType: HazardType;
  /** Rounded display size; also used to flag oversized downloads in UI. */
  approxSizeMB: number;
}

export const HAZARD_LAYERS: HazardLayerConfig[] = [
  {
    id: "flood_5yr",
    label: "Flood Risk (5-Year Return Period)",
    remoteFileName: "flood_5yr.pmtiles",
    sourceLayerId: "flood_5yr",
    hazardType: "flood",
    approxSizeMB: 486,
  },
  {
    id: "flood_25yr",
    label: "Flood Risk (25-Year Return Period)",
    remoteFileName: "flood_25yr.pmtiles",
    sourceLayerId: "flood_25yr",
    hazardType: "flood",
    approxSizeMB: 563,
  },
  {
    id: "flood_100yr",
    label: "Flood Risk (100-Year Return Period)",
    remoteFileName: "flood_100yr.pmtiles",
    sourceLayerId: "flood_100yr",
    hazardType: "flood",
    approxSizeMB: 969,
  },
  {
    id: "landslide",
    label: "Landslide Susceptibility",
    remoteFileName: "landslide.pmtiles",
    sourceLayerId: "landslide",
    hazardType: "landslide",
    // ~2.65GB: exceeds the ~1.8GB risk threshold documented in ExpoFileSource.
    approxSizeMB: 2713,
  },
];

const LAYERS_BY_ID = new Map(HAZARD_LAYERS.map((layer) => [layer.id, layer]));

/** Files larger than this are flagged as risky for JS-side range reads on Android. */
export const JS_RANGE_READ_RISK_BYTES = 1.8 * 1024 * 1024 * 1024;

function getLayersDirectory(): string {
  if (!FileSystem.documentDirectory) {
    throw new Error("documentDirectory unavailable — expo-file-system not mounted yet.");
  }
  return `${FileSystem.documentDirectory}hazard-layers/`;
}

export function getHazardLayer(layerId: string): HazardLayerConfig {
  const layer = LAYERS_BY_ID.get(layerId);
  if (!layer) {
    throw new Error(`Unknown hazard layer: ${layerId}`);
  }
  return layer;
}

export function getRemoteUrl(layerId: string): string {
  return `${HUGGINGFACE_BASE_URL}/${getHazardLayer(layerId).remoteFileName}`;
}

/**
 * Source URL that streams tiles straight from the remote archive. MapLibre
 * Native reads PMTiles over HTTP with byte-range requests, so only the tiles
 * covering the visible area are fetched — no full download required.
 */
export function getRemoteSourceUrl(layerId: string): string {
  return `pmtiles://${getRemoteUrl(layerId)}`;
}

export function getLocalUri(layerId: string): string {
  return `${getLayersDirectory()}${layerId}.pmtiles`;
}

async function ensureLayersDirectory(): Promise<void> {
  const dir = getLayersDirectory();
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  }
}

/**
 * True when the archive appears fully present locally. We deliberately keep
 * this cheap (exists + non-empty); full integrity is verified after download
 * by reading the PMTiles magic number instead of trusting sizes alone.
 */
export async function isDownloaded(layerId: string): Promise<boolean> {
  try {
    const info = await FileSystem.getInfoAsync(getLocalUri(layerId));
    return info.exists && !info.isDirectory && info.size > 0;
  } catch {
    return false;
  }
}

/**
 * Downloads the layer from HuggingFace, reporting progress 0..100.
 * Resumable-safe in the practical sense: if the file is already fully
 * present it resolves immediately without re-downloading. A failed or
 * cancelled attempt removes the partial file so the next run starts clean.
 */
export async function downloadLayer(
  layerId: string,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const config = getHazardLayer(layerId);
  const localUri = getLocalUri(config.id);

  if (await isDownloaded(config.id)) {
    return localUri;
  }

  await ensureLayersDirectory();

  const resumable = FileSystem.createDownloadResumable(
    getRemoteUrl(config.id),
    localUri,
    {},
    (progress) => {
      if (!onProgress || progress.totalBytesExpectedToWrite <= 0) return;
      const pct = Math.min(
        100,
        Math.floor((progress.totalBytesWritten / progress.totalBytesExpectedToWrite) * 100),
      );
      onProgress(pct);
    },
  );

  try {
    const result = await resumable.downloadAsync();
    if (!result || !(await isDownloaded(config.id))) {
      throw new Error(`Download of ${config.remoteFileName} did not complete.`);
    }
    if (!(await verifyArchive(localUri))) {
      throw new Error(`${config.remoteFileName} is not a valid PMTiles archive.`);
    }
    return localUri;
  } catch (error) {
    // Never leave a partial file behind: isDownloaded() would then report a
    // broken archive as ready and we'd never re-download it.
    try {
      await FileSystem.deleteAsync(localUri, { idempotent: true });
    } catch {
      // best-effort cleanup; original error matters more
    }
    throw error;
  }
}

export async function deleteLayer(layerId: string): Promise<void> {
  await FileSystem.deleteAsync(getLocalUri(layerId), { idempotent: true });
}

/**
 * Cheap structural check: every PMTiles v3 archive starts (little-endian)
 * with the magic number 0x504D ("PM") at byte 0, followed by spec version.
 */
export async function verifyArchive(localUri: string): Promise<boolean> {
  try {
    const { data } = await new ExpoFileSource(localUri).getBytes(0, 16);
    const view = new DataView(data);
    return view.getUint16(0, true) === 19792;
  } catch {
    return false;
  }
}
