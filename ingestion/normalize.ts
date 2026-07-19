import type { RawNewsInput } from './types'

const MAX_AGE_MS = 14 * 24 * 3600 * 1000
const MAX_FUTURE_MS = 3600 * 1000
const MAX_EXCERPT = 300

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeItem(raw: RawNewsInput, now: Date): RawNewsInput | null {
  const title = raw.title?.replace(/\s+/g, ' ').trim() ?? ''
  if (title.length < 8) return null

  let url: URL
  try { url = new URL(raw.url) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const t = raw.publishedAt?.getTime()
  if (!t || Number.isNaN(t)) return null
  const age = now.getTime() - t
  if (age > MAX_AGE_MS || age < -MAX_FUTURE_MS) return null

  return {
    ...raw,
    title,
    url: url.toString(),
    excerpt: raw.excerpt ? stripHtml(raw.excerpt).slice(0, MAX_EXCERPT) : undefined,
  }
}
