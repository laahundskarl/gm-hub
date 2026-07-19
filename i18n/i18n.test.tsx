import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider, useTranslations } from 'next-intl'
import ptBR from '@/messages/pt-BR.json'
import en from '@/messages/en.json'

function Nav() {
  const t = useTranslations('nav')
  return <span>{t('teams')}</span>
}

describe('i18n', () => {
  it('renderiza em pt-BR', () => {
    render(<NextIntlClientProvider locale="pt-BR" messages={ptBR}><Nav /></NextIntlClientProvider>)
    expect(screen.getByText('Times')).toBeInTheDocument()
  })
  it('renderiza em en', () => {
    render(<NextIntlClientProvider locale="en" messages={en}><Nav /></NextIntlClientProvider>)
    expect(screen.getByText('Teams')).toBeInTheDocument()
  })
  it('pt-BR e en têm exatamente as mesmas chaves', () => {
    const keys = (o: object, p = ''): string[] =>
      Object.entries(o).flatMap(([k, v]) =>
        typeof v === 'object' && v !== null ? keys(v, `${p}${k}.`) : [`${p}${k}`])
    expect(keys(ptBR).sort()).toEqual(keys(en).sort())
  })
})
