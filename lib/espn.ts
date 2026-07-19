const BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba'

export interface EspnAthlete {
  id: string
  firstName: string
  lastName: string
  jersey?: string
  displayHeight?: string
  displayWeight?: string
  position?: { abbreviation?: string }
}

// ESPN usa slugs próprios para alguns times (mesmas exceções do ESPN_LOGO_SLUGS em lib/balldontlie.ts)
const ESPN_TEAM_SLUGS: Record<string, string> = { NOP: 'no', UTA: 'utah' }

export function espnRosterUrl(abbreviation: string): string {
  const slug = ESPN_TEAM_SLUGS[abbreviation] ?? abbreviation.toLowerCase()
  return `${BASE}/teams/${slug}/roster`
}

export async function getTeamRoster(abbreviation: string): Promise<EspnAthlete[]> {
  const res = await fetch(espnRosterUrl(abbreviation))
  if (!res.ok) throw new Error(`espn roster ${abbreviation}: HTTP ${res.status}`)
  const json = (await res.json()) as { athletes?: EspnAthlete[] }
  return json.athletes ?? []
}

function parseHeight(displayHeight?: string): string | null {
  const match = displayHeight?.match(/^(\d+)'\s*(\d+)"?$/)
  return match ? `${match[1]}-${match[2]}` : null
}

function parseWeight(displayWeight?: string): string | null {
  const match = displayWeight?.match(/^(\d+)/)
  return match ? match[1] : null
}

export function mapEspnAthlete(a: EspnAthlete, teamId: number) {
  return {
    // nbaId guarda o id de atleta da ESPN enquanto a fonte operacional for a ESPN (ver Task 8b)
    nbaId: Number(a.id),
    firstName: a.firstName,
    lastName: a.lastName,
    position: a.position?.abbreviation ?? null,
    height: parseHeight(a.displayHeight),
    weight: parseWeight(a.displayWeight),
    jersey: a.jersey ?? null,
    teamId,
  }
}
