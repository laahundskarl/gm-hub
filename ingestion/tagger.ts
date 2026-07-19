export interface TeamRef { id: number; name: string; fullName: string; abbreviation: string }
export interface PlayerRef { id: number; firstName: string; lastName: string }
export type TagDict = { alias: RegExp; type: 'team' | 'player'; id: number }[]

// Apelidos comuns que não estão em name/fullName
const TEAM_NICKNAMES: Record<string, string[]> = {
  PHI: ['Sixers'], POR: ['Blazers'], CLE: ['Cavs'], DAL: ['Mavs'],
  MIN: ['Wolves'], GSW: ['Dubs'], NYK: ['Knickerbockers'], SAS: ['Spurs'],
  OKC: ['Thunder'], NOP: ['Pels'], MEM: ['Grizz'], WAS: ['Wiz'],
}

function wordRegex(alias: string): RegExp {
  const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(`\\b${escaped}\\b`, 'i')
}

export function buildTagDict(teams: TeamRef[], players: PlayerRef[]): TagDict {
  const dict: TagDict = []
  for (const t of teams) {
    const aliases = new Set([t.fullName, t.name, ...(TEAM_NICKNAMES[t.abbreviation] ?? [])])
    for (const a of aliases) dict.push({ alias: wordRegex(a), type: 'team', id: t.id })
  }
  for (const p of players) {
    dict.push({ alias: wordRegex(`${p.firstName} ${p.lastName}`), type: 'player', id: p.id })
  }
  return dict
}

export function tagText(text: string, dict: TagDict): { teamIds: number[]; playerIds: number[] } {
  const teamIds = new Set<number>()
  const playerIds = new Set<number>()
  for (const entry of dict) {
    if (!entry.alias.test(text)) continue
    if (entry.type === 'team') teamIds.add(entry.id)
    else playerIds.add(entry.id)
  }
  return { teamIds: [...teamIds], playerIds: [...playerIds] }
}
