export const PLATFORM_MAP: Record<string, string> = {
  'instagram.com': 'Instagram',
  'youtube.com': 'YouTube',
  'tiktok.com': 'TikTok',
  'substack.com': 'Substack',
  'linkedin.com': 'LinkedIn',
  'facebook.com': 'Facebook',
}

export function detectPlatform(url: string): string {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const full = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
    const hostname = new URL(full).hostname.replace(/^www\./, '')
    return PLATFORM_MAP[hostname] ?? 'Website'
  } catch {
    return 'Website'
  }
}
