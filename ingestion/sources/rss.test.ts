import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseRssXml } from './rss'

const xml = readFileSync('ingestion/fixtures/rss-espn.xml', 'utf-8')

describe('parseRssXml', () => {
  it('extrai itens do feed', () => {
    const items = parseRssXml(xml, 'espn')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      source: 'espn',
      title: 'Sources: Lakers agree to deal with veteran center',
      url: 'https://www.espn.com/nba/story/_/id/12345/lakers-center',
      excerpt: 'The Lakers and the center agreed to a two-year deal.',
    })
    expect(items[0].publishedAt.toISOString()).toBe('2026-07-14T18:30:00.000Z')
  })
})
