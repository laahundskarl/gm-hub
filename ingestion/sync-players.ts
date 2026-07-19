import { db } from '@/lib/db'
import { getActivePlayers, type BdlPlayer } from '@/lib/balldontlie'

export function mapPlayer(p: BdlPlayer, teamIdByNbaId: Map<number, number>) {
  return {
    nbaId: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    position: p.position || null,
    height: p.height,
    weight: p.weight,
    jersey: p.jersey_number,
    teamId: p.team ? (teamIdByNbaId.get(p.team.id) ?? null) : null,
  }
}

async function main() {
  const teams = await db.team.findMany({ select: { id: true, nbaId: true } })
  const teamMap = new Map(teams.map((t) => [t.nbaId, t.id]))
  let count = 0
  for await (const page of getActivePlayers()) {
    for (const p of page) {
      const data = mapPlayer(p, teamMap)
      await db.player.upsert({ where: { nbaId: data.nbaId }, update: data, create: data })
      count++
    }
  }
  console.log(`sync-players: ${count} jogadores upserted`)
}

if (process.argv[1]?.endsWith('sync-players.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
