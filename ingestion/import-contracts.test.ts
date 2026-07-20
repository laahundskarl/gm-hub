import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseContractRows } from './import-contracts'

const sample = readFileSync('data/contracts.sample.csv', 'utf-8')

describe('parseContractRows', () => {
  it('converte linhas válidas', () => {
    const rows = parseContractRows(sample)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toEqual({
      playerName: 'LeBron James', teamAbbr: 'LAL',
      startSeason: 2024, endSeason: 2026, optionType: 'player',
      salariesBySeason: { '2025': 52627153, '2026': 54126380 },
    })
    expect(rows[1].optionType).toBeNull()
  })
  it('rejeita salário negativo', () => {
    const bad = 'player_name,team_abbr,start_season,end_season,option_type,salary_2025\nX Y,LAL,2024,2025,,-5'
    expect(() => parseContractRows(bad)).toThrow(/linha 2/)
  })
  it('rejeita end_season menor que start_season', () => {
    const bad = 'player_name,team_abbr,start_season,end_season,option_type,salary_2025\nX Y,LAL,2026,2024,,100'
    expect(() => parseContractRows(bad)).toThrow(/linha 2/)
  })
})
