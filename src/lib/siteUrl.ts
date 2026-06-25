// Single source of truth for the public site origin used to build email links
// (e.g. the seeker cancel link). A wrong base here means real users receive
// dead localhost links, so production treats a missing/localhost value as a
// hard failure. The primary guard is a build-time assertion in next.config.ts
// (a bad deploy fails loudly); this runtime check is the backstop.

export function validateSiteUrl(
  raw: string | undefined,
  isProduction: boolean
): string {
  const value = (raw ?? '').trim().replace(/\/$/, '')

  if (!isProduction) {
    // Development: localhost is correct. Accept silently, default if unset.
    return value || 'http://localhost:3000'
  }

  // Production: must be an absolute, non-localhost URL.
  if (!value) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL is not set. Production builds require an absolute https URL so email links resolve for real users.'
    )
  }
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    throw new Error(`NEXT_PUBLIC_SITE_URL is not a valid URL: ${value}`)
  }
  if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
    throw new Error(
      `NEXT_PUBLIC_SITE_URL points at localhost (${value}). Set the real site origin for production.`
    )
  }
  return value
}

// Resolved, validated origin with no trailing slash. Throws in production if
// misconfigured (backstop to the build-time gate).
export function getSiteUrl(): string {
  return validateSiteUrl(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV === 'production'
  )
}

export function cancelUrl(seekerToken: string): string {
  return `${getSiteUrl()}/cancel/${seekerToken}`
}

export function reviewUrl(seekerToken: string): string {
  return `${getSiteUrl()}/review/${seekerToken}`
}
