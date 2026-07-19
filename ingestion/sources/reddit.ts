import type { RawNewsInput } from '../types'

export interface RedditListing {
  data: { children: { data: {
    id: string
    title: string
    permalink: string
    created_utc: number
    score: number
    link_flair_text: string | null
    stickied: boolean
  } }[] }
}

const NEWS_FLAIRS = new Set(['News', 'Woj', 'Shams', 'Rumors', 'Trade', 'Trades', 'Free Agency'])
const MIN_SCORE_NO_FLAIR = 500

export function mapRedditPosts(listing: RedditListing): RawNewsInput[] {
  return listing.data.children.flatMap(({ data: p }) => {
    if (p.stickied) return []
    const isNews = (p.link_flair_text && NEWS_FLAIRS.has(p.link_flair_text)) ||
      (!p.link_flair_text && p.score >= MIN_SCORE_NO_FLAIR)
    if (!isNews) return []
    return [{
      source: 'reddit',
      externalId: p.id,
      url: `https://www.reddit.com${p.permalink}`,
      title: p.title,
      publishedAt: new Date(p.created_utc * 1000),
    }]
  })
}

export async function fetchRedditNba(): Promise<RawNewsInput[]> {
  const res = await fetch('https://www.reddit.com/r/nba/hot.json?limit=50', {
    headers: { 'User-Agent': 'nba-foh-ingest/0.1 (contact: github.com/leo/nba-front-office-hub)' },
  })
  if (!res.ok) throw new Error(`reddit: HTTP ${res.status}`)
  return mapRedditPosts(await res.json() as RedditListing)
}
