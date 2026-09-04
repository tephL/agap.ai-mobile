const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

const cache = new Map();

function cacheKey(lat, lng) {
  return `${Number(lat).toFixed(5)},${Number(lng).toFixed(5)}`;
}

function parseBarangay(addr) {
  return addr.neighbourhood || addr.quarter || addr.village || addr.suburb || null;
}

export async function reverseGeocode(lat, lng) {
  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;

    const data = await res.json();
    const addr = data.address || {};
    const barangay = parseBarangay(addr);

    const result = { barangay, displayName: data.display_name || null };
    cache.set(key, result);
    return result;
  } catch {
    return null;
  }
}

export async function reverseGeocodeFull(lat, lng) {
  const key = cacheKey(lat, lng);
  if (cache.has(key)) return cache.get(key);

  try {
    const url = `${NOMINATIM_URL}?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        "Accept-Language": "en",
        "User-Agent": "AGAP.ai Mobile Client",
      },
    });
    if (!res.ok) {
      console.log("[reverseGeocodeFull] HTTP", res.status);
      return null;
    }

    const data = await res.json();
    const addr = data.address || {};

    const city = addr.city || addr.town || addr.municipality || null;
    const barangay = parseBarangay(addr);
    const street = addr.road || null;
    const address = data.display_name || null;

    console.log("[reverseGeocodeFull] result:", { city, barangay, street, address });

    const result = { city, barangay, street, address };
    cache.set(key, result);
    return result;
  } catch (err) {
    console.log("[reverseGeocodeFull] error:", err?.message);
    return null;
  }
}
