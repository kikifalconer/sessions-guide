import type { Tier } from './tiers'

// Session type CREATE limits per tier (D24/D26). null = unlimited. Free tier is
// capped at one session type; the public profile additionally displays only the
// first active session type by sort_order for free-tier practitioners (D26,
// enforced read-side in the profile query).
export const SESSION_TYPE_LIMITS: Record<Tier, number | null> = {
  free: 1,
  elevated: null,
  alchemist: null,
}

// Whether a practitioner at `tier` may create another session type given how
// many they already have. Wire into session type CRUD create path when built.
export function canAddSessionType(tier: Tier, currentCount: number): boolean {
  const limit = SESSION_TYPE_LIMITS[tier]
  if (limit === null) return true
  return currentCount < limit
}
