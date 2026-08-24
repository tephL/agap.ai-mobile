import * as FileSystem from "expo-file-system/legacy";
import type { RangeResponse, Source } from "pmtiles";

/**
 * WHY A LOCAL-FILE SOURCE INSTEAD OF MapLibreGL's offlineManager:
 *
 * `@maplibre/maplibre-react-native`'s OfflineManager only understands plain
 * tile URLs / style packs — it cannot archive a custom byte-range format like
 * PMTiles. So offline support is done manually: the raw .pmtiles file is
 * downloaded with expo-file-system, and tiles are read out of it later.
 *
 * On @maplibre/maplibre-react-native v11 the actual rendering does NOT go
 * through this class: MapLibre Native (Android SDK >= 11.7, iOS >= 6.10)
 * natively understands `pmtiles://file:///...` source URLs and performs its
 * own 64-bit byte-range reads (see lib/pmtiles/protocol.ts). This class is
 * used on the JS side to validate/inspect downloaded archives (magic number,
 * header, metadata) without a native round-trip, and it doubles as the
 * drop-in `Source` implementation should this code ever run against
 * maplibre-gl-js (web), where `protocol.tile` + addProtocol is the norm.
 *
 * ANDROID >2GB CAVEAT (do not remove without re-testing):
 * FileSystem.readAsStringAsync takes `position`/`length` as JS numbers, but
 * the underlying Android stream plumbing has historically been 32-bit, so
 * offsets beyond ~2GiB are unreliable. Any archive over ~1.8GB is therefore
 * risky for JS-side reads: as of writing landslide.pmtiles (~2.65GB) exceeds
 * that threshold. Rendering is unaffected (native reads are 64-bit); only
 * JS-side header/metadata inspection of such huge files may misbehave.
 */
class ExpoFileSource implements Source {
  private readonly uri: string;

  constructor(uri: string) {
    this.uri = uri;
  }

  getKey(): string {
    return this.uri;
  }

  async getBytes(
    offset: number,
    length: number,
    signal?: AbortSignal,
  ): Promise<RangeResponse> {
    if (signal?.aborted) {
      throw new Error(`Aborted before reading ${this.uri} [${offset}, ${offset + length})`);
    }

    const base64 = await FileSystem.readAsStringAsync(this.uri, {
      encoding: FileSystem.EncodingType.Base64,
      position: offset,
      length,
    });

    if (signal?.aborted) {
      throw new Error(`Aborted while reading ${this.uri} [${offset}, ${offset + length})`);
    }

    return { data: base64ToArrayBuffer(base64) };
  }
}

/**
 * Decode a base64 string into an ArrayBuffer.
 * Uses atob when present; falls back to a lookup-table decoder because
 * JavaScript runtimes embedded in React Native have not always shipped it.
 */
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const cleaned = base64.replace(/[\s=]+$/, "");
  const padding = base64.length - cleaned.length;

  if (typeof atob === "function") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  const table = getBase64LookupTable();
  const bytes = new Uint8Array(cleaned.length * 0.75 - padding);
  let byteIndex = 0;
  let buffer = 0;
  let bitsSoFar = 0;

  for (const char of cleaned) {
    buffer = (buffer << 6) | table[char];
    bitsSoFar += 6;
    if (bitsSoFar >= 8) {
      bitsSoFar -= 8;
      bytes[byteIndex++] = (buffer >> bitsSoFar) & 0xff;
    }
  }

  return bytes.buffer;
}

let base64Table: Record<string, number> | null = null;

function getBase64LookupTable(): Record<string, number> {
  if (base64Table) return base64Table;
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  base64Table = {};
  for (let i = 0; i < alphabet.length; i++) {
    base64Table[alphabet[i]] = i;
  }
  return base64Table;
}

export default ExpoFileSource;
