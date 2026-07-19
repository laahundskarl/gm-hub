import { createHash } from 'node:crypto'
import type { RawNewsInput } from './types'

const NEAR_DUP_WINDOW_MS = 48 * 3600 * 1000

export interface ExistingNews { dedupeHash: string; titleKey: string; publishedAt: Date }

export function canonicalUrl(raw: string): string {
  const u = new URL(raw)
  u.hash = ''
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith('utm_') || key === 'fbclid' || key === 'ref') u.searchParams.delete(key)
  }
  let s = u.toString()
  if (s.endsWith('/')) s = s.slice(0, -1)
  return s
}

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

export function dedupeHash(url: string): string {
  return createHash('sha256').update(canonicalUrl(url)).digest('hex')
}

export function dedupeBatch(items: RawNewsInput[], existing: ExistingNews[]): RawNewsInput[] {
  const seenHashes = new Set(existing.map((e) => e.dedupeHash))
  const seenTitles = existing.map((e) => ({ key: e.titleKey, at: e.publishedAt.getTime() }))
  const out: RawNewsInput[] = []
  for (const it of items) {
    const hash = dedupeHash(it.url)
    if (seenHashes.has(hash)) continue
    const key = titleKey(it.title)
    const nearDup = seenTitles.some(
      (s) => s.key === key && Math.abs(s.at - it.publishedAt.getTime()) < NEAR_DUP_WINDOW_MS,
    )
    if (nearDup) continue
    seenHashes.add(hash)
    seenTitles.push({ key, at: it.publishedAt.getTime() })
    out.push(it)
  }
  return out
}
