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
// ---------------------------------------------------------------------------
// Bridge-cost mitigation for JS-side reads.
//
// Every getBytes() crosses the RN bridge twice (base64 string out of native,
// decoded ArrayBuffer back in JS), which is expensive per call and brutal
// when a burst of tile requests lands at once (fast pan/zoom). Two cheap
// mitigations that leave the Source interface untouched:
//
// 1. LRU cache of recently read byte ranges, keyed by `offset:length`.
//    Re-requesting the same range (header re-reads, tile re-fetches after
//    gesture flings back over the same area) becomes a pure memory copy.
// 2. A semaphore capping concurrent disk reads so a burst of requests queues
//    instead of flooding the bridge simultaneously.
// ---------------------------------------------------------------------------

/** In-flight FileSystem.readAsStringAsync calls allowed at once. */
const MAX_CONCURRENT_READS = 4;
/** Recently read ranges kept decoded in memory (per source instance). */
const MAX_CACHE_ENTRIES = 48;
/** Ranges larger than this are read but not cached (protects memory). */
const MAX_CACHED_RANGE_BYTES = 4 * 1024 * 1024;

/**
 * Tiny LRU: a Map keyed by "offset:length". Map iteration order is insertion
 * order, so refreshing an entry (delete + re-set) and evicting the first key
 * gives exact LRU semantics without extra bookkeeping.
 */
class RangeCache {
  private entries = new Map<string, ArrayBuffer>();

  private key(offset: number, length: number): string {
    return `${offset}:${length}`;
  }

  get(offset: number, length: number): ArrayBuffer | undefined {
    const key = this.key(offset, length);
    const hit = this.entries.get(key);
    if (hit === undefined) return undefined;
    // Refresh recency.
    this.entries.delete(key);
    this.entries.set(key, hit);
    return hit;
  }

  put(offset: number, length: number, data: ArrayBuffer): void {
    if (data.byteLength > MAX_CACHED_RANGE_BYTES) return;
    const key = this.key(offset, length);
    this.entries.delete(key); // replace = refresh position too
    this.entries.set(key, data);
    while (this.entries.size > MAX_CACHE_ENTRIES) {
      const oldest = this.entries.keys().next().value;
      if (oldest === undefined) break;
      this.entries.delete(oldest);
    }
  }
}

/**
 * Counts in-flight reads and parks excess callers in a FIFO queue, handing
 * each a release function as earlier reads finish.
 */
class ReadLimiter {
  private active = 0;
  private readonly waiters: (() => void)[] = [];

  async acquire(): Promise<() => void> {
    if (this.active < MAX_CONCURRENT_READS) {
      this.active += 1;
      return () => this.release();
    }
    return new Promise((resolve) => {
      this.waiters.push(() => {
        this.active += 1;
        resolve(() => this.release());
      });
    });
  }

  private release(): void {
    this.active -= 1;
    this.waiters.shift()?.();
  }
}

const sharedReadLimiter = new ReadLimiter();

class ExpoFileSource implements Source {
  private readonly uri: string;
  private readonly cache = new RangeCache();

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

    const cached = this.cache.get(offset, length);
    if (cached) {
      // Return a copy: callers may hold/parse buffers long-term and must not
      // alias the cache entry.
      return { data: cached.slice(0) };
    }

    // Queue behind other in-flight reads instead of hammering the bridge.
    const release = await sharedReadLimiter.acquire();
    try {
      // Aborted while waiting in the queue.
      if (signal?.aborted) {
        throw new Error(`Aborted before reading ${this.uri} [${offset}, ${offset + length})`);
      }

      // A request for the same range may have completed while we were
      // queued — prefer its result over hitting the disk again.
      const raced = this.cache.get(offset, length);
      if (raced) {
        return { data: raced.slice(0) };
      }

      const base64 = await FileSystem.readAsStringAsync(this.uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length,
      });

      if (signal?.aborted) {
        throw new Error(`Aborted while reading ${this.uri} [${offset}, ${offset + length})`);
      }

      const data = base64ToArrayBuffer(base64);
      this.cache.put(offset, length, data);
      return { data: data.slice(0) };
    } finally {
      release();
    }
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
