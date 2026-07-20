import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { db } from '@/lib/db'

const rowSchema = z.object({
  player_name: z.string().min(3),
  team_abbr: z.string().length(3),
  start_season: z.coerce.number().int().min(2000).max(2050),
  end_season: z.coerce.number().int().min(2000).max(2050),
  option_type: z.enum(['player', 'team']).nullable(),
})

export interface ParsedContract {
  playerName: string
  teamAbbr: string
  startSeason: number
  endSeason: number
  optionType: 'player' | 'team' | null
  salariesBySeason: Record<string, number>
}

export function parseContractRows(csv: string): ParsedContract[] {
  const records: Record<string, string>[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true })
  const errors: string[] = []
  const out: ParsedContract[] = []

  records.forEach((rec, i) => {
    const line = i + 2 // 1-indexed + header
    const parsed = rowSchema.safeParse({ ...rec, option_type: rec.option_type || null })
    if (!parsed.success) { errors.push(`linha ${line}: ${parsed.error.message}`); return }
    const r = parsed.data
    if (r.end_season < r.start_season) { errors.push(`linha ${line}: end_season < start_season`); return }

    const salariesBySeason: Record<string, number> = {}
    for (const [col, val] of Object.entries(rec)) {
      if (!col.startsWith('salary_') || val === '') continue
      const season = col.replace('salary_', '')
      const amount = Number(val)
      if (!Number.isInteger(amount) || amount < 0) { errors.push(`linha ${line}: ${col} inválido`); return }
      salariesBySeason[season] = amount
    }

    out.push({
      playerName: r.player_name, teamAbbr: r.team_abbr,
      startSeason: r.start_season, endSeason: r.end_season,
      optionType: r.option_type, salariesBySeason,
    })
  })

  if (errors.length) throw new Error(`CSV inválido:\n${errors.join('\n')}`)
  return out
}

export async function importContracts(csv: string) {
  const rows = parseContractRows(csv)
  const teams = await db.team.findMany({ select: { id: true, abbreviation: true } })
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t.id]))
  const unmatched: string[] = []
  let upserted = 0

  for (const row of rows) {
    const teamId = teamByAbbr.get(row.teamAbbr)
    const [firstName, ...rest] = row.playerName.split(' ')
    const player = await db.player.findFirst({
      where: { firstName: { equals: firstName, mode: 'insensitive' }, lastName: { equals: rest.join(' '), mode: 'insensitive' } },
    })
    if (!teamId || !player) { unmatched.push(row.playerName); continue }

    await db.contract.upsert({
      where: { playerId_startSeason: { playerId: player.id, startSeason: row.startSeason } },
      update: { teamId, endSeason: row.endSeason, optionType: row.optionType, salariesBySeason: row.salariesBySeason },
      create: {
        playerId: player.id, teamId,
        startSeason: row.startSeason, endSeason: row.endSeason,
        optionType: row.optionType, salariesBySeason: row.salariesBySeason,
      },
    })
    upserted++
  }
  console.log(`import-contracts: ${upserted} contratos upserted; ${unmatched.length} sem match: ${unmatched.slice(0, 20).join(', ')}`)
}

if (process.argv[1]?.includes('import-contracts.ts')) {
  import('node:fs').then(({ readFileSync }) =>
    importContracts(readFileSync('data/contracts.csv', 'utf-8')),
  ).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
