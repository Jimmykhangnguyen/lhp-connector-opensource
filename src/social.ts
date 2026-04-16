import type { SocialPlatform } from './types'

const SOCIAL_DOMAINS: Record<SocialPlatform, string> = {
  linkedin: 'linkedin.com',
  facebook: 'facebook.com',
  instagram: 'instagram.com',
}

export function safeSocialUrl(value: string | null | undefined, platform: SocialPlatform): string | null {
  if (!value) return null
  const raw = value.trim()
  const url = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`
  try {
    const { protocol, hostname } = new URL(url)
    if (protocol !== 'https:' && protocol !== 'http:') return null
    if (!hostname.endsWith(SOCIAL_DOMAINS[platform])) return null
    return url
  } catch {
    return null
  }
}

export function countWords(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length
}
