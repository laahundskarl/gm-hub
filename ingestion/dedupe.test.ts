import { describe, expect, it } from 'vitest'
import { canonicalUrl, titleKey, dedupeHash, dedupeBatch } from './dedupe'
import type { RawNewsInput } from './types'

const item = (over: Partial<RawNewsInput>): RawNewsInput => ({
  source: 'espn', url: 'https://x.com/a', title: 'Lakers sign center to two-year deal',
  publishedAt: new Date('2026-07-15T10:00:00Z'), ...over,
})

describe('canonicalUrl', () => {
  it('remove utm_*, fbclid, hash, www e barra final', () => {
    expect(canonicalUrl('https://WWW.espn.com/nba/story/?utm_source=x&utm_medium=y&fbclid=z#frag'))
      .toBe('https://espn.com/nba/story')
  })
})

describe('titleKey', () => {
  it('normaliza caixa, pontuação e acentos', () => {
    expect(titleKey('Lakers SIGN  center, to two-year deal!'))
      .toBe(titleKey('lakers sign center to two year deal'))
  })
})

describe('dedupeBatch', () => {
  it('descarta URL já existente (mesmo hash)', () => {
    const a = item({})
    const existing = [{ dedupeHash: dedupeHash(a.url), titleKey: 'outro', publishedAt: a.publishedAt }]
    expect(dedupeBatch([a], existing)).toHaveLength(0)
  })
  it('descarta título quase idêntico de outra fonte em <48h', () => {
    const a = item({ url: 'https://hoopshype.com/b' })
    const existing = [{
      dedupeHash: 'qualquer', titleKey: titleKey(a.title),
      publishedAt: new Date('2026-07-14T10:00:00Z'),
    }]
    expect(dedupeBatch([a], existing)).toHaveLength(0)
  })
  it('mantém item novo e remove duplicata interna do lote', () => {
    const a = item({})
    const b = item({ url: 'https://x.com/a?utm_source=tw' }) // mesma URL canônica
    expect(dedupeBatch([a, b], [])).toHaveLength(1)
  })
})
