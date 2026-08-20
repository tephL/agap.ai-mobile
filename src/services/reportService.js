import { api } from "./api";

// The backend's multer fileFilter only accepts these three types —
// anything else (e.g. HEIC) will be rejected with a 500/validation error.
function guessMimeType(filename) {
  const match = /\.(\w+)$/.exec(filename ?? "");
  const ext = match ? match[1].toLowerCase() : "jpg";
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  // expo-camera's takePictureAsync outputs .jpg by default, so this
  // covers the normal case as well as any unrecognized extension.
  return "image/jpeg";
}

/**
 * Uploads a captured report photo to POST /api/reports/upload.
 * Mirrors: http -f --session=auth.json post :3000/api/reports/upload image@/path/to/image.jpg
 *
 * @param {string} uri - local file URI returned by expo-camera's takePictureAsync
 * @param {Record<string, string | number>} [extra] - optional additional form fields
 *   (e.g. description, category, latitude, longitude) if/when the backend supports them
 */
export async function uploadReportPhoto(uri, extra = {}) {
  const filename = uri.split("/").pop() || `report-${Date.now()}.jpg`;
  const type = guessMimeType(filename);

  const formData = new FormData();
  // Field name "image" matches the `image@...` form field used in the
  // reference httpie command against /api/reports/upload.
  formData.append("image", {
    uri,
    name: filename,
    type,
  });

  Object.entries(extra).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  });

  // Image uploads take longer than a typical API call — especially over a
  // tunnel (extra network hops) plus the backend's own upload-to-Cloudinary
  // round trip before it can respond. The shared `api` instance's default
  // 10s timeout is too tight for that and causes the client to abort the
  // request mid-flight (visible on the tunnel side as "context canceled").
  const response = await api.post("/api/reports/upload", formData, {
    timeout: 60000,
  });

  return response.data;
}