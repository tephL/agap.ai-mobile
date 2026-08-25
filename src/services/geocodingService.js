const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

const cache = new Map();

export async function reverseGeocode(lat, lng) {
  const key = `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};

    // Philippine barangays show up in addr.neighbourhood, addr.quarter,
    // addr.village, or addr.suburb depending on the area.
    const barangay =
      addr.neighbourhood || addr.quarter || addr.village || addr.suburb || null;

    const result = { barangay, displayName: data.display_name || null };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}
