import { db } from '@/lib/db'
import { RSS_FEEDS, fetchRssFeed } from './sources/rss'
import { fetchRedditNba } from './sources/reddit'
import { normalizeItem } from './normalize'
import { dedupeBatch, dedupeHash, titleKey } from './dedupe'
import { buildTagDict, tagText } from './tagger'
import type { RawNewsInput } from './types'

async function collect(): Promise<RawNewsInput[]> {
  const jobs: Promise<RawNewsInput[]>[] = [
    ...RSS_FEEDS.map((f) => fetchRssFeed(f)),
    fetchRedditNba(),
  ]
  const results = await Promise.allSettled(jobs)
  const items: RawNewsInput[] = []
  results.forEach((r, i) => {
    const label = i < RSS_FEEDS.length ? RSS_FEEDS[i].source : 'reddit'
    if (r.status === 'fulfilled') {
      console.log(`fonte ${label}: ${r.value.length} itens`)
      items.push(...r.value)
    } else {
      console.error(`fonte ${label} FALHOU: ${r.reason}`)
    }
  })
  return items
}

async function main() {
  const now = new Date()
  const raw = await collect()
  const normalized = raw.map((i) => normalizeItem(i, now)).filter((i) => i !== null)

  const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  const recent = await db.newsItem.findMany({
    where: { publishedAt: { gte: since } },
    select: { dedupeHash: true, title: true, publishedAt: true },
  })
  const existing = recent.map((r) => ({
    dedupeHash: r.dedupeHash, titleKey: titleKey(r.title), publishedAt: r.publishedAt,
  }))
  const fresh = dedupeBatch(normalized, existing)

  const teams = await db.team.findMany({ select: { id: true, name: true, fullName: true, abbreviation: true } })
  const players = await db.player.findMany({ select: { id: true, firstName: true, lastName: true } })
  const dict = buildTagDict(teams, players)

  let created = 0
  for (const item of fresh) {
    const { teamIds, playerIds } = tagText(`${item.title} ${item.excerpt ?? ''}`, dict)
    await db.newsItem.create({
      data: {
        source: item.source,
        externalId: item.externalId,
        url: item.url,
        title: item.title,
        excerpt: item.excerpt,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        dedupeHash: dedupeHash(item.url),
        tags: {
          create: [
            ...teamIds.map((teamId) => ({ teamId })),
            ...playerIds.map((playerId) => ({ playerId })),
          ],
        },
      },
    })
    created++
  }
  console.log(`ingest: ${raw.length} coletados, ${normalized.length} válidos, ${fresh.length} novos, ${created} gravados`)
}

if (process.argv[1]?.includes('run.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
