import { describe, expect, it } from 'vitest'
import { mapPlayer } from './sync-players'
import type { BdlPlayer } from '@/lib/balldontlie'
import fixture from './fixtures/bdl-players.json'

const teamMap = new Map([[14, 7]]) // nbaId 14 (LAL) → id interno 7

describe('mapPlayer', () => {
  it('converte jogador com time', () => {
    expect(mapPlayer(fixture.data[0] as BdlPlayer, teamMap)).toEqual({
      nbaId: 237, firstName: 'LeBron', lastName: 'James',
      position: 'F', height: '6-9', weight: '250', jersey: '23', teamId: 7,
    })
  })
  it('jogador sem time fica com teamId null', () => {
    expect(mapPlayer(fixture.data[1] as BdlPlayer, teamMap).teamId).toBeNull()
  })
})
