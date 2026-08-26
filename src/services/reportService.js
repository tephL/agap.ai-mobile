import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import * as SMS from "expo-sms";
import { api } from "./api";
import { cameraStore } from "../store/cameraStore";

// Recipient for the offline fallback report SMS.
// TODO: move to an env var / config if this ever needs to differ per build.
const OFFLINE_SMS_RECIPIENT = "09089914045";

// Cap on the free-text description in offline mode. Kept short (vs the
// 500-char NOTES_MAX used online) because it has to ride inside a single
// SMS segment alongside the coordinates — see buildOfflineReportSms().
export const OFFLINE_DESCRIPTION_MAX = 100;

// Standard single-segment GSM SMS length. Staying under this avoids the
// message getting split across multiple segments, which is slower and
// less reliable to deliver on a weak/offline-adjacent carrier connection.
const SMS_SEGMENT_LIMIT = 160;

// --- Location cache ---
// In-memory cache so the offline SMS flow doesn't pay for two full GPS fixes
// (once for the character counter on mount, again at submit time).  The hold
// gesture pre-fetches location via getDeviceLocation() in the background
// (CustomTabBar.onHoldComplete), warming this cache before the report screen
// even mounts.  The 5-minute TTL covers the entire SOS typing session so
// no second GPS fix is needed.
let _cachedLocation = null;    // { latitude, longitude }
let _cachedTimestamp = 0;      // Date.now() when _cachedLocation was set
const LOCATION_CACHE_TTL_MS = 300_000; // 5 minutes — covers the full SOS typing session

// Permission / services status cached after the first successful check so
// subsequent calls within the same session skip the async checks entirely.
let _servicesEnabled = false;
let _permissionGranted = false;

function guessMimeType(filename) {
  const match = /\.(\w+)$/.exec(filename ?? "");
  const ext = match ? match[1].toLowerCase() : "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  return "image/jpeg";
}

/**
 * Resizes + compresses the photo before upload.
 * - Caps the longest edge at 1600px (plenty for report photos, way less
 *   data than a 12MP camera capture).
 * - Re-encodes as JPEG at 70% quality regardless of source format, since
 *   JPEG compresses photographic content far better than PNG for this use case.
 */
async function compressForUpload(uri) {
  const result = await ImageManipulator.manipulateAsync(
    uri,
    [{ resize: { width: 1600 } }], // height auto-scales to preserve aspect ratio
    {
      compress: 0.7,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  );
  return result.uri; // new local file URI, already compressed
}

export async function uploadReportPhoto(uri) {
  const compressedUri = await compressForUpload(uri);

  const filename = compressedUri.split("/").pop() || `report-${Date.now()}.jpg`;
  const type = guessMimeType(filename);

  const formData = new FormData();
  // Field name must match the server's upload.array('images', 3) — it was
  // previously "image" (singular), which Multer rejected as an unexpected
  // file and reported (misleadingly) as "up to 3 images" even for 1 photo.
  formData.append("images", {
    uri: compressedUri,
    name: filename,
    type,
  });

  const response = await api.post("/api/reports/upload", formData, {
    timeout: 60000,
  });

  return response.data;
}

export async function getReportById(reportId) {
  const response = await api.get(`/api/reports/${reportId}`);
  return response.data;
}

export async function attachReportDescription(description) {
  const response = await api.post("/api/reports/description", {
    description,
  });
  return response.data;
}

// Tags an error with a `code` so the UI can show the right fix — "open
// Location Services" and "open app permission settings" are different
// screens on both iOS and Android, so a single generic message isn't enough.
function locationError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/**
 * Requests the device's current location and posts it to /api/reports/location,
 * which is the ONLY backend call that creates the report row. Everything else
 * (/upload, /description) looks up "the user's most recent report" and fails
 * with "No report to attach ... to" if this hasn't completed successfully yet.
 *
 * Call this once, right when the hold-to-report gesture completes (see
 * CustomTabBar's onHoldComplete), and register the returned promise with
 * cameraStore.setLocationRequest() so ReportScreen can await it before
 * calling uploadReportPhoto / attachReportDescription.
 */
export async function requestReportLocation() {
  cameraStore.setLocationStatus("pending");
  try {
    // Distinct from app permission: this is the device-wide GPS/Location
    // Services toggle. If it's off, requesting permission either does
    // nothing useful or shows a confusing prompt, so check it first.
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw locationError(
        "SERVICES_DISABLED",
        "Location services are turned off on this device."
      );
    }

    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      throw locationError(
        "PERMISSION_DENIED",
        "Location permission was denied."
      );
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    await api.post("/api/reports/location", {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    });

    cameraStore.setLocationStatus("success");
  } catch (err) {
    cameraStore.setLocationStatus("error", err);
    throw err;
  }
}

// --- Offline fallback (no backend reachable) ---

/**
 * Gets the device's raw GPS position WITHOUT calling the backend — used
 * only when the device is offline, so /api/reports/location isn't
 * reachable anyway. Same permission/services checks as
 * requestReportLocation(), reusing the same `code`s so the report screen's
 * existing error handling (open Settings / retry copy) still applies.
 *
 * Results are cached for LOCATION_CACHE_TTL_MS (5 minutes) so the offline
 * SMS flow (character counter on mount → actual send on submit) doesn't pay
 * for two full GPS fixes.  The hold gesture in CustomTabBar fires this in
 * the background so the cache is already warm when the report screen mounts.
 */
export async function getDeviceLocation() {
  // Return cached location instantly when still fresh — no GPS hardware
  // access, no permission checks, no async overhead.
  if (
    _cachedLocation &&
    Date.now() - _cachedTimestamp < LOCATION_CACHE_TTL_MS
  ) {
    return _cachedLocation;
  }

  // Permission/services checks are cached after the first success so
  // we don't re-query them on every call within the same session.
  if (!_servicesEnabled) {
    const servicesEnabled = await Location.hasServicesEnabledAsync();
    if (!servicesEnabled) {
      throw locationError(
        "SERVICES_DISABLED",
        "Location services are turned off on this device."
      );
    }
    _servicesEnabled = true;
  }

  if (!_permissionGranted) {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      _permissionGranted = false;
      throw locationError(
        "PERMISSION_DENIED",
        "Location permission was denied."
      );
    }
    _permissionGranted = true;
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  _cachedLocation = {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
  _cachedTimestamp = Date.now();

  return _cachedLocation;
}

/**
 * Returns the most recently cached location synchronously, or null if
 * nothing has been fetched yet or the cache has expired.  Useful for UI
 * components (e.g. the SMS character counter) that need coordinates
 * immediately on mount without triggering an async location lookup.
 */
export function getCachedLocation() {
  if (
    _cachedLocation &&
    Date.now() - _cachedTimestamp < LOCATION_CACHE_TTL_MS
  ) {
    return _cachedLocation;
  }
  return null;
}

/**
 * Builds the offline report SMS body as "<longitude> | <latitude>" plus an
 * optional description, trimmed so the whole thing fits in one 160-char
 * SMS segment. The description's effective limit is whichever is smaller:
 * OFFLINE_DESCRIPTION_MAX, or whatever room is left after the coordinates.
 */
export function buildOfflineReportSms({ latitude, longitude, description }) {
  const coords = `${longitude.toFixed(5)} | ${latitude.toFixed(5)}`;
  let body = `${coords}`;

  const trimmedDescription = (description ?? "").trim();
  const separator = " | ";
  const availableForDescription = Math.max(
    0,
    Math.min(
      OFFLINE_DESCRIPTION_MAX,
      SMS_SEGMENT_LIMIT - body.length - separator.length
    )
  );

  if (trimmedDescription && availableForDescription > 0) {
    body += `${separator}${trimmedDescription.slice(0, availableForDescription)}`;
  }

  return body;
}

/**
 * Returns how many description characters currently fit, given the fixed
 * coordinate prefix. Lets the UI show an accurate live counter instead of
 * a flat 100 that could quietly get truncated at send time.
 */
export function getOfflineDescriptionLimit({ latitude, longitude }) {
  if (latitude == null || longitude == null) return OFFLINE_DESCRIPTION_MAX;
  const coords = `${longitude.toFixed(5)} | ${latitude.toFixed(5)}`;
  const body = `${coords}`;
  const separator = " | ";
  return Math.max(
    0,
    Math.min(OFFLINE_DESCRIPTION_MAX, SMS_SEGMENT_LIMIT - body.length - separator.length)
  );
}

/**
 * Opens the native SMS composer, pre-filled and addressed to
 * OFFLINE_SMS_RECIPIENT. expo-sms (like every cross-platform SMS API) can
 * only hand off to the OS composer — iOS/Android don't let third-party
 * apps send SMS silently in the background — so the user still has to tap
 * Send themselves once the composer opens.
 *
 * Logs the prepared message (and the composer's result) to the console so
 * you can confirm exactly what was sent while testing with
 * `npx expo start` / `npm run dev`.
 */
export async function sendOfflineReportSms({ latitude, longitude, description }) {
  const body = buildOfflineReportSms({ latitude, longitude, description });

  console.log("[offline-report] SMS prepared ->", {
    to: OFFLINE_SMS_RECIPIENT,
    body,
    length: body.length,
  });

  const isAvailable = await SMS.isAvailableAsync();
  if (!isAvailable) {
    throw new Error("SMS is not available on this device.");
  }

  const { result } = await SMS.sendSMSAsync([OFFLINE_SMS_RECIPIENT], body);

  console.log("[offline-report] SMS composer result ->", result);

  // Android's composer almost always resolves "unknown" (no delivery
  // callback available), so treat "sent" AND "unknown" as success —
  // only "cancelled" means the user actually backed out.
  return { sent: result !== "cancelled", result, body };
}
