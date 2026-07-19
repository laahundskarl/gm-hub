import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'
import ptBR from '@/messages/pt-BR.json'
import { Header } from './header'

describe('Header', () => {
  it('mostra os links de navegação', () => {
    render(
      <NextIntlClientProvider locale="pt-BR" messages={ptBR}>
        <Header userName={null} />
      </NextIntlClientProvider>,
    )
    for (const label of ['Meu feed', 'Notícias', 'Times', 'Jogadores', 'Free Agents']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })
})
