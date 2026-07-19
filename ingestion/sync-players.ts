import { db } from '@/lib/db'
import { type BdlPlayer } from '@/lib/balldontlie'
import { getTeamRoster, mapEspnAthlete } from '@/lib/espn'

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

// Fonte operacional: ESPN (grátis) no lugar de balldontlie /players/active (tier pago).
// getActivePlayers/mapPlayer acima seguem intactos para reversão futura.
async function main() {
  const teams = await db.team.findMany({ select: { id: true, abbreviation: true } })
  let count = 0
  for (const team of teams) {
    const athletes = await getTeamRoster(team.abbreviation)
    for (const a of athletes) {
      const data = mapEspnAthlete(a, team.id)
      await db.player.upsert({ where: { nbaId: data.nbaId }, update: data, create: data })
      count++
    }
  }
  console.log(`sync-players: ${count} jogadores upserted (espn)`)
}

if (process.argv[1]?.endsWith('sync-players.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
