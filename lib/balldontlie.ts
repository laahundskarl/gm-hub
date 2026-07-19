const BASE = 'https://api.balldontlie.io/v1'

export interface BdlTeam {
  id: number
  conference: string
  division: string
  city: string
  name: string
  full_name: string
  abbreviation: string
}

export interface BdlPlayer {
  id: number
  first_name: string
  last_name: string
  position: string | null
  height: string | null
  weight: string | null
  jersey_number: string | null
  team: { id: number } | null
}

export async function bdlGet<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  const res = await fetch(url, { headers: { Authorization: process.env.BALLDONTLIE_API_KEY! } })
  if (res.status === 429) {
    await new Promise((r) => setTimeout(r, 15_000))
    return bdlGet(path, params)
  }
  if (!res.ok) throw new Error(`balldontlie ${path}: HTTP ${res.status}`)
  return res.json() as Promise<T>
}

export async function getTeams(): Promise<BdlTeam[]> {
  const { data } = await bdlGet<{ data: BdlTeam[] }>('/teams')
  // A API lista franquias históricas também; times ativos têm division preenchida
  return data.filter((t) => t.division !== '')
}

export async function* getActivePlayers(): AsyncGenerator<BdlPlayer[]> {
  let cursor: string | undefined
  do {
    const page = await bdlGet<{ data: BdlPlayer[]; meta: { next_cursor?: number } }>(
      '/players/active',
      { per_page: '100', ...(cursor ? { cursor } : {}) },
    )
    yield page.data
    cursor = page.meta.next_cursor?.toString()
  } while (cursor)
}

export function mapTeam(t: BdlTeam) {
  return {
    nbaId: t.id,
    name: t.name,
    fullName: t.full_name,
    abbreviation: t.abbreviation,
    conference: t.conference,
    division: t.division,
    logoUrl: `https://a.espncdn.com/i/teamlogos/nba/500/${t.abbreviation.toLowerCase()}.png`,
  }
}
