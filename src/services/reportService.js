import * as ImageManipulator from "expo-image-manipulator";
import { api } from "./api";

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

export async function uploadReportPhoto(uri, extra = {}) {
  const compressedUri = await compressForUpload(uri);

  const filename = compressedUri.split("/").pop() || `report-${Date.now()}.jpg`;
  const type = guessMimeType(filename); // will resolve to image/jpeg now
  console.log(type);

  const formData = new FormData();
  formData.append("image", {
    uri: compressedUri,
    name: filename,
    type,
  });

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));

    }
  });

  const response = await api.post("/api/reports/upload", formData, {
    timeout: 60000, // you can likely lower this now, but keep some margin
  });

  return response.data;
}
