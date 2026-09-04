// Dam observation timestamps arrive as two PAGASA strings:
//   observationDate: "Aug-24"   (no year)
//   observationTime: "08:00 AM" (Philippine Standard Time, UTC+8)
// Helpers here turn those into epoch ms and derive freshness colors/labels.

const PHT_OFFSET_MS = 8 * 60 * 60 * 1000;
const FRESH_THRESHOLD_MS = 12 * 60 * 60 * 1000;
const AGING_THRESHOLD_MS = 24 * 60 * 60 * 1000;

const MONTHS = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

function parseTimeParts(observationTime) {
  const match = /^\s*(\d{1,2}):(\d{2})\s*([APap])\.?\s*[Mm]\.?\s*$/.exec(
    String(observationTime)
  );
  if (!match) return null;
  let hour = parseInt(match[1], 10) % 12;
  if (match[3].toUpperCase() === "P") hour += 12;
  const minute = parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return { hour, minute };
}

export function parseDamObservationMs(observationDate, observationTime, nowMs = Date.now()) {
  if (!observationDate || !observationTime) return null;

  const dateMatch = /^([A-Z][a-z]{2})-(\d{1,2})$/.exec(String(observationDate).trim());
  if (!dateMatch) return null;
  const month = MONTHS[dateMatch[1]];
  if (month === undefined) return null;
  const day = parseInt(dateMatch[2], 10);

  const time = parseTimeParts(observationTime);
  if (!time) return null;

  // Wall clock is PHT; resolve the year against the current PHT date so
  // year-boundary readings ("Dec-31" seen in January) stay in the past.
  const phtNow = new Date(nowMs + PHT_OFFSET_MS);
  let year = phtNow.getUTCFullYear();
  let ms = Date.UTC(year, month, day, time.hour, time.minute) - PHT_OFFSET_MS;

  if (ms - nowMs > 7 * 24 * 60 * 60 * 1000) {
    year -= 1;
    ms = Date.UTC(year, month, day, time.hour, time.minute) - PHT_OFFSET_MS;
  }
  return ms;
}

export function damFreshnessColor(observationMs, nowMs = Date.now()) {
  if (observationMs == null) return "#a9a9a9";
  const ageMs = nowMs - observationMs;
  if (ageMs < FRESH_THRESHOLD_MS) return "#22c55e";
  if (ageMs < AGING_THRESHOLD_MS) return "#eab308";
  return "#a9a9a9";
}

export function formatObservationAge(observationMs, nowMs = Date.now()) {
  if (observationMs == null) return "—";
  const diffMin = Math.floor((nowMs - observationMs) / (60 * 1000));
  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}
