import { useEffect, useState } from "react";
import { getMyProfile } from "@/services/personService";

/**
 * Resolves the signed-in user's first name for the live greeting.
 *
 * Just wraps getMyProfile() from personService — that function already
 * hits /api/auth/profile, caches the result in SQLite (profileRepo), and
 * falls back to that cached snapshot when the request fails offline. So
 * this hook doesn't add its own storage; it inherits the same offline
 * behavior "for free" and only tracks the resolved value as state.
 *
 * Returns:
 * - firstName (string | null): the user's first name once resolved
 *   (from network or offline cache), or null while loading / if it
 *   couldn't be determined either way. Callers should fall back to a
 *   placeholder while this is null.
 */
export default function useCurrentUserFirstName() {
  const [firstName, setFirstName] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const profile = await getMyProfile();
        if (!cancelled && profile?.first_name) {
          setFirstName(profile.first_name);
        }
      } catch (e) {
        // No network result and no SQLite cache either (e.g. first ever
        // launch while offline) — caller falls back to a placeholder.
        console.log("useCurrentUserFirstName: couldn't resolve profile", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return firstName;
}
