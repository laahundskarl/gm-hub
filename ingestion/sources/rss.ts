import { XMLParser } from 'fast-xml-parser'
import type { RawNewsInput } from '../types'

export const RSS_FEEDS = [
  { source: 'espn', url: 'https://www.espn.com/espn/rss/nba/news' },
  { source: 'hoopshype', url: 'https://hoopshype.com/feed/' },
  { source: 'realgm', url: 'https://basketball.realgm.com/rss/wiretap/0/0.xml' },
] as const

interface RssItem { title?: string; link?: string; description?: string; pubDate?: string; guid?: unknown }

export function parseRssXml(xml: string, source: string): RawNewsInput[] {
  const parsed = new XMLParser({ ignoreAttributes: true }).parse(xml)
  const items: RssItem[] = [parsed?.rss?.channel?.item ?? []].flat()
  return items.flatMap((i) => {
    if (!i.title || !i.link || !i.pubDate) return []
    return [{
      source,
      url: String(i.link),
      title: String(i.title),
      excerpt: i.description ? String(i.description) : undefined,
      publishedAt: new Date(i.pubDate),
    }]
  })
}

export async function fetchRssFeed(feed: { source: string; url: string }): Promise<RawNewsInput[]> {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'nba-foh-ingest/0.1' } })
  if (!res.ok) throw new Error(`rss ${feed.source}: HTTP ${res.status}`)
  return parseRssXml(await res.text(), feed.source)
}
