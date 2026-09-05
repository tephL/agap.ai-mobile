import { PMTiles } from "pmtiles";
import ExpoFileSource from "@/lib/pmtiles/ExpoFileSource";
import {
  getLocalUri,
  getRemoteUrl,
  isDownloaded,
} from "@/lib/pmtiles/downloadLayer";
import { getRegisteredPMTiles } from "@/lib/pmtiles/protocol";

// Headless flood_25yr hazard lookup at a geographic point.
//
// WHY HEADLESS (no map, no VectorSource, no toggle):
//   The mapped overlay only resolves via queryRenderedFeatures, which reads
//   *drawn* polygons — so it needs the flood_25yr layer toggled on. During a
//   report the navigation detaches the map's native subtree while GPS is still
//   resolving, so querySourceFeatures (the other native API) crashes with a
//   JS-uncatchable null-handle NPE (see prompt.md). Instead we read the already
//   downloaded .pmtiles archive from disk in pure JS — the pmtiles package
//   returns the *decompressed* MVT bytes for a tile, and we do a classic
//   point-in-polygon over the vector tile's rings ourselves.
//
//   The archive is streamed over byte-range HTTPS as a fallback when it hasn't
//   finished downloading yet (fresh installs) and fully absent only when the
//   device is offline. Any failure degrades to `null` and must never block the
//   report.

const LAYER_ID = "flood_25yr";
const SOURCE_LAYER_NAME = "flood_25yr";
const VAR_PROPERTY = "Var";

// Fall back up to this many zoom levels below the archive's max zoom when the
// tile at the finest available zoom has no data at all (blank tiles in areas
// the dataset only covers at coarser zooms). Each miss is one cheap range read.
const MAX_ZOOM_DESCENT = 4;

// Applies to remote (byte-range over HTTP) lookups only; local disk reads are
// effectively instant. Guards the report flow against a hang on a mutated
// device. getZxy obeys this AbortSignal (ExpoFileSource and FetchSource both
// respect it).
const REMOTE_TIMEOUT_MS = 10_000;

// ---- result cache -----------------------------------------------------------
// Repeated reports from the same ~1.1m cell short-circuit to the cached answer
// instead of re-reading the archive. Bounded so it stays tiny.
const MAX_CACHE_ENTRIES = 64;
// ~1.1m at the equator — far tighter than any flood zone polygon matters.
const CACHE_ROUND_DIGITS = 5;

const resultCache = new Map<string, 1 | 2 | 3 | null>();

function cacheKey(latitude: number, longitude: number): string {
  return `${latitude.toFixed(CACHE_ROUND_DIGITS)},${longitude.toFixed(CACHE_ROUND_DIGITS)}`;
}

// ---- lazily-created PMTiles handles -----------------------------------------
let localInstance: PMTiles | null = null;
let remoteInstance: PMTiles | null = null;

async function getPMTiles(): Promise<PMTiles | null> {
  // Already registered by the map (HazardLayerOverlay) — reuse it.
  const registered = getRegisteredPMTiles(LAYER_ID);
  if (registered) return registered;

  // Local archive on disk (auto-downloaded on first map mount).
  if (!localInstance && (await isDownloaded(LAYER_ID))) {
    localInstance = new PMTiles(new ExpoFileSource(getLocalUri(LAYER_ID)));
  }
  if (localInstance) return localInstance;

  // Byte-range streaming from HuggingFace — covers installs mid-download.
  if (!remoteInstance) {
    remoteInstance = new PMTiles(getRemoteUrl(LAYER_ID));
  }
  return remoteInstance;
}

// ---- point-in-polygon over MVT rings ----------------------------------------
// Non-zero winding rule over the whole ring set — the same rule MapLibre uses
// by default (fill-fill-rule: "nonzero") for these fill layers. Even/odd would
// be wrong here: multi-ring flood features routinely carry overlapping or
// same-level nested polygons, and even-odd flips such a point back "outside".
function ringsContainPoint(
  px: number,
  py: number,
  rings: [number, number][][]
): boolean {
  let winding = 0;
  for (const ring of rings) {
    if (ring.length < 3) continue;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0];
      const yi = ring[i][1];
      const xj = ring[j][0];
      const yj = ring[j][1];
      const isLeft = (xj - xi) * (py - yi) - (px - xi) * (yj - yi);
      if (yi <= py) {
        if (yj > py && isLeft > 0) winding += 1;
      } else if (yj <= py && isLeft < 0) {
        winding -= 1;
      }
    }
  }
  return winding !== 0;
}

// Decode the command-integer geometry into polygon rings (in tile-local units,
// not yet scaled to the layer extent).
function decodePolygonRings(geometry: number[]): [number, number][][] {
  const rings: [number, number][][] = [];
  let cursor = 0;
  let command = 0;
  let count = 0;
  let cx = 0;
  let cy = 0;
  let current: [number, number][] | null = null;

  const readCommand = () => {
    const value = geometry[cursor++];
    command = value & 0x07;
    count = value >> 3;
  };

  const readDelta = (): [number, number] => {
    let n = geometry[cursor++];
    cx += (n >>> 1) ^ -(n & 1);
    n = geometry[cursor++];
    cy += (n >>> 1) ^ -(n & 1);
    return [cx, cy];
  };

  readCommand();
  while (count > 0 && cursor < geometry.length) {
    if (command === 1) {
      // MoveTo
      if (current) rings.push(current);
      current = [];
      readDelta();
      current.push([cx, cy]);
      count -= 1;
      if (count === 0) readCommand();
    } else if (command === 2) {
      // LineTo
      readDelta();
      current?.push([cx, cy]);
      count -= 1;
      if (count === 0) readCommand();
    } else if (command === 7) {
      // ClosePath
      count -= 1;
      if (count === 0) readCommand();
    } else {
      break;
    }
  }
  if (current) rings.push(current);
  return rings;
}

// ---- MVT (Mapbox Vector Tile) decoder ---------------------------------------
// Minimal protobuf reader for exactly the Tile/Layer/Feature/Value messages we
// need. Chosen over the @mapbox/vector-tile dependency to keep the app's
// dependency surface unchanged; the spec is small and stable.

interface MVTFeature {
  type: number;
  tags: number[];
  geometry: number[];
}

interface MVTLayer {
  name: string;
  extent: number;
  keys: string[];
  values: (number | string | boolean | null)[];
  features: MVTFeature[];
}

function zigzagDecode(n: number): number {
  return (n >>> 1) ^ -(n & 1);
}

function decodeUtf8(bytes: Uint8Array): string {
  let out = "";
  for (let i = 0; i < bytes.length; i += 1) {
    out += String.fromCharCode(bytes[i]);
  }
  return decodeURIComponent(escape(out));
}

class ProtoReader {
  private data: Uint8Array;
  private view: DataView;
  pos = 0;

  constructor(data: Uint8Array) {
    this.data = data;
    this.view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  }

  get done(): boolean {
    return this.pos >= this.data.length;
  }

  varint(): number {
    let result = 0;
    let shift = 0;
    while (this.pos < this.data.length) {
      const byte = this.data[this.pos];
      this.pos += 1;
      result |= (byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result >>> 0;
      shift += 7;
    }
    throw new Error("Malformed varint");
  }

  field(): { num: number; wire: number } {
    const tag = this.varint();
    return { num: tag >>> 3, wire: tag & 0x07 };
  }

  bytes(): Uint8Array {
    const len = this.varint();
    if (this.pos + len > this.data.length) {
      throw new Error("Truncated length-delimited field");
    }
    const sub = this.data.subarray(this.pos, this.pos + len);
    this.pos += len;
    return sub;
  }

  float(): number {
    if (this.pos + 4 > this.data.length) throw new Error("Truncated float");
    const value = this.view.getFloat32(this.pos, true);
    this.pos += 4;
    return value;
  }

  double(): number {
    if (this.pos + 8 > this.data.length) throw new Error("Truncated double");
    const value = this.view.getFloat64(this.pos, true);
    this.pos += 8;
    return value;
  }
}

function skipField(reader: ProtoReader, wire: number): void {
  switch (wire) {
    case 0:
      reader.varint();
      break;
    case 1:
      // 64-bit: reader has no positional skip, consume 8 bytes as a double.
      reader.double();
      break;
    case 2:
      reader.bytes();
      break;
    case 5:
      reader.float();
      break;
    default:
      throw new Error(`Unsupported protobuf wire type ${wire}`);
  }
}

function readPackedVarints(bytes: Uint8Array, out: number[]): void {
  const sub = new ProtoReader(bytes);
  while (!sub.done) out.push(sub.varint());
}

function decodeValue(bytes: Uint8Array): MVTLayer["values"][number] | null {
  const reader = new ProtoReader(bytes);
  while (!reader.done) {
    const field = reader.field();
    switch (field.num) {
      case 1:
        if (field.wire === 2) return decodeUtf8(reader.bytes());
        skipField(reader, field.wire);
        break;
      case 2:
        if (field.wire === 5) return reader.float();
        skipField(reader, field.wire);
        break;
      case 3:
        if (field.wire === 1) return reader.double();
        skipField(reader, field.wire);
        break;
      case 4:
      case 5:
        if (field.wire === 0) return reader.varint();
        skipField(reader, field.wire);
        break;
      case 6:
        if (field.wire === 0) return zigzagDecode(reader.varint());
        skipField(reader, field.wire);
        break;
      case 7:
        if (field.wire === 0) return reader.varint() !== 0;
        skipField(reader, field.wire);
        break;
      default:
        skipField(reader, field.wire);
    }
  }
  return null;
}

function decodeFeature(bytes: Uint8Array): MVTFeature {
  const reader = new ProtoReader(bytes);
  const feature: MVTFeature = { type: 0, tags: [], geometry: [] };
  while (!reader.done) {
    const field = reader.field();
    switch (field.num) {
      case 1:
        if (field.wire === 0) reader.varint();
        else skipField(reader, field.wire);
        break;
      case 2:
        if (field.wire === 0) feature.tags.push(reader.varint());
        else if (field.wire === 2) readPackedVarints(reader.bytes(), feature.tags);
        else skipField(reader, field.wire);
        break;
      case 3:
        if (field.wire === 0) feature.type = reader.varint();
        else skipField(reader, field.wire);
        break;
      case 4:
        if (field.wire === 0) feature.geometry.push(reader.varint());
        else if (field.wire === 2) readPackedVarints(reader.bytes(), feature.geometry);
        else skipField(reader, field.wire);
        break;
      default:
        skipField(reader, field.wire);
    }
  }
  return feature;
}

function decodeTile(bytes: Uint8Array): MVTLayer[] {
  const reader = new ProtoReader(bytes);
  const layers: MVTLayer[] = [];
  while (!reader.done) {
    const field = reader.field();
    if (field.num === 3 && field.wire === 2) {
      layers.push(decodeLayer(reader.bytes()));
    } else {
      skipField(reader, field.wire);
    }
  }
  return layers;
}

function decodeLayer(bytes: Uint8Array): MVTLayer {
  const reader = new ProtoReader(bytes);
  const layer: MVTLayer = {
    name: "",
    extent: 4096,
    keys: [],
    values: [],
    features: [],
  };
  while (!reader.done) {
    const field = reader.field();
    switch (field.num) {
      case 1:
        if (field.wire === 2) layer.name = decodeUtf8(reader.bytes());
        else skipField(reader, field.wire);
        break;
      case 2:
        if (field.wire === 2) layer.features.push(decodeFeature(reader.bytes()));
        else skipField(reader, field.wire);
        break;
      case 3:
        if (field.wire === 2) layer.keys.push(decodeUtf8(reader.bytes()));
        else skipField(reader, field.wire);
        break;
      case 4:
        if (field.wire === 2) {
          const value = decodeValue(reader.bytes());
          layer.values.push(value ?? null);
        } else skipField(reader, field.wire);
        break;
      case 5:
        if (field.wire === 0) layer.extent = reader.varint();
        else skipField(reader, field.wire);
        break;
      default:
        skipField(reader, field.wire);
    }
  }
  return layer;
}

// ---- hazard value extraction -------------------------------------------------
function featureVar(feature: MVTFeature, layer: MVTLayer): number | null {
  for (let i = 0; i + 1 < feature.tags.length; i += 2) {
    const keyIndex = feature.tags[i];
    const valueIndex = feature.tags[i + 1];
    if (keyIndex >= layer.keys.length || valueIndex >= layer.values.length) break;
    if (layer.keys[keyIndex] !== VAR_PROPERTY) continue;
    const value = Number(layer.values[valueIndex]);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

// `px`/`py` are already scaled to the layer extent (normalized [0,1) * extent).
function hazardLevelFromTile(
  tileData: ArrayBuffer | Uint8Array,
  px: number,
  py: number
): number | null {
  const bytes =
    tileData instanceof Uint8Array ? tileData : new Uint8Array(tileData);
  let layers: MVTLayer[];
  try {
    layers = decodeTile(bytes);
  } catch {
    return null;
  }

  for (const layer of layers) {
    if (layer.name !== SOURCE_LAYER_NAME) continue;
    const extent = layer.extent || 4096;
    for (const feature of layer.features) {
      if (feature.type !== 3) continue; // 3 == POLYGON
      const varValue = featureVar(feature, layer);
      if (varValue == null) continue;
      const rings = decodePolygonRings(feature.geometry);
      if (rings.length === 0) continue;
      const hitX = (px / 4096) * extent;
      const hitY = (py / 4096) * extent;
      if (ringsContainPoint(hitX, hitY, rings)) return varValue;
    }
  }
  return null;
}

function toTilePoint(lng: number, lat: number, z: number) {
  const n = Math.pow(2, z);
  const xf = ((lng + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const yf =
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const x = Math.max(0, Math.min(n - 1, Math.floor(xf)));
  const y = Math.max(0, Math.min(n - 1, Math.floor(yf)));
  return {
    x,
    y,
    px: (xf - Math.floor(xf)) * 4096,
    py: (yf - Math.floor(yf)) * 4096,
  };
}

async function lookup(
  latitude: number,
  longitude: number
): Promise<1 | 2 | 3 | null> {
  const pmtiles = await getPMTiles();
  if (!pmtiles) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REMOTE_TIMEOUT_MS);
  try {
    const header = await pmtiles.getHeader();
    const zMax = header.maxZoom;
    const zMin = Math.max(header.minZoom, zMax - MAX_ZOOM_DESCENT);

    for (let z = zMax; z >= zMin; z -= 1) {
      const { x, y, px, py } = toTilePoint(longitude, latitude, z);
      const response = await pmtiles.getZxy(z, x, y, controller.signal);
      if (!response || !response.data || response.data.byteLength === 0) {
        continue; // no data layer at this zoom for this tile — try coarser
      }
      const level = hazardLevelFromTile(response.data, px, py);
      // Tile has data but the point isn't inside any polygon at this zoom → the
      // point is genuinely outside the mapped flood zone; don't descend further.
      return level != null && [1, 2, 3].includes(level) ? (level as 1 | 2 | 3) : null;
    }
    return null;
  } catch (error) {
    console.log("[flood_25yr] hazard lookup failed at", latitude, longitude, error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function resolveFlood25VarAt({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}): Promise<1 | 2 | 3 | null> {
  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return null;
  }

  const key = cacheKey(latitude, longitude);
  const cached = resultCache.get(key);
  if (cached !== undefined) return cached;

  const level = await lookup(latitude, longitude);

  if (resultCache.size >= MAX_CACHE_ENTRIES) {
    const oldest = resultCache.keys().next().value;
    if (oldest !== undefined) resultCache.delete(oldest);
  }
  resultCache.set(key, level);
  return level;
}