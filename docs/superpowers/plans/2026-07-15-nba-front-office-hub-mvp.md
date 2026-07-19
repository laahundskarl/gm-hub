# NBA Front Office Hub — Plano de Implementação do MVP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Colocar no ar o MVP do NBA Front Office Hub: feed de notícias da NBA agregado e personalizado + contexto financeiro (salários, cap, luxury tax, aprons) por time e jogador, a custo US$ 0.

**Architecture:** Monolito Next.js 15 (App Router) na Vercel, com Supabase (Postgres + Auth) acessado via Prisma. Ingestão de dados em scripts TypeScript na pasta `ingestion/`, executados por GitHub Actions em cron — sem worker dedicado. UI bilíngue PT-BR/EN com next-intl.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind CSS, shadcn/ui, TanStack Query, Prisma, Supabase (`@supabase/ssr`), next-intl, Zod, Vitest + Testing Library, Playwright, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-07-15-nba-front-office-hub-mvp-design.md`

## Global Constraints

- **Custo US$ 0:** apenas Vercel Hobby, Supabase free, GitHub Actions e Sentry free. Nenhum serviço pago.
- **TypeScript `strict: true`** em todo o código; proibido `any` sem comentário justificando.
- **Toda string visível ao usuário** passa por next-intl (`messages/pt-BR.json` + `messages/en.json`) — nunca hardcoded em componente.
- **Prisma + Supabase:** `DATABASE_URL` usa o pooler (porta 6543, `?pgbouncer=true`); `DIRECT_URL` usa a porta 5432 (migrations).
- **Dinheiro:** dólares inteiros, sem centavos. `BigInt` nas colunas de `CapSeason`; `number` no restante (salários NBA cabem com folga no limite seguro de JS).
- **Temporadas** identificadas pelo ano inicial: `2025` = temporada 2025-26.
- **`ingestion/` nunca importa de `app/` ou `components/`** — comunica-se apenas via Prisma (`lib/db.ts`) e `lib/` utilitários puros.
- **Gerenciador de pacotes:** npm. Node 20+.
- **Todo commit** termina com linha em branco + `Co-Authored-By: Claude Code <noreply@anthropic.com>`.
- Cada tarefa termina com typecheck (`npx tsc --noEmit`) e testes (`npx vitest run`) verdes antes do commit.

## Mapa de arquivos

```
nba-front-office-hub/
├── app/
│   ├── [locale]/
│   │   ├── (auth)/login/page.tsx          # login e-mail/senha + Google
│   │   ├── (auth)/signup/page.tsx         # cadastro
│   │   ├── (main)/news/page.tsx           # timeline geral
│   │   ├── (main)/feed/page.tsx           # feed personalizado (tabs)
│   │   ├── (main)/teams/page.tsx          # lista de times
│   │   ├── (main)/teams/[id]/page.tsx     # perfil de time + painel financeiro
│   │   ├── (main)/players/page.tsx        # busca de jogadores
│   │   ├── (main)/players/[id]/page.tsx   # perfil de jogador + contrato
│   │   ├── (main)/free-agents/page.tsx    # lista de free agents
│   │   ├── (main)/onboarding/page.tsx     # escolher times favoritos
│   │   ├── (main)/settings/page.tsx       # perfil, idioma, excluir conta
│   │   ├── (main)/privacy/page.tsx        # política de privacidade
│   │   ├── layout.tsx                     # layout com header/nav
│   │   └── page.tsx                       # home → redireciona p/ /news
│   ├── api/news/route.ts                  # paginação do feed (cursor)
│   └── auth/callback/route.ts             # callback OAuth do Supabase
├── components/
│   ├── ui/                                # shadcn/ui (gerado)
│   ├── layout/header.tsx, locale-switcher.tsx, user-menu.tsx
│   ├── news/news-card.tsx, news-list.tsx
│   ├── teams/financial-panel.tsx, roster-table.tsx
│   ├── players/contract-card.tsx
│   ├── favorites/favorite-button.tsx, team-picker.tsx
│   └── providers.tsx                      # QueryClientProvider
├── lib/
│   ├── db.ts                              # Prisma singleton
│   ├── auth.ts                            # requireUser, ensureProfile
│   ├── supabase/server.ts, client.ts, middleware.ts
│   ├── news.ts                            # queries + cursor do feed
│   ├── cap.ts                             # PURO: temporada, folha, bandas de cap
│   ├── contracts.ts                       # PURO: contrato ativo, anos restantes
│   ├── free-agents.ts                     # query de contratos expirando
│   ├── favorites.ts                       # server actions de favoritos
│   ├── account.ts                         # exclusão de conta (LGPD)
│   ├── time.ts                            # PURO: tempo relativo i18n
│   └── balldontlie.ts                     # client da API balldontlie
├── ingestion/
│   ├── types.ts                           # RawNewsInput
│   ├── normalize.ts                       # PURO: valida/limpa itens
│   ├── dedupe.ts                          # PURO: URL canônica, hash, near-dup
│   ├── tagger.ts                          # PURO: liga texto a times/jogadores
│   ├── sources/rss.ts, reddit.ts          # coleta por fonte
│   ├── run.ts                             # orquestra ingestão de notícias
│   ├── seed-teams.ts, sync-players.ts     # dados de elenco (balldontlie)
│   ├── seed-cap.ts, import-contracts.ts   # dados financeiros
│   └── fixtures/                          # RSS/JSON reais para testes
├── data/
│   ├── contracts.csv                      # dataset de contratos (versionado)
│   └── contracts.sample.csv               # exemplo do formato
├── i18n/routing.ts, request.ts            # next-intl
├── messages/pt-BR.json, en.json           # traduções
├── prisma/schema.prisma                   # schema completo (Tarefa 2)
├── e2e/smoke.spec.ts                      # Playwright
└── .github/workflows/ci.yml, ingest.yml, sync-rosters.yml, import-contracts.yml
```

---

### Tarefa 0: Pré-requisitos manuais (feitos pelo dono do projeto, fora do código)

Estas etapas exigem contas/consoles e não podem ser automatizadas. Sem elas, as tarefas 2+ não rodam.

- [ ] **Supabase:** criar projeto free em https://supabase.com (região `us-east-1`). Anotar: URL do projeto, `anon key`, `service_role key` e a senha do banco (Settings → Database).
- [ ] **Supabase Auth:** em Authentication → Providers, deixar Email habilitado e **desativar "Confirm email"** (simplifica o MVP; reativar quando houver domínio de e-mail próprio). Configurar Google OAuth depois da Tarefa 4 (precisa de client ID/secret do Google Cloud Console) — e-mail/senha funciona antes disso.
- [ ] **balldontlie:** criar conta free em https://www.balldontlie.io e anotar a API key.
- [ ] **GitHub:** criar repositório `nba-front-office-hub` (público recomendado — Actions ilimitado) e fazer push do repo local. Em Settings → Secrets and variables → Actions, criar secrets: `DATABASE_URL`, `DIRECT_URL`, `BALLDONTLIE_API_KEY`.
- [ ] **Vercel:** criar conta Hobby ligada ao GitHub (o deploy em si é a Tarefa 24).
- [ ] Criar `.env` local (nunca commitado) a partir do `.env.example` da Tarefa 2.

---

## Fase 1 — Fundação

### Tarefa 1: Scaffold Next.js + Vitest

**Files:**
- Create: projeto Next.js na raiz do repo (via `create-next-app` em pasta temporária)
- Create: `vitest.config.ts`, `vitest.setup.ts`, `lib/utils.test.ts`
- Modify: `package.json` (scripts), `.gitignore` (`.env`)

**Interfaces:**
- Produces: app Next.js rodando (`npm run dev`), `cn()` em `lib/utils.ts` (vem do shadcn), comando `npx vitest run` funcional. Componentes shadcn em `components/ui/`.

- [ ] **Step 1: Scaffold em pasta temporária e mover para a raiz** (o repo já tem `docs/`, e `create-next-app` recusa diretório não-vazio)

```bash
cd /c/Users/310287643/Downloads/nba-front-office-hub
npx create-next-app@latest tmp-web --ts --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm --yes
rm -rf tmp-web/.git
shopt -s dotglob && mv tmp-web/* . && rmdir tmp-web && shopt -u dotglob
echo ".env" >> .gitignore
npm run build   # sanity check
```

Expected: build conclui sem erro.

- [ ] **Step 2: shadcn/ui + componentes base**

```bash
npx shadcn@latest init -d
npx shadcn@latest add button card tabs input label avatar badge table dropdown-menu skeleton sonner dialog select
```

- [ ] **Step 3: Vitest + Testing Library**

```bash
npm i -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'e2e'],
  },
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
})
```

`vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest'
```

Adicionar em `package.json` → scripts: `"test": "vitest run"`, `"typecheck": "tsc --noEmit"`.

- [ ] **Step 4: Teste de sanidade** — `lib/utils.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('mescla classes condicionais', () => {
    expect(cn('a', false && 'b', 'c')).toBe('a c')
  })
})
```

Run: `npx vitest run` → Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: scaffold Next.js 15 + Tailwind + shadcn/ui + Vitest

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 2: Banco de dados — schema Prisma completo

**Files:**
- Create: `prisma/schema.prisma`, `lib/db.ts`, `.env.example`
- Modify: `package.json` (script `postinstall: prisma generate`)

**Interfaces:**
- Consumes: projeto Supabase da Tarefa 0 (`DATABASE_URL`, `DIRECT_URL` no `.env`).
- Produces: singleton `db: PrismaClient` exportado de `@/lib/db`; todos os modelos abaixo — **estes nomes de modelo/campo são contrato para todas as tarefas seguintes**.

- [ ] **Step 1: Instalar Prisma e escrever o schema**

```bash
npm i @prisma/client && npm i -D prisma
```

`prisma/schema.prisma` (completo):

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model Profile {
  id              String               @id @db.Uuid
  name            String
  avatarUrl       String?              @map("avatar_url")
  language        String               @default("pt-BR")
  createdAt       DateTime             @default(now()) @map("created_at")
  favoriteTeams   UserFavoriteTeam[]
  favoritePlayers UserFavoritePlayer[]

  @@map("profiles")
}

model Team {
  id           Int                @id @default(autoincrement())
  nbaId        Int                @unique @map("nba_id")
  name         String
  fullName     String             @map("full_name")
  abbreviation String             @unique
  conference   String
  division     String
  logoUrl      String?            @map("logo_url")
  players      Player[]
  contracts    Contract[]
  favorites    UserFavoriteTeam[]
  newsTags     NewsTag[]

  @@map("teams")
}

model Player {
  id        Int                  @id @default(autoincrement())
  nbaId     Int                  @unique @map("nba_id")
  firstName String               @map("first_name")
  lastName  String               @map("last_name")
  position  String?
  jersey    String?
  height    String?
  weight    String?
  teamId    Int?                 @map("team_id")
  team      Team?                @relation(fields: [teamId], references: [id])
  contracts Contract[]
  favorites UserFavoritePlayer[]
  newsTags  NewsTag[]

  @@map("players")
}

model UserFavoriteTeam {
  id      Int     @id @default(autoincrement())
  userId  String  @map("user_id") @db.Uuid
  teamId  Int     @map("team_id")
  profile Profile @relation(fields: [userId], references: [id], onDelete: Cascade)
  team    Team    @relation(fields: [teamId], references: [id])

  @@unique([userId, teamId])
  @@map("user_favorite_teams")
}

model UserFavoritePlayer {
  id       Int     @id @default(autoincrement())
  userId   String  @map("user_id") @db.Uuid
  playerId Int     @map("player_id")
  profile  Profile @relation(fields: [userId], references: [id], onDelete: Cascade)
  player   Player  @relation(fields: [playerId], references: [id])

  @@unique([userId, playerId])
  @@map("user_favorite_players")
}

model Contract {
  id               Int     @id @default(autoincrement())
  playerId         Int     @map("player_id")
  teamId           Int     @map("team_id")
  startSeason      Int     @map("start_season")
  endSeason        Int     @map("end_season")
  salariesBySeason Json    @map("salaries_by_season")
  optionType       String? @map("option_type")
  player           Player  @relation(fields: [playerId], references: [id], onDelete: Cascade)
  team             Team    @relation(fields: [teamId], references: [id])

  @@unique([playerId, startSeason])
  @@index([teamId])
  @@index([endSeason])
  @@map("contracts")
}

model CapSeason {
  season      Int    @id
  capAmount   BigInt @map("cap_amount")
  taxLine     BigInt @map("tax_line")
  firstApron  BigInt @map("first_apron")
  secondApron BigInt @map("second_apron")

  @@map("cap_seasons")
}

model NewsItem {
  id          Int       @id @default(autoincrement())
  source      String
  externalId  String?   @map("external_id")
  url         String
  title       String
  excerpt     String?
  imageUrl    String?   @map("image_url")
  publishedAt DateTime  @map("published_at")
  dedupeHash  String    @unique @map("dedupe_hash")
  createdAt   DateTime  @default(now()) @map("created_at")
  tags        NewsTag[]

  @@index([publishedAt(sort: Desc)])
  @@map("news_items")
}

model NewsTag {
  id         Int      @id @default(autoincrement())
  newsItemId Int      @map("news_item_id")
  teamId     Int?     @map("team_id")
  playerId   Int?     @map("player_id")
  newsItem   NewsItem @relation(fields: [newsItemId], references: [id], onDelete: Cascade)
  team       Team?    @relation(fields: [teamId], references: [id])
  player     Player?  @relation(fields: [playerId], references: [id])

  @@index([teamId])
  @@index([playerId])
  @@map("news_tags")
}
```

Nota de semântica: `Contract.salariesBySeason` é um objeto `{"2025": 45000000, "2026": 47000000}` (chave = ano inicial da temporada, valor = dólares inteiros). `optionType` ∈ `"player" | "team" | null`, aplicável à última temporada do contrato.

- [ ] **Step 2: `.env.example`**

```
DATABASE_URL="postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.<ref>:<senha>@aws-0-us-east-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://<ref>.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="<anon key>"
SUPABASE_SERVICE_ROLE_KEY="<service role key — só no servidor>"
BALLDONTLIE_API_KEY="<api key>"
```

- [ ] **Step 3: `lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 4: Validar e migrar**

```bash
npx prisma validate          # Expected: "The schema ... is valid"
npx prisma migrate dev --name init   # cria as tabelas no Supabase
npx tsc --noEmit
```

Adicionar em `package.json` → scripts: `"postinstall": "prisma generate"`.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: schema Prisma completo + migration inicial

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 3: i18n com next-intl (rotas [locale], PT-BR e EN)

**Files:**
- Create: `i18n/routing.ts`, `i18n/request.ts`, `i18n/navigation.ts`, `messages/pt-BR.json`, `messages/en.json`, `components/layout/locale-switcher.tsx`
- Modify: `next.config.ts`, `middleware.ts` (novo), mover `app/page.tsx`/`app/layout.tsx` para `app/[locale]/`
- Test: `i18n/i18n.test.tsx`

**Interfaces:**
- Produces: rotas com prefixo de locale (`/en/...`; `pt-BR` é o default, sem prefixo). `useTranslations`/`getTranslations` disponíveis em qualquer componente; `Link`, `redirect`, `usePathname`, `useRouter` de `@/i18n/navigation`. **Todas as tarefas seguintes criam páginas dentro de `app/[locale]/` e adicionam chaves nos DOIS arquivos de messages.**

- [ ] **Step 1: Instalar e configurar roteamento**

```bash
npm i next-intl
```

`i18n/routing.ts`:

```ts
import { defineRouting } from 'next-intl/routing'

export const routing = defineRouting({
  locales: ['pt-BR', 'en'],
  defaultLocale: 'pt-BR',
  localePrefix: 'as-needed',
})
```

`i18n/request.ts`:

```ts
import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale
  return { locale, messages: (await import(`../messages/${locale}.json`)).default }
})
```

`i18n/navigation.ts`:

```ts
import { createNavigation } from 'next-intl/navigation'
import { routing } from './routing'

export const { Link, redirect, usePathname, useRouter } = createNavigation(routing)
```

`next.config.ts`:

```ts
import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  images: { remotePatterns: [{ protocol: 'https', hostname: 'a.espncdn.com' }] },
}

export default withNextIntl(nextConfig)
```

`middleware.ts` na raiz (a Tarefa 4 estende este arquivo com a sessão Supabase):

```ts
import createIntlMiddleware from 'next-intl/middleware'
import { routing } from '@/i18n/routing'

export default createIntlMiddleware(routing)

export const config = { matcher: ['/((?!api|auth|_next|.*\\..*).*)'] }
```

- [ ] **Step 2: Mover o app para `app/[locale]/`**

Mover `app/layout.tsx` para `app/[locale]/layout.tsx` e `app/page.tsx` para `app/[locale]/page.tsx`. Novo layout:

```tsx
import { NextIntlClientProvider, hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Geist } from 'next/font/google'
import '../globals.css'

const geist = Geist({ subsets: ['latin'] })

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()
  return (
    <html lang={locale}>
      <body className={geist.className}>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  )
}
```

(`app/globals.css` permanece onde está.)

- [ ] **Step 3: Messages iniciais**

`messages/pt-BR.json`:

```json
{
  "nav": { "feed": "Meu feed", "news": "Notícias", "teams": "Times", "players": "Jogadores", "freeAgents": "Free Agents", "settings": "Configurações" },
  "auth": { "login": "Entrar", "signup": "Criar conta", "logout": "Sair", "email": "E-mail", "password": "Senha", "name": "Nome", "google": "Continuar com Google", "loginError": "E-mail ou senha inválidos", "signupError": "Não foi possível criar a conta" },
  "home": { "title": "NBA Front Office Hub", "tagline": "Notícias, rumores e contexto financeiro da NBA em um só lugar" },
  "common": { "loading": "Carregando…", "loadMore": "Carregar mais", "empty": "Nada por aqui ainda", "unofficialData": "Dados financeiros não oficiais", "save": "Salvar", "cancel": "Cancelar", "search": "Buscar" }
}
```

`messages/en.json`:

```json
{
  "nav": { "feed": "My feed", "news": "News", "teams": "Teams", "players": "Players", "freeAgents": "Free Agents", "settings": "Settings" },
  "auth": { "login": "Sign in", "signup": "Sign up", "logout": "Sign out", "email": "Email", "password": "Password", "name": "Name", "google": "Continue with Google", "loginError": "Invalid email or password", "signupError": "Could not create the account" },
  "home": { "title": "NBA Front Office Hub", "tagline": "NBA news, rumors and financial context in one place" },
  "common": { "loading": "Loading…", "loadMore": "Load more", "empty": "Nothing here yet", "unofficialData": "Unofficial financial data", "save": "Save", "cancel": "Cancel", "search": "Search" }
}
```

- [ ] **Step 4: Componente de troca de idioma + teste**

`components/layout/locale-switcher.tsx`:

```tsx
'use client'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'

export function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()
  const other = locale === 'pt-BR' ? 'en' : 'pt-BR'
  return (
    <button
      className="text-sm text-muted-foreground hover:text-foreground"
      onClick={() => router.replace(pathname, { locale: other })}
    >
      {other === 'en' ? 'EN' : 'PT'}
    </button>
  )
}
```

Teste `i18n/i18n.test.tsx`:

```tsx
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
```

Run: `npx vitest run i18n` → Expected: 3 passed. Depois `npm run build` → Expected: sem erro.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: i18n PT-BR/EN com next-intl e rotas [locale]

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 4: Autenticação — Supabase Auth (e-mail/senha + Google)

**Files:**
- Create: `lib/supabase/server.ts`, `lib/supabase/client.ts`, `lib/supabase/middleware.ts`, `lib/auth.ts`, `app/[locale]/(auth)/login/page.tsx`, `app/[locale]/(auth)/signup/page.tsx`, `app/api/profile/route.ts`, `app/auth/callback/route.ts`
- Modify: `middleware.ts` (compor intl + sessão Supabase)

**Interfaces:**
- Consumes: `db` de `@/lib/db` (T2); env `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: `getUser()`, `requireUser(): Promise<{ id: string; email: string }>` (redireciona a `/login` se anônimo) e `ensureProfile(userId: string, name: string)` em `@/lib/auth`; `createClient()` (server) em `@/lib/supabase/server` e (browser) em `@/lib/supabase/client`. **Toda página protegida chama `requireUser()` na primeira linha.**

- [ ] **Step 1: Instalar e criar os clients**

```bash
npm i @supabase/supabase-js @supabase/ssr
```

`lib/supabase/client.ts`:

```ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
```

`lib/supabase/server.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (all) => {
          try {
            all.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
          } catch {
            // chamado de um Server Component: o middleware renova a sessão
          }
        },
      },
    },
  )
}
```

`lib/supabase/middleware.ts`:

```ts
import { createServerClient } from '@supabase/ssr'
import { type NextRequest, type NextResponse } from 'next/server'

export async function updateSession(request: NextRequest, response: NextResponse) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (all) => {
          all.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    },
  )
  await supabase.auth.getUser()
  return response
}
```

`middleware.ts` (composição com o intl da T3):

```ts
import createIntlMiddleware from 'next-intl/middleware'
import { type NextRequest } from 'next/server'
import { routing } from '@/i18n/routing'
import { updateSession } from '@/lib/supabase/middleware'

const intl = createIntlMiddleware(routing)

export default async function middleware(request: NextRequest) {
  return updateSession(request, intl(request))
}

export const config = { matcher: ['/((?!api|auth|_next|.*\\..*).*)'] }
```

- [ ] **Step 2: `lib/auth.ts`**

```ts
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { db } from '@/lib/db'

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function requireUser() {
  const user = await getUser()
  if (!user) redirect('/login')
  return { id: user.id, email: user.email ?? '' }
}

export async function ensureProfile(userId: string, name: string) {
  return db.profile.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, name },
  })
}
```

- [ ] **Step 3: Páginas de login/cadastro, criação de Profile e callback OAuth**

`app/[locale]/(auth)/login/page.tsx`:

```tsx
'use client'
import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useRouter } from '@/i18n/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const t = useTranslations('auth')
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return setError(true)
    router.push('/feed')
    router.refresh()
  }

  async function signInGoogle() {
    const supabase = createClient()
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${location.origin}/auth/callback` },
    })
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm items-center">
      <Card className="w-full">
        <CardHeader><CardTitle>{t('login')}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={signIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('email')}</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </div>
            {error && <p className="text-sm text-destructive">{t('loginError')}</p>}
            <Button type="submit" className="w-full">{t('login')}</Button>
            <Button type="button" variant="outline" className="w-full" onClick={signInGoogle}>{t('google')}</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
```

`app/[locale]/(auth)/signup/page.tsx` — mesma estrutura do login, com campo `name` adicional (mesmo padrão de `Label`+`Input`) e submit:

```tsx
async function signUp(e: React.FormEvent) {
  e.preventDefault()
  const supabase = createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  })
  if (error || !data.user) return setError(true)
  await fetch('/api/profile', { method: 'POST' })
  router.push('/onboarding')
  router.refresh()
}
```

`app/api/profile/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const name = (user.user_metadata?.name as string) ?? user.email?.split('@')[0] ?? 'user'
  await ensureProfile(user.id, name)
  return NextResponse.json({ ok: true })
}
```

`app/auth/callback/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ensureProfile } from '@/lib/auth'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  if (code) {
    const supabase = await createClient()
    const { data } = await supabase.auth.exchangeCodeForSession(code)
    if (data.user) {
      const name = (data.user.user_metadata?.name as string) ?? data.user.email?.split('@')[0] ?? 'user'
      await ensureProfile(data.user.id, name)
    }
  }
  return NextResponse.redirect(`${origin}/feed`)
}
```

- [ ] **Step 4: Verificação manual**

Run: `npm run dev` → criar conta em `/signup` → redireciona a `/onboarding` (404 por enquanto — a página vem na T17; o redirect acontecer já valida o fluxo). Conferir no Supabase Studio: linha nova em `auth.users` E em `public.profiles`. `npx tsc --noEmit && npx vitest run` verdes.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: autenticação Supabase (e-mail/senha + Google) com Profile

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 5: Layout base — header, navegação e home

**Files:**
- Create: `components/layout/header.tsx`, `components/layout/user-menu.tsx`, `app/[locale]/(main)/layout.tsx`, `app/[locale]/error.tsx`
- Modify: `app/[locale]/page.tsx` (home redireciona para `/news`)
- Test: `components/layout/header.test.tsx`

**Interfaces:**
- Consumes: `LocaleSwitcher` (T3), `getUser` (T4), messages `nav.*`.
- Produces: grupo de rotas `(main)` com header comum — **todas as páginas de produto (T16–T22) vivem em `app/[locale]/(main)/`**. `Header({ userName: string | null })`.

- [ ] **Step 1: Teste primeiro** — `components/layout/header.test.tsx`:

```tsx
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
```

Run: `npx vitest run header` → Expected: FAIL ("Cannot find module './header'").

- [ ] **Step 2: Implementar**

`components/layout/header.tsx`:

```tsx
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { LocaleSwitcher } from './locale-switcher'
import { UserMenu } from './user-menu'

const NAV = [
  { href: '/feed', key: 'feed' },
  { href: '/news', key: 'news' },
  { href: '/teams', key: 'teams' },
  { href: '/players', key: 'players' },
  { href: '/free-agents', key: 'freeAgents' },
] as const

export function Header({ userName }: { userName: string | null }) {
  const t = useTranslations('nav')
  return (
    <header className="border-b">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
        <Link href="/news" className="font-bold tracking-tight">NBA FOH</Link>
        <nav className="flex flex-1 gap-4 text-sm">
          {NAV.map(({ href, key }) => (
            <Link key={key} href={href} className="text-muted-foreground hover:text-foreground">
              {t(key)}
            </Link>
          ))}
        </nav>
        <LocaleSwitcher />
        <UserMenu userName={userName} />
      </div>
    </header>
  )
}
```

`components/layout/user-menu.tsx` (client): se `userName === null`, renderiza `<Link href="/login">{t('auth.login')}</Link>`; senão, `DropdownMenu` (shadcn) com item `nav.settings` → `/settings` e item `auth.logout` que executa:

```tsx
const supabase = createClient()
await supabase.auth.signOut()
router.push('/login')
router.refresh()
```

`app/[locale]/(main)/layout.tsx`:

```tsx
import { Header } from '@/components/layout/header'
import { getUser } from '@/lib/auth'
import { db } from '@/lib/db'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser()
  const profile = user ? await db.profile.findUnique({ where: { id: user.id } }) : null
  return (
    <>
      <Header userName={profile?.name ?? null} />
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </>
  )
}
```

`app/[locale]/page.tsx`:

```tsx
import { redirect } from '@/i18n/navigation'
import { getLocale } from 'next-intl/server'

export default async function Home() {
  redirect({ href: '/news', locale: await getLocale() })
}
```

`app/[locale]/error.tsx` (error boundary de rota — spec §9; messages novos `common.errorTitle` "Algo deu errado"/"Something went wrong" e `common.retry` "Tentar de novo"/"Try again"):

```tsx
'use client'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function RouteError({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations('common')
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
      <p className="text-lg font-medium">{t('errorTitle')}</p>
      <Button variant="outline" onClick={reset}>{t('retry')}</Button>
    </div>
  )
}
```

- [ ] **Step 3: Testes verdes + commit**

Run: `npx vitest run && npx tsc --noEmit` → Expected: PASS.

```bash
git add -A && git commit -m "feat: layout base com header, navegação e user menu

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 6: CI no GitHub Actions

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Produces: todo push/PR roda typecheck + lint + testes. Tarefas seguintes assumem CI ativo.

- [ ] **Step 1: Workflow** — `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  checks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx prisma generate
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npx vitest run
```

- [ ] **Step 2: Push e verificação**

```bash
git add -A && git commit -m "ci: typecheck, lint e testes em push/PR

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push origin main
```

Expected: aba Actions do GitHub mostra o workflow **CI** verde (requer o repositório da Tarefa 0).

---

## Fase 2 — Dados e ingestão

### Tarefa 7: Client balldontlie + seed de times

**Files:**
- Create: `lib/balldontlie.ts`, `ingestion/seed-teams.ts`, `ingestion/fixtures/bdl-teams.json`
- Test: `lib/balldontlie.test.ts`
- Modify: `package.json` (script `seed:teams`, dep `tsx`)

**Interfaces:**
- Consumes: env `BALLDONTLIE_API_KEY`; `db` (T2).
- Produces: `bdlGet<T>(path, params?)` (fetch autenticado), `getTeams(): Promise<BdlTeam[]>`, `getActivePlayers(): AsyncGenerator<BdlPlayer[]>` e `mapTeam(t: BdlTeam)` em `@/lib/balldontlie`; 30 times na tabela `teams`.

- [ ] **Step 1: Fixture + teste primeiro**

`ingestion/fixtures/bdl-teams.json` (formato real da API `GET /v1/teams`, 2 exemplos bastam para o teste):

```json
{
  "data": [
    { "id": 14, "conference": "West", "division": "Pacific", "city": "Los Angeles", "name": "Lakers", "full_name": "Los Angeles Lakers", "abbreviation": "LAL" },
    { "id": 2, "conference": "East", "division": "Atlantic", "city": "Boston", "name": "Celtics", "full_name": "Boston Celtics", "abbreviation": "BOS" }
  ]
}
```

`lib/balldontlie.test.ts`:

```ts
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
```

Run: `npx vitest run balldontlie` → Expected: FAIL (módulo não existe).

- [ ] **Step 2: Implementar `lib/balldontlie.ts`**

```ts
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
```

Run: `npx vitest run balldontlie` → Expected: PASS.

- [ ] **Step 3: Script de seed** — `ingestion/seed-teams.ts`:

```ts
import { db } from '@/lib/db'
import { getTeams, mapTeam } from '@/lib/balldontlie'

async function main() {
  const teams = await getTeams()
  for (const t of teams) {
    const data = mapTeam(t)
    await db.team.upsert({ where: { nbaId: data.nbaId }, update: data, create: data })
  }
  console.log(`seed-teams: ${teams.length} times upserted`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

```bash
npm i -D tsx dotenv-cli
```

`package.json` scripts: `"seed:teams": "dotenv -- tsx ingestion/seed-teams.ts"`.

- [ ] **Step 4: Rodar e verificar**

Run: `npm run seed:teams` → Expected: `seed-teams: 30 times upserted`. Conferir: `npx prisma studio` → tabela `teams` com 30 linhas.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: client balldontlie e seed de times

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 8: Sync de jogadores ativos

**Files:**
- Create: `ingestion/sync-players.ts`, `ingestion/fixtures/bdl-players.json`
- Test: `ingestion/sync-players.test.ts`
- Modify: `package.json` (script `sync:players`)

**Interfaces:**
- Consumes: `getActivePlayers`, `BdlPlayer` (T7); `db` (T2).
- Produces: `mapPlayer(p: BdlPlayer, teamIdByNbaId: Map<number, number>)` exportado de `ingestion/sync-players.ts`; tabela `players` populada (~550 jogadores).

- [ ] **Step 1: Fixture + teste primeiro**

`ingestion/fixtures/bdl-players.json`:

```json
{
  "data": [
    { "id": 237, "first_name": "LeBron", "last_name": "James", "position": "F", "height": "6-9", "weight": "250", "jersey_number": "23", "team": { "id": 14 } },
    { "id": 999001, "first_name": "Sem", "last_name": "Time", "position": null, "height": null, "weight": null, "jersey_number": null, "team": null }
  ]
}
```

`ingestion/sync-players.test.ts`:

```ts
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
```

Run: `npx vitest run sync-players` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `ingestion/sync-players.ts`:

```ts
import { db } from '@/lib/db'
import { getActivePlayers, type BdlPlayer } from '@/lib/balldontlie'

export function mapPlayer(p: BdlPlayer, teamIdByNbaId: Map<number, number>) {
  return {
    nbaId: p.id,
    firstName: p.first_name,
    lastName: p.last_name,
    position: p.position || null,
    height: p.height,
    weight: p.weight,
    jersey: p.jersey_number,
    teamId: p.team ? (teamIdByNbaId.get(p.team.id) ?? null) : null,
  }
}

async function main() {
  const teams = await db.team.findMany({ select: { id: true, nbaId: true } })
  const teamMap = new Map(teams.map((t) => [t.nbaId, t.id]))
  let count = 0
  for await (const page of getActivePlayers()) {
    for (const p of page) {
      const data = mapPlayer(p, teamMap)
      await db.player.upsert({ where: { nbaId: data.nbaId }, update: data, create: data })
      count++
    }
  }
  console.log(`sync-players: ${count} jogadores upserted`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
```

Nota: o loop `main()` não roda no teste porque o Vitest importa o módulo — proteger com `if (process.argv[1]?.endsWith('sync-players.ts')) main()...` em vez de chamar `main()` direto no topo. Aplicar o mesmo padrão em `seed-teams.ts` (T7).

- [ ] **Step 3: Rodar** — `package.json`: `"sync:players": "dotenv -- tsx ingestion/sync-players.ts"`.

Run: `npm run sync:players` → Expected: `sync-players: ~550 jogadores upserted` (free tier tem rate limit — o retry de 429 do `bdlGet` cuida disso; pode demorar alguns minutos).

- [ ] **Step 4: Testes + commit**

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: sync de jogadores ativos via balldontlie

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 9: Ingestão — tipos e normalização

**Files:**
- Create: `ingestion/types.ts`, `ingestion/normalize.ts`
- Test: `ingestion/normalize.test.ts`

**Interfaces:**
- Produces: `RawNewsInput` (contrato entre TODAS as fontes e o pipeline) e `normalizeItem(raw, now): RawNewsInput | null`.

`ingestion/types.ts`:

```ts
export interface RawNewsInput {
  source: string          // 'espn' | 'hoopshype' | 'realgm' | 'reddit'
  externalId?: string
  url: string
  title: string
  excerpt?: string
  imageUrl?: string
  publishedAt: Date
}
```

- [ ] **Step 1: Teste primeiro** — `ingestion/normalize.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { normalizeItem } from './normalize'
import type { RawNewsInput } from './types'

const now = new Date('2026-07-15T12:00:00Z')
const base: RawNewsInput = {
  source: 'espn',
  url: 'https://www.espn.com/nba/story/_/id/1/lakers',
  title: 'Lakers sign veteran guard',
  publishedAt: new Date('2026-07-15T10:00:00Z'),
}

describe('normalizeItem', () => {
  it('aceita item válido e normaliza espaços do título', () => {
    const r = normalizeItem({ ...base, title: '  Lakers   sign\n veteran guard ' }, now)
    expect(r?.title).toBe('Lakers sign veteran guard')
  })
  it('rejeita título ausente ou muito curto', () => {
    expect(normalizeItem({ ...base, title: '' }, now)).toBeNull()
    expect(normalizeItem({ ...base, title: 'NBA' }, now)).toBeNull()
  })
  it('rejeita URL inválida ou não-http', () => {
    expect(normalizeItem({ ...base, url: 'not a url' }, now)).toBeNull()
    expect(normalizeItem({ ...base, url: 'ftp://x.com/a' }, now)).toBeNull()
  })
  it('rejeita item com mais de 14 dias ou data futura (>1h)', () => {
    expect(normalizeItem({ ...base, publishedAt: new Date('2026-06-01T00:00:00Z') }, now)).toBeNull()
    expect(normalizeItem({ ...base, publishedAt: new Date('2026-07-16T00:00:00Z') }, now)).toBeNull()
  })
  it('remove HTML do excerpt e trunca em 300 chars', () => {
    const r = normalizeItem({ ...base, excerpt: `<p>Big ${'x'.repeat(400)}</p>` }, now)
    expect(r?.excerpt?.startsWith('Big x')).toBe(true)
    expect(r?.excerpt?.length).toBe(300)
    expect(r?.excerpt).not.toContain('<p>')
  })
})
```

Run: `npx vitest run normalize` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `ingestion/normalize.ts`:

```ts
import type { RawNewsInput } from './types'

const MAX_AGE_MS = 14 * 24 * 3600 * 1000
const MAX_FUTURE_MS = 3600 * 1000
const MAX_EXCERPT = 300

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function normalizeItem(raw: RawNewsInput, now: Date): RawNewsInput | null {
  const title = raw.title?.replace(/\s+/g, ' ').trim() ?? ''
  if (title.length < 8) return null

  let url: URL
  try { url = new URL(raw.url) } catch { return null }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null

  const t = raw.publishedAt?.getTime()
  if (!t || Number.isNaN(t)) return null
  const age = now.getTime() - t
  if (age > MAX_AGE_MS || age < -MAX_FUTURE_MS) return null

  return {
    ...raw,
    title,
    url: url.toString(),
    excerpt: raw.excerpt ? stripHtml(raw.excerpt).slice(0, MAX_EXCERPT) : undefined,
  }
}
```

Run: `npx vitest run normalize` → Expected: 5 passed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: normalização de itens de notícia com validação

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 10: Fonte RSS (ESPN, HoopsHype, RealGM)

**Files:**
- Create: `ingestion/sources/rss.ts`, `ingestion/fixtures/rss-espn.xml`
- Test: `ingestion/sources/rss.test.ts`

**Interfaces:**
- Consumes: `RawNewsInput` (T9).
- Produces: `RSS_FEEDS: { source: string; url: string }[]` e `parseRssXml(xml: string, source: string): RawNewsInput[]`; `fetchRssFeed(feed): Promise<RawNewsInput[]>`.

- [ ] **Step 1: Fixture + teste primeiro**

`ingestion/fixtures/rss-espn.xml`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"><channel>
  <title>www.espn.com - NBA</title>
  <item>
    <title>Sources: Lakers agree to deal with veteran center</title>
    <link>https://www.espn.com/nba/story/_/id/12345/lakers-center</link>
    <description><![CDATA[The Lakers and the center agreed to a two-year deal.]]></description>
    <pubDate>Tue, 14 Jul 2026 18:30:00 GMT</pubDate>
  </item>
  <item>
    <title>Offseason grades for all 30 teams</title>
    <link>https://www.espn.com/nba/story/_/id/12346/grades</link>
    <description><![CDATA[Our experts grade every move.]]></description>
    <pubDate>Tue, 14 Jul 2026 15:00:00 GMT</pubDate>
  </item>
</channel></rss>
```

`ingestion/sources/rss.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { parseRssXml } from './rss'

const xml = readFileSync('ingestion/fixtures/rss-espn.xml', 'utf-8')

describe('parseRssXml', () => {
  it('extrai itens do feed', () => {
    const items = parseRssXml(xml, 'espn')
    expect(items).toHaveLength(2)
    expect(items[0]).toMatchObject({
      source: 'espn',
      title: 'Sources: Lakers agree to deal with veteran center',
      url: 'https://www.espn.com/nba/story/_/id/12345/lakers-center',
      excerpt: 'The Lakers and the center agreed to a two-year deal.',
    })
    expect(items[0].publishedAt.toISOString()).toBe('2026-07-14T18:30:00.000Z')
  })
})
```

Run: `npx vitest run sources/rss` → Expected: FAIL.

- [ ] **Step 2: Implementar**

```bash
npm i fast-xml-parser
```

`ingestion/sources/rss.ts`:

```ts
import { XMLParser } from 'fast-xml-parser'
import type { RawNewsInput } from '../types'

export const RSS_FEEDS = [
  { source: 'espn', url: 'https://www.espn.com/espn/rss/nba/news' },
  { source: 'hoopshype', url: 'https://hoopshype.com/feed/' },
  { source: 'realgm', url: 'https://basketball.realgm.com/rss/wiretap/0/0.xml' },
] as const

interface RssItem { title?: string; link?: string; description?: string; pubDate?: string; guid?: unknown }

export function parseRssXml(xml: string, source: string): RawNewsInput[] {
  const parsed = new XMLParser({ ignoreAttributes: true }).parse(xml)
  const items: RssItem[] = [parsed?.rss?.channel?.item ?? []].flat()
  return items.flatMap((i) => {
    if (!i.title || !i.link || !i.pubDate) return []
    return [{
      source,
      url: String(i.link),
      title: String(i.title),
      excerpt: i.description ? String(i.description) : undefined,
      publishedAt: new Date(i.pubDate),
    }]
  })
}

export async function fetchRssFeed(feed: { source: string; url: string }): Promise<RawNewsInput[]> {
  const res = await fetch(feed.url, { headers: { 'User-Agent': 'nba-foh-ingest/0.1' } })
  if (!res.ok) throw new Error(`rss ${feed.source}: HTTP ${res.status}`)
  return parseRssXml(await res.text(), feed.source)
}
```

Run: `npx vitest run sources/rss` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: fonte RSS (ESPN, HoopsHype, RealGM)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 11: Fonte Reddit (r/nba)

**Files:**
- Create: `ingestion/sources/reddit.ts`, `ingestion/fixtures/reddit-hot.json`
- Test: `ingestion/sources/reddit.test.ts`

**Interfaces:**
- Consumes: `RawNewsInput` (T9).
- Produces: `mapRedditPosts(listing: RedditListing): RawNewsInput[]` e `fetchRedditNba(): Promise<RawNewsInput[]>`.

- [ ] **Step 1: Fixture + teste primeiro**

`ingestion/fixtures/reddit-hot.json` (forma real de `hot.json`, reduzida):

```json
{
  "data": { "children": [
    { "data": { "id": "abc1", "title": "[Charania] Star guard requests trade", "permalink": "/r/nba/comments/abc1/charania_star/", "created_utc": 1784112000, "score": 5200, "link_flair_text": "Woj", "stickied": false } },
    { "data": { "id": "abc2", "title": "Game thread: Lakers vs Celtics", "permalink": "/r/nba/comments/abc2/game_thread/", "created_utc": 1784112000, "score": 900, "link_flair_text": "Game Thread", "stickied": false } },
    { "data": { "id": "abc3", "title": "Daily discussion", "permalink": "/r/nba/comments/abc3/daily/", "created_utc": 1784112000, "score": 50, "link_flair_text": null, "stickied": true } }
  ] }
}
```

`ingestion/sources/reddit.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { mapRedditPosts, type RedditListing } from './reddit'
import fixture from '../fixtures/reddit-hot.json'

describe('mapRedditPosts', () => {
  it('mantém posts com flair de notícia/rumor, descarta game threads e stickies', () => {
    const items = mapRedditPosts(fixture as RedditListing)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      source: 'reddit',
      externalId: 'abc1',
      url: 'https://www.reddit.com/r/nba/comments/abc1/charania_star/',
      title: '[Charania] Star guard requests trade',
    })
    expect(items[0].publishedAt).toEqual(new Date(1784112000 * 1000))
  })
})
```

Run: `npx vitest run sources/reddit` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `ingestion/sources/reddit.ts`:

```ts
import type { RawNewsInput } from '../types'

export interface RedditListing {
  data: { children: { data: {
    id: string
    title: string
    permalink: string
    created_utc: number
    score: number
    link_flair_text: string | null
    stickied: boolean
  } }[] }
}

const NEWS_FLAIRS = new Set(['News', 'Woj', 'Shams', 'Rumors', 'Trade', 'Trades', 'Free Agency'])
const MIN_SCORE_NO_FLAIR = 500

export function mapRedditPosts(listing: RedditListing): RawNewsInput[] {
  return listing.data.children.flatMap(({ data: p }) => {
    if (p.stickied) return []
    const isNews = (p.link_flair_text && NEWS_FLAIRS.has(p.link_flair_text)) ||
      (!p.link_flair_text && p.score >= MIN_SCORE_NO_FLAIR)
    if (!isNews) return []
    return [{
      source: 'reddit',
      externalId: p.id,
      url: `https://www.reddit.com${p.permalink}`,
      title: p.title,
      publishedAt: new Date(p.created_utc * 1000),
    }]
  })
}

export async function fetchRedditNba(): Promise<RawNewsInput[]> {
  const res = await fetch('https://www.reddit.com/r/nba/hot.json?limit=50', {
    headers: { 'User-Agent': 'nba-foh-ingest/0.1 (contact: github.com/leo/nba-front-office-hub)' },
  })
  if (!res.ok) throw new Error(`reddit: HTTP ${res.status}`)
  return mapRedditPosts(await res.json() as RedditListing)
}
```

Run: `npx vitest run sources/reddit` → Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: fonte Reddit r/nba com filtro de flairs

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 12: Deduplicação

**Files:**
- Create: `ingestion/dedupe.ts`
- Test: `ingestion/dedupe.test.ts`

**Interfaces:**
- Consumes: `RawNewsInput` (T9).
- Produces: `canonicalUrl(url: string): string`, `titleKey(title: string): string`, `dedupeHash(url: string): string` (sha256 da URL canônica — gravado em `NewsItem.dedupeHash`), `dedupeBatch(items: RawNewsInput[], existing: ExistingNews[]): RawNewsInput[]` com `interface ExistingNews { dedupeHash: string; titleKey: string; publishedAt: Date }`.

- [ ] **Step 1: Teste primeiro** — `ingestion/dedupe.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { canonicalUrl, titleKey, dedupeHash, dedupeBatch } from './dedupe'
import type { RawNewsInput } from './types'

const item = (over: Partial<RawNewsInput>): RawNewsInput => ({
  source: 'espn', url: 'https://x.com/a', title: 'Lakers sign center to two-year deal',
  publishedAt: new Date('2026-07-15T10:00:00Z'), ...over,
})

describe('canonicalUrl', () => {
  it('remove utm_*, fbclid, hash, www e barra final', () => {
    expect(canonicalUrl('https://WWW.espn.com/nba/story/?utm_source=x&utm_medium=y&fbclid=z#frag'))
      .toBe('https://espn.com/nba/story')
  })
})

describe('titleKey', () => {
  it('normaliza caixa, pontuação e acentos', () => {
    expect(titleKey('Lakers SIGN  center, to two-year deal!'))
      .toBe(titleKey('lakers sign center to two year deal'))
  })
})

describe('dedupeBatch', () => {
  it('descarta URL já existente (mesmo hash)', () => {
    const a = item({})
    const existing = [{ dedupeHash: dedupeHash(a.url), titleKey: 'outro', publishedAt: a.publishedAt }]
    expect(dedupeBatch([a], existing)).toHaveLength(0)
  })
  it('descarta título quase idêntico de outra fonte em <48h', () => {
    const a = item({ url: 'https://hoopshype.com/b' })
    const existing = [{
      dedupeHash: 'qualquer', titleKey: titleKey(a.title),
      publishedAt: new Date('2026-07-14T10:00:00Z'),
    }]
    expect(dedupeBatch([a], existing)).toHaveLength(0)
  })
  it('mantém item novo e remove duplicata interna do lote', () => {
    const a = item({})
    const b = item({ url: 'https://x.com/a?utm_source=tw' }) // mesma URL canônica
    expect(dedupeBatch([a, b], [])).toHaveLength(1)
  })
})
```

Run: `npx vitest run dedupe` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `ingestion/dedupe.ts`:

```ts
import { createHash } from 'node:crypto'
import type { RawNewsInput } from './types'

const NEAR_DUP_WINDOW_MS = 48 * 3600 * 1000

export interface ExistingNews { dedupeHash: string; titleKey: string; publishedAt: Date }

export function canonicalUrl(raw: string): string {
  const u = new URL(raw)
  u.hash = ''
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, '')
  for (const key of [...u.searchParams.keys()]) {
    if (key.startsWith('utm_') || key === 'fbclid' || key === 'ref') u.searchParams.delete(key)
  }
  let s = u.toString()
  if (s.endsWith('/')) s = s.slice(0, -1)
  return s
}

export function titleKey(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
}

export function dedupeHash(url: string): string {
  return createHash('sha256').update(canonicalUrl(url)).digest('hex')
}

export function dedupeBatch(items: RawNewsInput[], existing: ExistingNews[]): RawNewsInput[] {
  const seenHashes = new Set(existing.map((e) => e.dedupeHash))
  const seenTitles = existing.map((e) => ({ key: e.titleKey, at: e.publishedAt.getTime() }))
  const out: RawNewsInput[] = []
  for (const it of items) {
    const hash = dedupeHash(it.url)
    if (seenHashes.has(hash)) continue
    const key = titleKey(it.title)
    const nearDup = seenTitles.some(
      (s) => s.key === key && Math.abs(s.at - it.publishedAt.getTime()) < NEAR_DUP_WINDOW_MS,
    )
    if (nearDup) continue
    seenHashes.add(hash)
    seenTitles.push({ key, at: it.publishedAt.getTime() })
    out.push(it)
  }
  return out
}
```

Run: `npx vitest run dedupe` → Expected: 4 passed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: deduplicação por URL canônica e título similar

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 13: Tagger — ligar notícias a times e jogadores

**Files:**
- Create: `ingestion/tagger.ts`
- Test: `ingestion/tagger.test.ts`

**Interfaces:**
- Consumes: nada de runtime (função pura; recebe listas).
- Produces: `buildTagDict(teams: TeamRef[], players: PlayerRef[]): TagDict` e `tagText(text: string, dict: TagDict): { teamIds: number[]; playerIds: number[] }`, com `interface TeamRef { id: number; name: string; fullName: string; abbreviation: string }` e `interface PlayerRef { id: number; firstName: string; lastName: string }`.

- [ ] **Step 1: Teste primeiro** — `ingestion/tagger.test.ts`:

```ts
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
```

Run: `npx vitest run tagger` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `ingestion/tagger.ts`:

```ts
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
```

Run: `npx vitest run tagger` → Expected: 5 passed.

- [ ] **Step 3: Commit**

```bash
git add -A && git commit -m "feat: tagger de times/jogadores por dicionário de apelidos

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 14: Orquestrador de ingestão + workflows agendados

**Files:**
- Create: `ingestion/run.ts`, `.github/workflows/ingest.yml`, `.github/workflows/sync-rosters.yml`
- Modify: `package.json` (script `ingest`)

**Interfaces:**
- Consumes: TODAS as peças de T7–T13 (`RSS_FEEDS`, `fetchRssFeed`, `fetchRedditNba`, `normalizeItem`, `dedupeBatch`, `dedupeHash`, `titleKey`, `buildTagDict`, `tagText`, `db`).
- Produces: `npm run ingest` popula `news_items` + `news_tags`; cron de 10 min no GitHub Actions.

- [ ] **Step 1: Orquestrador** — `ingestion/run.ts`:

```ts
import { db } from '@/lib/db'
import { RSS_FEEDS, fetchRssFeed } from './sources/rss'
import { fetchRedditNba } from './sources/reddit'
import { normalizeItem } from './normalize'
import { dedupeBatch, dedupeHash, titleKey } from './dedupe'
import { buildTagDict, tagText } from './tagger'
import type { RawNewsInput } from './types'

async function collect(): Promise<RawNewsInput[]> {
  const jobs: Promise<RawNewsInput[]>[] = [
    ...RSS_FEEDS.map((f) => fetchRssFeed(f)),
    fetchRedditNba(),
  ]
  const results = await Promise.allSettled(jobs)
  const items: RawNewsInput[] = []
  results.forEach((r, i) => {
    const label = i < RSS_FEEDS.length ? RSS_FEEDS[i].source : 'reddit'
    if (r.status === 'fulfilled') {
      console.log(`fonte ${label}: ${r.value.length} itens`)
      items.push(...r.value)
    } else {
      console.error(`fonte ${label} FALHOU: ${r.reason}`)
    }
  })
  return items
}

async function main() {
  const now = new Date()
  const raw = await collect()
  const normalized = raw.map((i) => normalizeItem(i, now)).filter((i) => i !== null)

  const since = new Date(now.getTime() - 7 * 24 * 3600 * 1000)
  const recent = await db.newsItem.findMany({
    where: { publishedAt: { gte: since } },
    select: { dedupeHash: true, title: true, publishedAt: true },
  })
  const existing = recent.map((r) => ({
    dedupeHash: r.dedupeHash, titleKey: titleKey(r.title), publishedAt: r.publishedAt,
  }))
  const fresh = dedupeBatch(normalized, existing)

  const teams = await db.team.findMany({ select: { id: true, name: true, fullName: true, abbreviation: true } })
  const players = await db.player.findMany({ select: { id: true, firstName: true, lastName: true } })
  const dict = buildTagDict(teams, players)

  let created = 0
  for (const item of fresh) {
    const { teamIds, playerIds } = tagText(`${item.title} ${item.excerpt ?? ''}`, dict)
    await db.newsItem.create({
      data: {
        source: item.source,
        externalId: item.externalId,
        url: item.url,
        title: item.title,
        excerpt: item.excerpt,
        imageUrl: item.imageUrl,
        publishedAt: item.publishedAt,
        dedupeHash: dedupeHash(item.url),
        tags: {
          create: [
            ...teamIds.map((teamId) => ({ teamId })),
            ...playerIds.map((playerId) => ({ playerId })),
          ],
        },
      },
    })
    created++
  }
  console.log(`ingest: ${raw.length} coletados, ${normalized.length} válidos, ${fresh.length} novos, ${created} gravados`)
}

if (process.argv[1]?.includes('run.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
```

`package.json`: `"ingest": "dotenv -- tsx ingestion/run.ts"`.

- [ ] **Step 2: Rodar localmente e verificar**

Run: `npm run ingest` → Expected: log com contagem por fonte e `ingest: ... gravados` > 0 na primeira execução; rodar de novo → `0 novos` (dedupe funcionando). Conferir `news_items`/`news_tags` no Prisma Studio.

- [ ] **Step 3: Workflows**

`.github/workflows/ingest.yml`:

```yaml
name: Ingest news
on:
  schedule:
    - cron: '*/10 * * * *'
  workflow_dispatch:

concurrency: ingest

jobs:
  ingest:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx ingestion/run.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

`.github/workflows/sync-rosters.yml` (elencos, 1×/dia às 08:00 UTC):

```yaml
name: Sync rosters
on:
  schedule:
    - cron: '0 8 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx ingestion/seed-teams.ts && npx tsx ingestion/sync-players.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          BALLDONTLIE_API_KEY: ${{ secrets.BALLDONTLIE_API_KEY }}
```

Nota: `npx tsx` direto (sem `dotenv --`) porque no Actions as env vem dos secrets. O script `postinstall` (T2) garante o `prisma generate` após `npm ci`.

- [ ] **Step 4: Push e disparo manual**

```bash
git add -A && git commit -m "feat: orquestrador de ingestão + crons no GitHub Actions

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push origin main
```

No GitHub: Actions → **Ingest news** → Run workflow. Expected: verde, com o mesmo log do run local.

---

### Tarefa 15: Dados financeiros — cap seasons e importação de contratos

**Files:**
- Create: `ingestion/seed-cap.ts`, `ingestion/import-contracts.ts`, `data/contracts.sample.csv`, `data/contracts.csv`, `.github/workflows/import-contracts.yml`
- Test: `ingestion/import-contracts.test.ts`
- Modify: `package.json` (scripts `seed:cap`, `import:contracts`; dep `zod`, `csv-parse`)

**Interfaces:**
- Consumes: `db`, modelos `Contract`/`CapSeason` (T2).
- Produces: `parseContractRows(csv: string): ParsedContract[]` (lança `Error` com as linhas inválidas) e `interface ParsedContract { playerName: string; teamAbbr: string; startSeason: number; endSeason: number; optionType: 'player' | 'team' | null; salariesBySeason: Record<string, number> }`; tabelas `cap_seasons` e `contracts` populadas.

- [ ] **Step 1: Formato do CSV e teste primeiro**

`data/contracts.sample.csv` (colunas fixas; salário vazio = temporada não coberta):

```csv
player_name,team_abbr,start_season,end_season,option_type,salary_2025,salary_2026,salary_2027,salary_2028
LeBron James,LAL,2024,2026,player,52627153,54126380,,
Jaylen Brown,BOS,2024,2028,,49205800,53142264,57078728,61015192
```

`ingestion/import-contracts.test.ts`:

```ts
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
```

Run: `npx vitest run import-contracts` → Expected: FAIL.

- [ ] **Step 2: Implementar**

```bash
npm i zod csv-parse
```

`ingestion/import-contracts.ts`:

```ts
import { parse } from 'csv-parse/sync'
import { z } from 'zod'
import { db } from '@/lib/db'

const rowSchema = z.object({
  player_name: z.string().min(3),
  team_abbr: z.string().length(3),
  start_season: z.coerce.number().int().min(2000).max(2050),
  end_season: z.coerce.number().int().min(2000).max(2050),
  option_type: z.enum(['player', 'team']).nullable(),
})

export interface ParsedContract {
  playerName: string
  teamAbbr: string
  startSeason: number
  endSeason: number
  optionType: 'player' | 'team' | null
  salariesBySeason: Record<string, number>
}

export function parseContractRows(csv: string): ParsedContract[] {
  const records: Record<string, string>[] = parse(csv, { columns: true, skip_empty_lines: true, trim: true })
  const errors: string[] = []
  const out: ParsedContract[] = []

  records.forEach((rec, i) => {
    const line = i + 2 // 1-indexed + header
    const parsed = rowSchema.safeParse({ ...rec, option_type: rec.option_type || null })
    if (!parsed.success) { errors.push(`linha ${line}: ${parsed.error.message}`); return }
    const r = parsed.data
    if (r.end_season < r.start_season) { errors.push(`linha ${line}: end_season < start_season`); return }

    const salariesBySeason: Record<string, number> = {}
    for (const [col, val] of Object.entries(rec)) {
      if (!col.startsWith('salary_') || val === '') continue
      const season = col.replace('salary_', '')
      const amount = Number(val)
      if (!Number.isInteger(amount) || amount < 0) { errors.push(`linha ${line}: ${col} inválido`); return }
      salariesBySeason[season] = amount
    }

    out.push({
      playerName: r.player_name, teamAbbr: r.team_abbr,
      startSeason: r.start_season, endSeason: r.end_season,
      optionType: r.option_type, salariesBySeason,
    })
  })

  if (errors.length) throw new Error(`CSV inválido:\n${errors.join('\n')}`)
  return out
}

export async function importContracts(csv: string) {
  const rows = parseContractRows(csv)
  const teams = await db.team.findMany({ select: { id: true, abbreviation: true } })
  const teamByAbbr = new Map(teams.map((t) => [t.abbreviation, t.id]))
  const unmatched: string[] = []
  let upserted = 0

  for (const row of rows) {
    const teamId = teamByAbbr.get(row.teamAbbr)
    const [firstName, ...rest] = row.playerName.split(' ')
    const player = await db.player.findFirst({
      where: { firstName: { equals: firstName, mode: 'insensitive' }, lastName: { equals: rest.join(' '), mode: 'insensitive' } },
    })
    if (!teamId || !player) { unmatched.push(row.playerName); continue }

    await db.contract.upsert({
      where: { playerId_startSeason: { playerId: player.id, startSeason: row.startSeason } },
      update: { teamId, endSeason: row.endSeason, optionType: row.optionType, salariesBySeason: row.salariesBySeason },
      create: {
        playerId: player.id, teamId,
        startSeason: row.startSeason, endSeason: row.endSeason,
        optionType: row.optionType, salariesBySeason: row.salariesBySeason,
      },
    })
    upserted++
  }
  console.log(`import-contracts: ${upserted} contratos upserted; ${unmatched.length} sem match: ${unmatched.slice(0, 20).join(', ')}`)
}

if (process.argv[1]?.includes('import-contracts.ts')) {
  import('node:fs').then(({ readFileSync }) =>
    importContracts(readFileSync('data/contracts.csv', 'utf-8')),
  ).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
```

`ingestion/seed-cap.ts` (valores oficiais da temporada 2025-26; atualizar 1×/ano):

```ts
import { db } from '@/lib/db'

const CAP_SEASONS = [
  { season: 2025, capAmount: 154_647_000n, taxLine: 187_895_000n, firstApron: 195_945_000n, secondApron: 207_824_000n },
]

async function main() {
  for (const c of CAP_SEASONS) {
    await db.capSeason.upsert({ where: { season: c.season }, update: c, create: c })
  }
  console.log(`seed-cap: ${CAP_SEASONS.length} temporadas`)
}

if (process.argv[1]?.includes('seed-cap.ts')) {
  main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
}
```

Run: `npx vitest run import-contracts` → Expected: 3 passed.

- [ ] **Step 3: Dataset inicial e execução**

Criar `data/contracts.csv` copiando o header do sample. **Preencher com dados reais é trabalho manual do dono do projeto** (fontes comunitárias públicas; começar com 2–3 times para validar e completar depois). Scripts em `package.json`: `"seed:cap": "dotenv -- tsx ingestion/seed-cap.ts"`, `"import:contracts": "dotenv -- tsx ingestion/import-contracts.ts"`.

Run: `npm run seed:cap && npm run import:contracts` → Expected: logs de upsert sem erro.

- [ ] **Step 4: Workflow manual** — `.github/workflows/import-contracts.yml`:

```yaml
name: Import contracts
on: workflow_dispatch

jobs:
  import:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx tsx ingestion/seed-cap.ts && npx tsx ingestion/import-contracts.ts
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
```

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "feat: seed de cap seasons e importação de contratos via CSV

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Fase 3 — Produto

### Tarefa 16: Timeline geral de notícias

**Files:**
- Create: `lib/news.ts`, `lib/time.ts`, `app/api/news/route.ts`, `components/providers.tsx`, `components/news/news-card.tsx`, `components/news/news-list.tsx`, `app/[locale]/(main)/news/page.tsx`
- Test: `lib/news.test.ts`, `lib/time.test.ts`
- Modify: `app/[locale]/layout.tsx` (envolver children com `Providers`), `package.json` (dep `@tanstack/react-query`), messages (`news.*`)

**Interfaces:**
- Consumes: `db` (T2), modelos `NewsItem`/`NewsTag` (populados pela T14).
- Produces: `getNews(filter: NewsFilter, cursor?: string | null, limit?): Promise<{ items: NewsItemDTO[]; nextCursor: string | null }>`, `interface NewsFilter { teamIds?: number[]; playerIds?: number[] }`, `interface NewsItemDTO { id: number; source: string; url: string; title: string; excerpt: string | null; publishedAt: string; tags: { teamId: number | null; teamAbbr: string | null; playerId: number | null; playerName: string | null }[] }`, `encodeCursor`/`decodeCursor`, `buildNewsWhere`; componente `<NewsList initialItems initialCursor filter />` **reutilizado pelo feed (T18) e pelos perfis (T19/T20)**; `relativeTime(date, now, locale)` em `@/lib/time`.

- [ ] **Step 1: Testes primeiro** — `lib/news.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { buildNewsWhere, decodeCursor, encodeCursor } from './news'

describe('cursor', () => {
  it('roundtrip encode/decode', () => {
    const c = { publishedAt: '2026-07-15T10:00:00.000Z', id: 42 }
    expect(decodeCursor(encodeCursor(c))).toEqual(c)
  })
  it('decode rejeita lixo', () => {
    expect(decodeCursor('não-é-base64url!')).toBeNull()
    expect(decodeCursor(null)).toBeNull()
  })
})

describe('buildNewsWhere', () => {
  it('sem filtro retorna where vazio', () => {
    expect(buildNewsWhere({})).toEqual({})
  })
  it('filtra por times e jogadores com OR', () => {
    expect(buildNewsWhere({ teamIds: [1, 2], playerIds: [10] })).toEqual({
      tags: { some: { OR: [{ teamId: { in: [1, 2] } }, { playerId: { in: [10] } }] } },
    })
  })
})
```

`lib/time.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { relativeTime } from './time'

const now = new Date('2026-07-15T12:00:00Z')

describe('relativeTime', () => {
  it('minutos em pt-BR', () => {
    expect(relativeTime(new Date('2026-07-15T11:55:00Z'), now, 'pt-BR')).toBe('há 5 minutos')
  })
  it('horas em en', () => {
    expect(relativeTime(new Date('2026-07-15T09:00:00Z'), now, 'en')).toBe('3 hours ago')
  })
})
```

Run: `npx vitest run lib/news lib/time` → Expected: FAIL.

- [ ] **Step 2: Implementar `lib/time.ts` e `lib/news.ts`**

`lib/time.ts`:

```ts
export function relativeTime(date: Date, now: Date, locale: string): string {
  const diffSec = Math.round((date.getTime() - now.getTime()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'always' })
  const abs = Math.abs(diffSec)
  if (abs < 60) return rtf.format(diffSec, 'second')
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute')
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour')
  return rtf.format(Math.round(diffSec / 86400), 'day')
}
```

`lib/news.ts`:

```ts
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'

export interface NewsFilter { teamIds?: number[]; playerIds?: number[] }
export interface NewsCursor { publishedAt: string; id: number }

export interface NewsItemDTO {
  id: number
  source: string
  url: string
  title: string
  excerpt: string | null
  publishedAt: string
  tags: { teamId: number | null; teamAbbr: string | null; playerId: number | null; playerName: string | null }[]
}

export function encodeCursor(c: NewsCursor): string {
  return Buffer.from(JSON.stringify(c)).toString('base64url')
}

export function decodeCursor(s: string | null): NewsCursor | null {
  if (!s) return null
  try {
    const parsed = JSON.parse(Buffer.from(s, 'base64url').toString()) as NewsCursor
    if (typeof parsed.id !== 'number' || Number.isNaN(Date.parse(parsed.publishedAt))) return null
    return parsed
  } catch {
    return null
  }
}

export function buildNewsWhere(f: NewsFilter): Prisma.NewsItemWhereInput {
  const or: Prisma.NewsTagWhereInput[] = []
  if (f.teamIds?.length) or.push({ teamId: { in: f.teamIds } })
  if (f.playerIds?.length) or.push({ playerId: { in: f.playerIds } })
  return or.length ? { tags: { some: { OR: or } } } : {}
}

export async function getNews(f: NewsFilter, cursorStr?: string | null, limit = 20) {
  const cursor = decodeCursor(cursorStr ?? null)
  const items = await db.newsItem.findMany({
    where: {
      ...buildNewsWhere(f),
      ...(cursor
        ? { OR: [
            { publishedAt: { lt: new Date(cursor.publishedAt) } },
            { publishedAt: new Date(cursor.publishedAt), id: { lt: cursor.id } },
          ] }
        : {}),
    },
    include: { tags: { include: { team: { select: { abbreviation: true } }, player: { select: { firstName: true, lastName: true } } } } },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
  })
  const hasMore = items.length > limit
  const page = hasMore ? items.slice(0, limit) : items
  const last = page.at(-1)
  return {
    items: page.map((i): NewsItemDTO => ({
      id: i.id, source: i.source, url: i.url, title: i.title,
      excerpt: i.excerpt, publishedAt: i.publishedAt.toISOString(),
      tags: i.tags.map((t) => ({
        teamId: t.teamId, teamAbbr: t.team?.abbreviation ?? null,
        playerId: t.playerId,
        playerName: t.player ? `${t.player.firstName} ${t.player.lastName}` : null,
      })),
    })),
    nextCursor: hasMore && last ? encodeCursor({ publishedAt: last.publishedAt.toISOString(), id: last.id }) : null,
  }
}
```

Run: `npx vitest run lib/news lib/time` → Expected: PASS.

- [ ] **Step 3: Route handler + provider TanStack**

```bash
npm i @tanstack/react-query
```

`app/api/news/route.ts`:

```ts
import { NextResponse } from 'next/server'
import { getNews } from '@/lib/news'

function parseIds(v: string | null): number[] {
  return v ? v.split(',').map(Number).filter(Number.isInteger) : []
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const result = await getNews(
    { teamIds: parseIds(searchParams.get('teamIds')), playerIds: parseIds(searchParams.get('playerIds')) },
    searchParams.get('cursor'),
  )
  return NextResponse.json(result)
}
```

`components/providers.tsx`:

```tsx
'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
```

Em `app/[locale]/layout.tsx`, envolver: `<NextIntlClientProvider><Providers>{children}</Providers></NextIntlClientProvider>`.

- [ ] **Step 4: Componentes e página**

`components/news/news-card.tsx`:

```tsx
'use client'
import { useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { relativeTime } from '@/lib/time'
import type { NewsItemDTO } from '@/lib/news'

export function NewsCard({ item }: { item: NewsItemDTO }) {
  const locale = useLocale()
  return (
    <Card>
      <CardContent className="space-y-2 pt-4">
        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
          {item.title}
        </a>
        {item.excerpt && <p className="text-sm text-muted-foreground">{item.excerpt}</p>}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary">{item.source}</Badge>
          <span>{relativeTime(new Date(item.publishedAt), new Date(), locale)}</span>
          {item.tags.map((tag, i) => {
            const label = tag.teamAbbr ?? tag.playerName
            return label ? <Badge key={i} variant="outline">{label}</Badge> : null
          })}
        </div>
      </CardContent>
    </Card>
  )
}
```

`components/news/news-list.tsx`:

```tsx
'use client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { NewsCard } from './news-card'
import type { NewsFilter, NewsItemDTO } from '@/lib/news'

interface Page { items: NewsItemDTO[]; nextCursor: string | null }
interface Props { initialItems: NewsItemDTO[]; initialCursor: string | null; filter: NewsFilter }

async function fetchPage(filter: NewsFilter, cursor: string | null): Promise<Page> {
  const params = new URLSearchParams()
  if (filter.teamIds?.length) params.set('teamIds', filter.teamIds.join(','))
  if (filter.playerIds?.length) params.set('playerIds', filter.playerIds.join(','))
  if (cursor) params.set('cursor', cursor)
  const res = await fetch(`/api/news?${params}`)
  if (!res.ok) throw new Error('news fetch failed')
  return res.json()
}

export function NewsList({ initialItems, initialCursor, filter }: Props) {
  const t = useTranslations('common')
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ['news', filter],
    queryFn: ({ pageParam }) => fetchPage(filter, pageParam),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
    initialData: { pages: [{ items: initialItems, nextCursor: initialCursor }], pageParams: [null] },
    staleTime: 60_000,
  })
  const items = data.pages.flatMap((p) => p.items)
  if (items.length === 0) return <p className="py-8 text-center text-muted-foreground">{t('empty')}</p>
  return (
    <div className="space-y-3">
      {items.map((i) => <NewsCard key={i.id} item={i} />)}
      {hasNextPage && (
        <Button variant="outline" className="w-full" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
          {isFetchingNextPage ? t('loading') : t('loadMore')}
        </Button>
      )}
    </div>
  )
}
```

`app/[locale]/(main)/news/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { getNews } from '@/lib/news'
import { NewsList } from '@/components/news/news-list'

export const revalidate = 60

export default async function NewsPage() {
  const t = await getTranslations('nav')
  const first = await getNews({})
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('news')}</h1>
      <NewsList initialItems={first.items} initialCursor={first.nextCursor} filter={{}} />
    </div>
  )
}
```

- [ ] **Step 5: Verificar + commit**

Run: `npx vitest run && npx tsc --noEmit && npm run dev` → `/news` lista as notícias ingeridas; "Carregar mais" pagina; trocar para EN muda os textos.

```bash
git add -A && git commit -m "feat: timeline geral de notícias com paginação por cursor

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 17: Favoritos + onboarding

**Files:**
- Create: `lib/favorites.ts`, `components/favorites/team-picker.tsx`, `components/favorites/favorite-button.tsx`, `app/[locale]/(main)/onboarding/page.tsx`
- Modify: messages (`onboarding.*`, `favorites.*`)

**Interfaces:**
- Consumes: `requireUser` (T4), `db` (T2), tabela `teams` populada (T7).
- Produces: server actions `toggleFavoriteTeam(teamId: number)`, `toggleFavoritePlayer(playerId: number)`, `saveFavoriteTeams(teamIds: number[])` e `getFavorites(userId: string): Promise<{ teamIds: number[]; playerIds: number[] }>` em `@/lib/favorites`; `<FavoriteButton kind="team"|"player" id={n} active={bool} />` **usado nos perfis T19/T20**.

- [ ] **Step 1: Server actions** — `lib/favorites.ts`:

```ts
'use server'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'

export async function getFavorites(userId: string) {
  const [teams, players] = await Promise.all([
    db.userFavoriteTeam.findMany({ where: { userId }, select: { teamId: true } }),
    db.userFavoritePlayer.findMany({ where: { userId }, select: { playerId: true } }),
  ])
  return { teamIds: teams.map((t) => t.teamId), playerIds: players.map((p) => p.playerId) }
}

export async function toggleFavoriteTeam(teamId: number) {
  const user = await requireUser()
  const where = { userId_teamId: { userId: user.id, teamId } }
  const existing = await db.userFavoriteTeam.findUnique({ where })
  if (existing) await db.userFavoriteTeam.delete({ where })
  else await db.userFavoriteTeam.create({ data: { userId: user.id, teamId } })
  revalidatePath('/', 'layout')
}

export async function toggleFavoritePlayer(playerId: number) {
  const user = await requireUser()
  const where = { userId_playerId: { userId: user.id, playerId } }
  const existing = await db.userFavoritePlayer.findUnique({ where })
  if (existing) await db.userFavoritePlayer.delete({ where })
  else await db.userFavoritePlayer.create({ data: { userId: user.id, playerId } })
  revalidatePath('/', 'layout')
}

export async function saveFavoriteTeams(teamIds: number[]) {
  const user = await requireUser()
  await db.$transaction([
    db.userFavoriteTeam.deleteMany({ where: { userId: user.id } }),
    db.userFavoriteTeam.createMany({ data: teamIds.map((teamId) => ({ userId: user.id, teamId })) }),
  ])
}
```

- [ ] **Step 2: Onboarding**

Messages novos (pt-BR / en): `onboarding.title` ("Escolha seus times" / "Pick your teams"), `onboarding.subtitle` ("Seu feed será personalizado com eles" / "Your feed will be personalized with them"), `onboarding.continue` ("Continuar" / "Continue").

`components/favorites/team-picker.tsx` (client): recebe `teams: { id: number; fullName: string; logoUrl: string | null }[]`; estado `Set<number>` de selecionados; grade `grid grid-cols-2 md:grid-cols-5 gap-3` de cards clicáveis (logo `next/image` 64px + nome, borda `ring-2 ring-primary` quando selecionado); botão `onboarding.continue` desabilitado com 0 seleções; ao confirmar:

```tsx
const [pending, startTransition] = useTransition()
function confirm() {
  startTransition(async () => {
    await saveFavoriteTeams([...selected])
    router.push('/feed')
    router.refresh()
  })
}
```

`app/[locale]/(main)/onboarding/page.tsx`:

```tsx
import { getTranslations } from 'next-intl/server'
import { requireUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { TeamPicker } from '@/components/favorites/team-picker'

export const dynamic = 'force-dynamic'

export default async function OnboardingPage() {
  await requireUser()
  const t = await getTranslations('onboarding')
  const teams = await db.team.findMany({ orderBy: { fullName: 'asc' }, select: { id: true, fullName: true, logoUrl: true } })
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">{t('title')}</h1>
      <p className="text-muted-foreground">{t('subtitle')}</p>
      <TeamPicker teams={teams} />
    </div>
  )
}
```

- [ ] **Step 3: FavoriteButton** — `components/favorites/favorite-button.tsx` (client): estrela (`★`/`☆`), `useTransition`, chama `toggleFavoriteTeam(id)` ou `toggleFavoritePlayer(id)` conforme `kind`, com estado otimista local (`useState(active)`).

- [ ] **Step 4: Verificar + commit**

Run: `npm run dev` → login → `/onboarding` mostra 30 times, selecionar 2 → Continuar → `/feed` (página ainda simples; T18 completa). `npx vitest run && npx tsc --noEmit` verdes.

```bash
git add -A && git commit -m "feat: favoritos com onboarding de times

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 18: Feed personalizado

**Files:**
- Create: `app/[locale]/(main)/feed/page.tsx`
- Modify: messages (`feed.*`)

**Interfaces:**
- Consumes: `requireUser` (T4), `getFavorites` (T17), `getNews`/`NewsList` (T16).
- Produces: rota `/feed` — tab "Meu feed" (filtrado por favoritos) e tab "Tudo".

- [ ] **Step 1: Página**

Messages: `feed.mine` ("Meu feed" / "My feed"), `feed.all` ("Tudo" / "All"), `feed.empty` ("Nada dos seus favoritos ainda — as notícias chegam a cada 10 minutos" / "Nothing from your favorites yet — news arrives every 10 minutes").

`app/[locale]/(main)/feed/page.tsx`:

```tsx
import { getLocale, getTranslations } from 'next-intl/server'
import { redirect } from '@/i18n/navigation'
import { requireUser } from '@/lib/auth'
import { getFavorites } from '@/lib/favorites'
import { getNews } from '@/lib/news'
import { NewsList } from '@/components/news/news-list'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export const dynamic = 'force-dynamic'

export default async function FeedPage() {
  const user = await requireUser()
  const t = await getTranslations('feed')
  const fav = await getFavorites(user.id)
  if (fav.teamIds.length === 0 && fav.playerIds.length === 0) {
    redirect({ href: '/onboarding', locale: await getLocale() })
  }
  const [mine, all] = await Promise.all([getNews(fav), getNews({})])
  return (
    <Tabs defaultValue="mine">
      <TabsList>
        <TabsTrigger value="mine">{t('mine')}</TabsTrigger>
        <TabsTrigger value="all">{t('all')}</TabsTrigger>
      </TabsList>
      <TabsContent value="mine">
        <NewsList initialItems={mine.items} initialCursor={mine.nextCursor} filter={fav} />
      </TabsContent>
      <TabsContent value="all">
        <NewsList initialItems={all.items} initialCursor={all.nextCursor} filter={{}} />
      </TabsContent>
    </Tabs>
  )
}
```

Estado vazio: `NewsList` já mostra `common.empty`; trocar o texto do caso vazio do feed pessoal passando prop opcional `emptyMessage={t('empty')}` a `NewsList` (adicionar `emptyMessage?: string` na interface `Props` da T16 e usar `emptyMessage ?? t('empty')`).

- [ ] **Step 2: Verificar + commit**

Run: `npm run dev` → `/feed` com favoritos mostra só notícias tageadas com eles; tab "Tudo" mostra tudo; sem login redireciona a `/login`; sem favoritos redireciona a `/onboarding`.

```bash
git add -A && git commit -m "feat: feed personalizado com tabs meu-feed/tudo

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 19: Perfil de time + painel financeiro

**Files:**
- Create: `lib/cap.ts`, `lib/money.ts`, `components/teams/financial-panel.tsx`, `components/teams/roster-table.tsx`, `app/[locale]/(main)/teams/page.tsx`, `app/[locale]/(main)/teams/[id]/page.tsx`
- Test: `lib/cap.test.ts`
- Modify: messages (`team.*`, `cap.*`)

**Interfaces:**
- Consumes: `db`, `Contract`/`CapSeason` (T15), `NewsList` (T16), `FavoriteButton` (T17).
- Produces: **funções puras** `currentSeason(now: Date): number`, `seasonLabel(season: number): string` ("2025-26"), `teamPayroll(salaries: number[]): number`, `capBand(payroll: number, cap: CapLine): CapBand`, `capDeltas(payroll, cap)`, com `interface CapLine { season: number; capAmount: number; taxLine: number; firstApron: number; secondApron: number }` e `type CapBand = 'under_cap' | 'over_cap' | 'taxpayer' | 'first_apron' | 'second_apron'`; `formatUsd(n: number): string` em `@/lib/money`. **T20/T21 reutilizam `currentSeason` e `seasonLabel`.**

- [ ] **Step 1: Testes primeiro** — `lib/cap.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { capBand, capDeltas, currentSeason, seasonLabel, teamPayroll } from './cap'

const cap2025 = { season: 2025, capAmount: 154_647_000, taxLine: 187_895_000, firstApron: 195_945_000, secondApron: 207_824_000 }

describe('currentSeason', () => {
  it('julho em diante pertence à temporada que inicia no ano', () => {
    expect(currentSeason(new Date('2026-07-15T12:00:00Z'))).toBe(2026)
    expect(currentSeason(new Date('2026-12-25T12:00:00Z'))).toBe(2026)
  })
  it('antes de julho pertence à temporada iniciada no ano anterior', () => {
    expect(currentSeason(new Date('2026-03-01T12:00:00Z'))).toBe(2025)
  })
})

describe('seasonLabel', () => {
  it('formata com virada de século', () => {
    expect(seasonLabel(2025)).toBe('2025-26')
    expect(seasonLabel(1999)).toBe('1999-00')
  })
})

describe('teamPayroll', () => {
  it('soma salários', () => {
    expect(teamPayroll([100, 200, 300])).toBe(600)
    expect(teamPayroll([])).toBe(0)
  })
})

describe('capBand', () => {
  it('classifica cada faixa', () => {
    expect(capBand(150_000_000, cap2025)).toBe('under_cap')
    expect(capBand(160_000_000, cap2025)).toBe('over_cap')
    expect(capBand(190_000_000, cap2025)).toBe('taxpayer')
    expect(capBand(196_000_000, cap2025)).toBe('first_apron')
    expect(capBand(210_000_000, cap2025)).toBe('second_apron')
  })
})

describe('capDeltas', () => {
  it('calcula distâncias para cada linha', () => {
    expect(capDeltas(160_000_000, cap2025)).toEqual({
      vsCap: 5_353_000, vsTax: -27_895_000, vsFirstApron: -35_945_000, vsSecondApron: -47_824_000,
    })
  })
})
```

Run: `npx vitest run lib/cap` → Expected: FAIL.

- [ ] **Step 2: Implementar**

`lib/cap.ts`:

```ts
export interface CapLine {
  season: number
  capAmount: number
  taxLine: number
  firstApron: number
  secondApron: number
}

export type CapBand = 'under_cap' | 'over_cap' | 'taxpayer' | 'first_apron' | 'second_apron'

export function currentSeason(now: Date): number {
  const y = now.getUTCFullYear()
  return now.getUTCMonth() >= 6 ? y : y - 1 // julho (mês 6) vira a temporada
}

export function seasonLabel(season: number): string {
  return `${season}-${String((season + 1) % 100).padStart(2, '0')}`
}

export function teamPayroll(salaries: number[]): number {
  return salaries.reduce((sum, s) => sum + s, 0)
}

export function capBand(payroll: number, cap: CapLine): CapBand {
  if (payroll >= cap.secondApron) return 'second_apron'
  if (payroll >= cap.firstApron) return 'first_apron'
  if (payroll >= cap.taxLine) return 'taxpayer'
  if (payroll >= cap.capAmount) return 'over_cap'
  return 'under_cap'
}

export function capDeltas(payroll: number, cap: CapLine) {
  return {
    vsCap: payroll - cap.capAmount,
    vsTax: payroll - cap.taxLine,
    vsFirstApron: payroll - cap.firstApron,
    vsSecondApron: payroll - cap.secondApron,
  }
}
```

`lib/money.ts`:

```ts
export function formatUsd(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
```

Run: `npx vitest run lib/cap` → Expected: PASS.

- [ ] **Step 3: Páginas e componentes**

Messages novos: `team.roster` ("Elenco"/"Roster"), `team.news` ("Notícias do time"/"Team news"), `cap.payroll` ("Folha salarial"/"Payroll"), `cap.cap` ("Salary cap"/"Salary cap"), `cap.tax` ("Luxury tax"/"Luxury tax"), `cap.firstApron` ("1º apron"/"1st apron"), `cap.secondApron` ("2º apron"/"2nd apron"), `cap.band.under_cap` ("Abaixo do cap"/"Under the cap"), `cap.band.over_cap` ("Acima do cap"/"Over the cap"), `cap.band.taxpayer` ("Pagando luxury tax"/"Taxpayer"), `cap.band.first_apron` ("Acima do 1º apron"/"Above 1st apron"), `cap.band.second_apron` ("Acima do 2º apron"/"Above 2nd apron").

`app/[locale]/(main)/teams/page.tsx`: server component; `db.team.findMany({ orderBy: [{ conference: 'asc' }, { division: 'asc' }, { fullName: 'asc' }] })`; renderiza grupos por conferência/divisão com `Link` para `/teams/{id}` (logo + nome).

`app/[locale]/(main)/teams/[id]/page.tsx`:

```tsx
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { db } from '@/lib/db'
import { getUser } from '@/lib/auth'
import { getFavorites } from '@/lib/favorites'
import { getNews } from '@/lib/news'
import { currentSeason } from '@/lib/cap'
import { FinancialPanel } from '@/components/teams/financial-panel'
import { RosterTable } from '@/components/teams/roster-table'
import { NewsList } from '@/components/news/news-list'
import { FavoriteButton } from '@/components/favorites/favorite-button'

export const revalidate = 300

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teamId = Number(id)
  if (!Number.isInteger(teamId)) notFound()
  const t = await getTranslations('team')

  const season = currentSeason(new Date())
  const [team, capRow, contracts, news, user] = await Promise.all([
    db.team.findUnique({ where: { id: teamId }, include: { players: { orderBy: { lastName: 'asc' } } } }),
    db.capSeason.findUnique({ where: { season } }),
    db.contract.findMany({
      where: { teamId, startSeason: { lte: season }, endSeason: { gte: season } },
      include: { player: true },
    }),
    getNews({ teamIds: [teamId] }, null, 10),
    getUser(),
  ])
  if (!team) notFound()

  const fav = user ? await getFavorites(user.id) : null
  const salaryByPlayerId = new Map(contracts.map((c) => [
    c.playerId,
    (c.salariesBySeason as Record<string, number>)[String(season)] ?? 0,
  ]))

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        {team.logoUrl && <img src={team.logoUrl} alt="" className="h-16 w-16" />}
        <h1 className="text-2xl font-bold">{team.fullName}</h1>
        {user && <FavoriteButton kind="team" id={team.id} active={fav?.teamIds.includes(team.id) ?? false} />}
      </div>
      <FinancialPanel
        payroll={[...salaryByPlayerId.values()].reduce((a, b) => a + b, 0)}
        cap={capRow ? {
          season: capRow.season,
          capAmount: Number(capRow.capAmount), taxLine: Number(capRow.taxLine),
          firstApron: Number(capRow.firstApron), secondApron: Number(capRow.secondApron),
        } : null}
      />
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('roster')}</h2>
        <RosterTable players={team.players} salaryByPlayerId={salaryByPlayerId} />
      </section>
      <section>
        <h2 className="mb-2 text-lg font-semibold">{t('news')}</h2>
        <NewsList initialItems={news.items} initialCursor={news.nextCursor} filter={{ teamIds: [teamId] }} />
      </section>
    </div>
  )
}
```

`components/teams/financial-panel.tsx` (client): recebe `payroll: number` e `cap: CapLine | null`. Se `cap === null`, renderiza `common.unofficialData` + aviso de dados ausentes. Senão: card com `cap.payroll` em destaque (`formatUsd`), `Badge` com `cap.band.{capBand(payroll, cap)}`, e quatro linhas (cap, tax, 1º/2º apron) mostrando `formatUsd(linha)` e o delta `capDeltas` colorido (verde negativo = abaixo da linha, vermelho positivo = acima), mais nota `common.unofficialData` em texto pequeno.

`components/teams/roster-table.tsx`: `Table` shadcn com colunas nome (link `/players/{id}`), posição, camisa e salário da temporada (`formatUsd` ou "—" se ausente — jogador sem contrato no dataset continua listado).

- [ ] **Step 4: Verificar + commit**

Run: `npm run dev` → `/teams` lista 30 times → clicar em um com contratos importados (T15) mostra folha, banda e elenco com salários; time sem contratos mostra painel com aviso e elenco com "—".

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: perfil de time com painel financeiro (cap/tax/aprons)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 20: Perfil de jogador + busca

**Files:**
- Create: `lib/contracts.ts`, `components/players/contract-card.tsx`, `app/[locale]/(main)/players/page.tsx`, `app/[locale]/(main)/players/[id]/page.tsx`
- Test: `lib/contracts.test.ts`
- Modify: messages (`player.*`)

**Interfaces:**
- Consumes: `currentSeason`, `seasonLabel` (T19), `formatUsd`, `NewsList`, `FavoriteButton`, `db`.
- Produces: **funções puras** em `@/lib/contracts`: `interface ContractShape { startSeason: number; endSeason: number; optionType: string | null; salariesBySeason: Record<string, number> }`, `activeContract<T extends ContractShape>(contracts: T[], season: number): T | null`, `contractRows(c: ContractShape): { season: number; salary: number | null; isOptionYear: boolean }[]`, `yearsRemaining(c: ContractShape, season: number): number`.

- [ ] **Step 1: Testes primeiro** — `lib/contracts.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { activeContract, contractRows, yearsRemaining } from './contracts'

const contract = {
  startSeason: 2024, endSeason: 2026, optionType: 'player',
  salariesBySeason: { '2024': 50, '2025': 52, '2026': 54 },
}

describe('activeContract', () => {
  it('encontra o contrato que cobre a temporada', () => {
    expect(activeContract([contract], 2025)).toBe(contract)
    expect(activeContract([contract], 2027)).toBeNull()
  })
})

describe('contractRows', () => {
  it('gera uma linha por temporada e marca ano de opção', () => {
    expect(contractRows(contract)).toEqual([
      { season: 2024, salary: 50, isOptionYear: false },
      { season: 2025, salary: 52, isOptionYear: false },
      { season: 2026, salary: 54, isOptionYear: true },
    ])
  })
  it('temporada sem valor no dataset vira salary null', () => {
    const rows = contractRows({ ...contract, salariesBySeason: { '2024': 50 } })
    expect(rows[1]).toEqual({ season: 2025, salary: null, isOptionYear: false })
  })
})

describe('yearsRemaining', () => {
  it('conta a temporada corrente e as futuras', () => {
    expect(yearsRemaining(contract, 2025)).toBe(2)
    expect(yearsRemaining(contract, 2027)).toBe(0)
  })
})
```

Run: `npx vitest run lib/contracts` → Expected: FAIL.

- [ ] **Step 2: Implementar** — `lib/contracts.ts`:

```ts
export interface ContractShape {
  startSeason: number
  endSeason: number
  optionType: string | null
  salariesBySeason: Record<string, number>
}

export function activeContract<T extends ContractShape>(contracts: T[], season: number): T | null {
  return contracts.find((c) => c.startSeason <= season && season <= c.endSeason) ?? null
}

export function contractRows(c: ContractShape) {
  const rows: { season: number; salary: number | null; isOptionYear: boolean }[] = []
  for (let season = c.startSeason; season <= c.endSeason; season++) {
    rows.push({
      season,
      salary: c.salariesBySeason[String(season)] ?? null,
      isOptionYear: c.optionType !== null && season === c.endSeason,
    })
  }
  return rows
}

export function yearsRemaining(c: ContractShape, season: number): number {
  return Math.max(0, c.endSeason - season + 1)
}
```

Run: `npx vitest run lib/contracts` → Expected: PASS.

- [ ] **Step 3: Páginas**

Messages: `player.contract` ("Contrato"/"Contract"), `player.noContract` ("Dados de contrato indisponíveis"/"Contract data unavailable"), `player.playerOption` ("Opção do jogador"/"Player option"), `player.teamOption` ("Opção do time"/"Team option"), `player.news` ("Notícias"/"News"), `player.searchPlaceholder` ("Buscar jogador…"/"Search player…"), `player.stats` ("Médias da temporada"/"Season averages"), `player.noStats` ("Sem estatísticas na temporada"/"No stats this season").

**Estatísticas da temporada** (spec §4.5): adicionar em `lib/balldontlie.ts` (T7):

```ts
export interface BdlSeasonAverage {
  pts: number; reb: number; ast: number; stl: number; blk: number
  fg_pct: number; fg3_pct: number; ft_pct: number; games_played: number
}

export async function getSeasonAverage(playerNbaId: number, season: number): Promise<BdlSeasonAverage | null> {
  const { data } = await bdlGet<{ data: BdlSeasonAverage[] }>('/season_averages', {
    season: String(season), 'player_ids[]': String(playerNbaId),
  })
  return data[0] ?? null
}
```

A página do jogador chama `getSeasonAverage(player.nbaId, currentSeason(new Date()))` dentro de try/catch (API fora do ar → `null`) e renderiza uma linha de cards com PPG/RPG/APG/FG%/3P%/GP, ou `player.noStats` quando `null` (offseason recém-iniciada pode não ter dados da temporada nova — nesse caso buscar `season - 1`).

`app/[locale]/(main)/players/page.tsx`: server component com `searchParams` (`?q=`); form GET com `Input name="q"`; se `q` com ≥2 chars: `db.player.findMany({ where: { OR: [{ firstName: { contains: q, mode: 'insensitive' } }, { lastName: { contains: q, mode: 'insensitive' } }] }, include: { team: true }, take: 30, orderBy: { lastName: 'asc' } })`; lista com link `/players/{id}`, nome, posição e sigla do time.

`app/[locale]/(main)/players/[id]/page.tsx` (`revalidate = 300`): busca `db.player.findUnique({ where: { id }, include: { team: true, contracts: true } })` (404 se ausente); header com nome, posição/altura/peso/camisa, link para o time e `FavoriteButton kind="player"`; `activeContract(player.contracts.map(c => ({...c, salariesBySeason: c.salariesBySeason as Record<string, number>})), currentSeason(new Date()))` → se null, card com `player.noContract`; senão `<ContractCard contract={...} />`; seção de notícias com `getNews({ playerIds: [player.id] }, null, 10)` + `NewsList`.

`components/players/contract-card.tsx`: card com tabela — coluna temporada (`seasonLabel`), salário (`formatUsd` ou "—") e badge `player.playerOption`/`player.teamOption` na linha `isOptionYear`; rodapé com `common.unofficialData`.

- [ ] **Step 4: Verificar + commit**

Run: `npm run dev` → buscar "LeBron" em `/players` → perfil mostra contrato por temporada e notícias do jogador.

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: perfil de jogador com contrato e busca

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 21: Free Agents

**Files:**
- Create: `lib/free-agents.ts`, `components/free-agents/fa-table.tsx`, `app/[locale]/(main)/free-agents/page.tsx`
- Test: `lib/free-agents.test.ts`
- Modify: messages (`fa.*`)

**Interfaces:**
- Consumes: `currentSeason`, `seasonLabel` (T19), `db`, contratos (T15).
- Produces: `faStatus(optionType: string | null): 'ufa' | 'player_option' | 'team_option'` (pura) e `getUpcomingFreeAgents(season: number): Promise<FreeAgentRow[]>` com `interface FreeAgentRow { playerId: number; playerName: string; position: string | null; teamId: number; teamAbbr: string; lastSalary: number; status: ReturnType<typeof faStatus> }`.

- [ ] **Step 1: Teste primeiro** — `lib/free-agents.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { faStatus } from './free-agents'

describe('faStatus', () => {
  it('sem opção é UFA; opções viram player/team option', () => {
    expect(faStatus(null)).toBe('ufa')
    expect(faStatus('player')).toBe('player_option')
    expect(faStatus('team')).toBe('team_option')
  })
})
```

Run → FAIL; implementar → PASS.

- [ ] **Step 2: Implementar** — `lib/free-agents.ts`:

```ts
import { db } from '@/lib/db'

export function faStatus(optionType: string | null): 'ufa' | 'player_option' | 'team_option' {
  if (optionType === 'player') return 'player_option'
  if (optionType === 'team') return 'team_option'
  return 'ufa'
}

export interface FreeAgentRow {
  playerId: number
  playerName: string
  position: string | null
  teamId: number
  teamAbbr: string
  lastSalary: number
  status: ReturnType<typeof faStatus>
}

export async function getUpcomingFreeAgents(season: number): Promise<FreeAgentRow[]> {
  const contracts = await db.contract.findMany({
    where: { endSeason: season },
    include: { player: true, team: true },
  })
  return contracts
    .map((c) => ({
      playerId: c.playerId,
      playerName: `${c.player.firstName} ${c.player.lastName}`,
      position: c.player.position,
      teamId: c.teamId,
      teamAbbr: c.team.abbreviation,
      lastSalary: (c.salariesBySeason as Record<string, number>)[String(season)] ?? 0,
      status: faStatus(c.optionType),
    }))
    .sort((a, b) => b.lastSalary - a.lastSalary)
}
```

- [ ] **Step 3: Página e tabela**

Messages: `fa.title` ("Free Agents {season}"/"Free Agents {season}"), `fa.status.ufa` ("UFA"/"UFA"), `fa.status.player_option` ("Opção do jogador"/"Player option"), `fa.status.team_option` ("Opção do time"/"Team option"), `fa.filterPosition` ("Posição"/"Position"), `fa.filterTeam` ("Time"/"Team"), colunas `fa.col.player/team/position/salary/status`.

`app/[locale]/(main)/free-agents/page.tsx` (`revalidate = 3600`): `const season = currentSeason(new Date())`; `getUpcomingFreeAgents(season)`; título `t('fa.title', { season: seasonLabel(season + 1) })` (a offseason abre a temporada seguinte); passa `rows` para `<FaTable rows={rows} />`.

`components/free-agents/fa-table.tsx` (client): `Table` shadcn; estado de ordenação `{ key: 'lastSalary' | 'playerName' | 'teamAbbr', dir: 'asc' | 'desc' }` com clique no header; `Select` de posição (G/F/C/todas, derivado de `rows`) e de time (siglas); nome linka `/players/{id}`, time linka `/teams/{id}`, salário via `formatUsd`, status com `Badge`.

- [ ] **Step 4: Verificar + commit**

Run: `npm run dev` → `/free-agents` lista contratos com `endSeason == temporada corrente`, ordena por clique e filtra por posição/time.

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: lista de free agents com ordenação e filtros

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 22: Configurações + exclusão de conta (LGPD)

**Files:**
- Create: `lib/account.ts`, `app/[locale]/(main)/settings/page.tsx`, `components/settings/settings-form.tsx`, `app/[locale]/(main)/privacy/page.tsx`
- Modify: messages (`settings.*`, `privacy.*`)

**Interfaces:**
- Consumes: `requireUser`, `db`, `createClient` server (T4), env `SUPABASE_SERVICE_ROLE_KEY`.
- Produces: server actions `updateProfile({ name, language })` e `deleteAccount()` em `@/lib/account`.

- [ ] **Step 1: Server actions** — `lib/account.ts`:

```ts
'use server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'
import { requireUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export async function updateProfile(data: { name: string; language: 'pt-BR' | 'en'; avatarUrl: string | null }) {
  const user = await requireUser()
  if (data.name.trim().length < 2) throw new Error('invalid name')
  if (data.avatarUrl) {
    try {
      const u = new URL(data.avatarUrl)
      if (u.protocol !== 'https:') throw new Error()
    } catch {
      throw new Error('invalid avatar url')
    }
  }
  await db.profile.update({
    where: { id: user.id },
    data: { name: data.name.trim(), language: data.language, avatarUrl: data.avatarUrl },
  })
}

export async function deleteAccount() {
  const user = await requireUser()
  // 1. dados próprios (favoritos caem por cascade do Profile)
  await db.profile.delete({ where: { id: user.id } })
  // 2. identidade no Supabase Auth (service role, só no servidor)
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
  await admin.auth.admin.deleteUser(user.id)
  // 3. sessão local
  const supabase = await createClient()
  await supabase.auth.signOut()
}
```

- [ ] **Step 2: Páginas**

Messages: `settings.title` ("Configurações"/"Settings"), `settings.language` ("Idioma"/"Language"), `settings.deleteAccount` ("Excluir minha conta"/"Delete my account"), `settings.deleteConfirm` ("Isso apaga sua conta, favoritos e preferências. Não dá para desfazer." / "This deletes your account, favorites and preferences. This cannot be undone."), `settings.saved` ("Salvo"/"Saved"), `privacy.title` + `privacy.body` (política resumida: dados coletados — e-mail e nome; finalidade — personalização do feed; exclusão autoatendida em Configurações; contato do controlador).

`app/[locale]/(main)/settings/page.tsx` (`dynamic = 'force-dynamic'`): `requireUser()` → carrega `Profile` → renderiza `<SettingsForm profile={{ name, language, avatarUrl }} />`.

`components/settings/settings-form.tsx` (client): `Input` nome + `Input` URL do avatar (`settings.avatar` — "URL do avatar"/"Avatar URL"; preview com `Avatar` shadcn) + `Select` idioma; submit chama `updateProfile` em `useTransition` e, se o idioma mudou, `router.replace(pathname, { locale })` + toast `settings.saved` (sonner). Bloco "zona de perigo": botão destrutivo `settings.deleteAccount` abre `Dialog` com `settings.deleteConfirm` e confirmação que chama `deleteAccount()` e `router.push('/login')`.

`app/[locale]/(main)/privacy/page.tsx`: página estática traduzida; adicionar link no rodapé do `(main)/layout.tsx` (`<footer>` simples com `Link href="/privacy"`).

- [ ] **Step 3: Verificar + commit**

Run: `npm run dev` → alterar nome/idioma persiste (conferir `profiles` no Studio); excluir conta → some de `auth.users`, `profiles` e favoritos; login com a conta excluída falha.

```bash
npx vitest run && npx tsc --noEmit
git add -A && git commit -m "feat: configurações do usuário e exclusão de conta (LGPD)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Tarefa 23: Smoke E2E com Playwright

**Files:**
- Create: `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/smoke.spec.ts`
- Modify: `.github/workflows/ci.yml` (job e2e no push para main), `package.json` (script `e2e`)

**Interfaces:**
- Consumes: app completo (T1–T22), banco dev com times seedados (T7).
- Produces: `npm run e2e` valida o fluxo login → onboarding → feed.

- [ ] **Step 1: Setup**

```bash
npm i -D @playwright/test dotenv
npx playwright install chromium
```

`playwright.config.ts`:

```ts
import { defineConfig } from '@playwright/test'
import 'dotenv/config'

export default defineConfig({
  testDir: 'e2e',
  globalSetup: './e2e/global-setup.ts',
  use: { baseURL: 'http://localhost:3000' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
})
```

`e2e/global-setup.ts` (recria usuário de teste e garante uma notícia tageada):

```ts
import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import 'dotenv/config'

export const E2E_EMAIL = 'e2e@nbafoh.test'
export const E2E_PASSWORD = 'e2e-password-123'

export default async function globalSetup() {
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const db = new PrismaClient()

  const { data } = await admin.auth.admin.listUsers()
  const existing = data.users.find((u) => u.email === E2E_EMAIL)
  if (existing) {
    await db.profile.deleteMany({ where: { id: existing.id } })
    await admin.auth.admin.deleteUser(existing.id)
  }
  const { data: created, error } = await admin.auth.admin.createUser({
    email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true, user_metadata: { name: 'E2E User' },
  })
  if (error || !created.user) throw error ?? new Error('createUser falhou')
  await db.profile.create({ data: { id: created.user.id, name: 'E2E User' } })

  const lakers = await db.team.findFirst({ where: { abbreviation: 'LAL' } })
  if (!lakers) throw new Error('rode npm run seed:teams antes do e2e')
  await db.newsItem.upsert({
    where: { dedupeHash: 'e2e-fixture' },
    update: { publishedAt: new Date() },
    create: {
      source: 'e2e', url: 'https://example.com/e2e', title: 'E2E: Lakers fixture news',
      publishedAt: new Date(), dedupeHash: 'e2e-fixture',
      tags: { create: [{ teamId: lakers.id }] },
    },
  })
  await db.$disconnect()
}
```

- [ ] **Step 2: O teste** — `e2e/smoke.spec.ts`:

```ts
import { expect, test } from '@playwright/test'
import { E2E_EMAIL, E2E_PASSWORD } from './global-setup'

test('login → onboarding → feed personalizado', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill(E2E_EMAIL)
  await page.locator('#password').fill(E2E_PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()

  // sem favoritos, o feed manda para o onboarding
  await page.waitForURL('**/onboarding')
  await page.getByText('Los Angeles Lakers').click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  await page.waitForURL('**/feed')
  await expect(page.getByText('E2E: Lakers fixture news')).toBeVisible()
})
```

`package.json`: `"e2e": "playwright test"`.

Run: `npm run e2e` → Expected: 1 passed.

- [ ] **Step 3: CI** — adicionar job ao `.github/workflows/ci.yml`:

```yaml
  e2e:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run e2e
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          DIRECT_URL: ${{ secrets.DIRECT_URL }}
          NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
          NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

Adicionar os 3 novos secrets no GitHub (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "test: smoke E2E login-onboarding-feed com Playwright

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push origin main
```

Expected: CI verde incluindo o job e2e.

---

### Tarefa 24: Deploy na Vercel + README

**Files:**
- Create: `README.md`
- Manual: projeto na Vercel, URLs no Supabase/Google

- [ ] **Step 1: Deploy (manual, ~15 min)**

1. Vercel → Add New Project → importar o repo GitHub. Framework preset: Next.js (defaults).
2. Environment Variables (Production + Preview): `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Deploy → anotar a URL (`https://<projeto>.vercel.app`).
4. Supabase → Authentication → URL Configuration: Site URL = URL da Vercel; adicionar `https://<projeto>.vercel.app/auth/callback` às Redirect URLs.
5. Se o Google OAuth já estiver configurado: adicionar a mesma callback URL no Google Cloud Console.

- [ ] **Step 2: Sentry (opcional, mas barato de fazer agora)**

```bash
npx @sentry/wizard@latest -i nextjs
```

Seguir o wizard com o DSN do projeto free criado em sentry.io; commit das mudanças geradas.

- [ ] **Step 3: README.md**

Conteúdo: o que é o produto (1 parágrafo), stack, links para a spec e este plano, setup local (clonar → `.env` a partir do `.env.example` → `npm i` → `npm run dev`), tabela de scripts npm (`dev`, `test`, `e2e`, `seed:teams`, `sync:players`, `seed:cap`, `import:contracts`, `ingest`), descrição dos 4 workflows do Actions e nota "dados financeiros não oficiais".

- [ ] **Step 4: Verificação final de produção**

- `https://<projeto>.vercel.app/news` mostra notícias reais (ingestão rodando a cada 10 min).
- Criar conta nova → onboarding → feed personalizado funciona.
- `/teams/<id>` mostra painel financeiro; `/free-agents` lista.
- Trocar idioma PT ↔ EN em produção.

- [ ] **Step 5: Commit final**

```bash
git add -A && git commit -m "docs: README com setup e visão do projeto

Co-Authored-By: Claude Code <noreply@anthropic.com>"
git push origin main
```

---

## Ordem de execução e checkpoints

- **Fase 1 (T1–T6):** ao final, app no ar localmente com login, i18n e CI. Checkpoint: criar conta, navegar, trocar idioma.
- **Fase 2 (T7–T15):** ao final, banco populado com times, jogadores, notícias e contratos. Checkpoint: `npm run ingest` duas vezes (2ª não duplica); Prisma Studio com dados coerentes.
- **Fase 3 (T16–T24):** ao final, MVP completo em produção. Checkpoint: fluxo E2E verde + verificação manual de produção (T24).

Dependências fortes: T14 precisa de T7–T13; T16 precisa de T14 com dados reais; T19–T21 precisam de T15 com pelo menos alguns times preenchidos no CSV.
