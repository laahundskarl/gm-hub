import { describe, expect, it } from 'vitest'
import { mapTeam, type BdlTeam } from './balldontlie'
import fixture from '@/ingestion/fixtures/bdl-teams.json'

describe('mapTeam', () => {
  it('converte time da API para o modelo do banco', () => {
    const lakers = fixture.data[0] as BdlTeam
    expect(mapTeam(lakers)).toEqual({
      nbaId: 14,
      name: 'Lakers',
      fullName: 'Los Angeles Lakers',
      abbreviation: 'LAL',
      conference: 'West',
      division: 'Pacific',
      logoUrl: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png',
    })
  })
})
