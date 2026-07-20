import { db } from '@/lib/db'

const CAP_SEASONS = [
  {
    season: 2025,
    capAmount: BigInt(154_647_000),
    taxLine: BigInt(187_895_000),
    firstApron: BigInt(195_945_000),
    secondApron: BigInt(207_824_000),
  },
]

async function main() {
  for (const c of CAP_SEASONS) {
    await db.capSeason.upsert({ where: { season: c.season }, update: c, create: c })
  }
  console.log(`seed-cap: ${CAP_SEASONS.length} temporadas`)
}

if (process.argv[1]?.includes('seed-cap.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
