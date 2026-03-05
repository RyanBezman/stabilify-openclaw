import type { ActiveCoach } from "../types";

export function isSameCoach(a: ActiveCoach | null | undefined, b: ActiveCoach | null | undefined) {
  if (!a && !b) return true;
  if (!a || !b) return false;
  // We don't currently have a stable coach id, so treat the full public profile as identity.
  return (
    a.specialization === b.specialization &&
    a.gender === b.gender &&
    a.personality === b.personality &&
    a.displayName === b.displayName &&
    a.tagline === b.tagline
  );
}
