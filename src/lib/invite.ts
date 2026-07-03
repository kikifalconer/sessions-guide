import { createHash, timingSafeEqual } from 'node:crypto'

// Shared invitation-code logic (H4). During the invite-only phase this is the
// server-side gate on account creation. The code list is read from the
// INVITE_CODES env var (comma-separated) and is never returned to the client.

// Cookie set by /api/verify-invite when a code checks out; re-validated
// server-side in /join and signUpWithEmail. httpOnly so client JS can't forge it
// (though the value is re-checked against INVITE_CODES on every use anyway).
export const INVITE_COOKIE = 'sg_invite'
export const INVITE_TTL_SECONDS = 2 * 60 * 60 // 2 hours

export function normalizeInviteCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase() : ''
}

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest()
}

// Constant-time membership check (L2). Both sides are hashed to a fixed 32-byte
// digest so timingSafeEqual never observes a length difference, and the whole
// list is scanned with no early return, so timing does not leak which/whether a
// code matched.
export function isValidInviteCode(raw: unknown): boolean {
  const code = normalizeInviteCode(raw)
  if (!code) return false

  const allowed = (process.env.INVITE_CODES ?? '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)
  if (allowed.length === 0) return false

  const target = sha256(code)
  let match = false
  for (const a of allowed) {
    const candidate = sha256(a)
    if (candidate.length === target.length && timingSafeEqual(candidate, target)) {
      match = true
    }
  }
  return match
}
