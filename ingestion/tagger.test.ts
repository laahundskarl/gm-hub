import { describe, expect, it } from 'vitest'
import { buildTagDict, tagText } from './tagger'

const teams = [
  { id: 1, name: 'Lakers', fullName: 'Los Angeles Lakers', abbreviation: 'LAL' },
  { id: 2, name: '76ers', fullName: 'Philadelphia 76ers', abbreviation: 'PHI' },
  { id: 3, name: 'Jazz', fullName: 'Utah Jazz', abbreviation: 'UTA' },
]
const players = [
  { id: 10, firstName: 'LeBron', lastName: 'James' },
  { id: 11, firstName: 'Joel', lastName: 'Embiid' },
]
const dict = buildTagDict(teams, players)

describe('tagText', () => {
  it('encontra time por nome', () => {
    expect(tagText('Lakers agree to sign veteran center', dict).teamIds).toEqual([1])
  })
  it('encontra time por apelido do dicionário estático', () => {
    expect(tagText('Sixers exploring trade options', dict).teamIds).toEqual([2])
  })
  it('encontra jogador por nome completo e o time junto', () => {
    const r = tagText('LeBron James commits to the Los Angeles Lakers', dict)
    expect(r.playerIds).toEqual([10])
    expect(r.teamIds).toEqual([1])
  })
  it('respeita fronteira de palavra (não acha "Jazz" dentro de "Jazzy")', () => {
    expect(tagText('A Jazzy performance last night', dict).teamIds).toEqual([])
  })
  it('não duplica ids', () => {
    expect(tagText('Lakers, Lakers, Lakers!', dict).teamIds).toEqual([1])
  })
})
