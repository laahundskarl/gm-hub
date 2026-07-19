import { describe, expect, it } from 'vitest'
import { normalizeItem } from './normalize'
import type { RawNewsInput } from './types'

const now = new Date('2026-07-15T12:00:00Z')
const base: RawNewsInput = {
  source: 'espn',
  url: 'https://www.espn.com/nba/story/_/id/1/lakers',
  title: 'Lakers sign veteran guard',
  publishedAt: new Date('2026-07-15T10:00:00Z'),
}

describe('normalizeItem', () => {
  it('aceita item válido e normaliza espaços do título', () => {
    const r = normalizeItem({ ...base, title: '  Lakers   sign\n veteran guard ' }, now)
    expect(r?.title).toBe('Lakers sign veteran guard')
  })
  it('rejeita título ausente ou muito curto', () => {
    expect(normalizeItem({ ...base, title: '' }, now)).toBeNull()
    expect(normalizeItem({ ...base, title: 'NBA' }, now)).toBeNull()
  })
  it('rejeita URL inválida ou não-http', () => {
    expect(normalizeItem({ ...base, url: 'not a url' }, now)).toBeNull()
    expect(normalizeItem({ ...base, url: 'ftp://x.com/a' }, now)).toBeNull()
  })
  it('rejeita item com mais de 14 dias ou data futura (>1h)', () => {
    expect(normalizeItem({ ...base, publishedAt: new Date('2026-06-01T00:00:00Z') }, now)).toBeNull()
    expect(normalizeItem({ ...base, publishedAt: new Date('2026-07-16T00:00:00Z') }, now)).toBeNull()
  })
  it('remove HTML do excerpt e trunca em 300 chars', () => {
    const r = normalizeItem({ ...base, excerpt: `<p>Big ${'x'.repeat(400)}</p>` }, now)
    expect(r?.excerpt?.startsWith('Big x')).toBe(true)
    expect(r?.excerpt?.length).toBe(300)
    expect(r?.excerpt).not.toContain('<p>')
  })
})
