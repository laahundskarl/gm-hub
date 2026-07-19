import { describe, expect, it } from 'vitest'
import { espnRosterUrl, mapEspnAthlete, type EspnAthlete } from './espn'
import fixture from '@/ingestion/fixtures/espn-roster.json'

describe('espnRosterUrl', () => {
  it('usa a sigla em minúsculas para a maioria dos times', () => {
    expect(espnRosterUrl('LAL')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/lal/roster',
    )
  })

  it('usa slug especial da ESPN para NOP', () => {
    expect(espnRosterUrl('NOP')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/no/roster',
    )
  })

  it('usa slug especial da ESPN para UTA', () => {
    expect(espnRosterUrl('UTA')).toBe(
      'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/utah/roster',
    )
  })
})

describe('mapEspnAthlete', () => {
  it('converte atleta completo, normalizando altura e peso', () => {
    const athlete = fixture.athletes[0] as EspnAthlete
    expect(mapEspnAthlete(athlete, 7)).toEqual({
      nbaId: 3975,
      firstName: 'LeBron',
      lastName: 'James',
      position: 'F',
      height: '6-9',
      weight: '250',
      jersey: '23',
      teamId: 7,
    })
  })

  it('atleta sem jersey/altura/peso/posição vira null nesses campos', () => {
    const athlete = fixture.athletes[1] as EspnAthlete
    expect(mapEspnAthlete(athlete, 7)).toEqual({
      nbaId: 5113969,
      firstName: 'Cameron',
      lastName: 'Carr',
      position: null,
      height: null,
      weight: null,
      jersey: null,
      teamId: 7,
    })
  })
})
