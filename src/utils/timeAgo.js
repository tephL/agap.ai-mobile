// Formats a unix-second timestamp as "just now" / "4 minutes ago" /
// "3 hours ago" / "2 days ago" for offline banners.
export function timeAgo(unixSeconds) {
  if (!unixSeconds) return null;
  const diffSec = Math.max(0, Math.floor(Date.now() / 1000) - unixSeconds);

  if (diffSec < 60) return "just now";

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;

  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}
