import * as ImageManipulator from "expo-image-manipulator";
import * as Location from "expo-location";
import { api } from "./api";
import { cameraStore } from "../store/cameraStore";

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
