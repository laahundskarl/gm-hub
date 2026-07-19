import { db } from '@/lib/db'
import { getTeams, mapTeam } from '@/lib/balldontlie'

async function main() {
  const teams = await getTeams()
  for (const t of teams) {
    const data = mapTeam(t)
    await db.team.upsert({ where: { nbaId: data.nbaId }, update: data, create: data })
  }
  console.log(`seed-teams: ${teams.length} times upserted`)
}

if (process.argv[1]?.endsWith('seed-teams.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
