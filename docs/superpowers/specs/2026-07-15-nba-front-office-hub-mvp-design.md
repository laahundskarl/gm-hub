# NBA Front Office Hub — Especificação do MVP

**Data:** 2026-07-15
**Status:** Aprovado em brainstorming (aguardando revisão final do documento)
**Documento de origem:** `NBA_Front_Office_Hub_Requisitos.md` (visão completa do produto)

## 1. Contexto e objetivo

Plataforma web que centraliza informações da NBA voltadas a Free Agency, Draft,
Trades, Salary Cap e notícias — um "Bloomberg Terminal" da NBA.

Este documento especifica **apenas o MVP**, cujo objetivo é **validar a ideia
com custo zero e velocidade máxima**. A hipótese central a validar:

> Fãs hardcore de NBA querem um lugar único que combine **notícias/rumores
> agregados e personalizados** com **contexto financeiro (salários, cap,
> luxury tax)** lado a lado.

**Critério de sucesso do MVP:** usuários que não são o autor usam o produto
mais de uma vez na mesma semana, e o painel financeiro dos perfis de time
registra visitas.

## 2. Decisões macro (tomadas em brainstorming)

| Decisão | Escolha | Justificativa |
|---|---|---|
| Propósito | MVP para validar ideia | Velocidade > perfeição arquitetural |
| Equipe | Solo, desenvolvimento orquestrado por IA | Stack deve ser a que a IA gera melhor código |
| Orçamento | ~US$ 0/mês | Free tiers + fontes de dados gratuitas |
| Linguagem | TypeScript de ponta a ponta | Uma linguagem para tudo; ecossistema onde IA é mais produtiva; tipos compartilhados entre banco, API e UI |
| Arquitetura | Monolito Next.js (Abordagem A) | Mínimo de partes móveis; costuras marcadas para evoluir |
| Idioma do produto | UI bilíngue PT/EN desde o início | Conteúdo das fontes permanece em inglês |

### Abordagens consideradas e descartadas

- **B — Stack completa do documento original** (Next.js + NestJS + BullMQ +
  Redis em VM Oracle Always Free): arquitetura definitiva desde já, porém
  exige administrar VM/Docker, tem 6+ partes móveis e atrasa o MVP. Fica como
  **alvo de evolução** quando houver tração (ver §11).
- **C — Supabase-first** (Edge Functions + pg_cron para ingestão): menos
  código próprio, porém backend em Deno (ecossistema menor, IA menos
  produtiva), lock-in alto e debugging de cron dentro do banco.

## 3. Stack

| Camada | Tecnologia | Hospedagem/custo |
|---|---|---|
| Frontend + API | Next.js 15 (App Router), React, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query | Vercel Hobby (US$ 0) |
| Banco | PostgreSQL via Prisma ORM | Supabase free (500 MB) |
| Autenticação | Supabase Auth (e-mail/senha + Google OAuth) | Incluso no Supabase free |
| Ingestão de dados | Scripts TypeScript agendados | GitHub Actions cron (US$ 0) |
| i18n | next-intl (PT-BR e EN) | — |
| Erros em produção | Sentry free tier | US$ 0 |
| CI | GitHub Actions (typecheck, lint, testes) | US$ 0 |

Sem Redis, sem worker dedicado, sem Docker e sem WebSocket no MVP — o cache é
a revalidação nativa do Next.js (ISR) e a atualização do feed é por polling.

## 4. Escopo do MVP

### Entra

1. **Autenticação** — e-mail/senha e Google OAuth via Supabase Auth.
2. **Perfil e preferências** — nome, avatar, idioma da UI (PT/EN), times e
   jogadores favoritos.
3. **Feed personalizado** — timeline de notícias/rumores filtrada pelos
   favoritos do usuário, com aba "Tudo" (sem filtro).
4. **Perfil de time** — elenco atual + **painel financeiro**: folha salarial
   total, posição relativa ao cap / luxury tax / 1º e 2º aprons, e lista de
   contratos do elenco.
5. **Perfil de jogador** — dados básicos, estatísticas da temporada e
   **contrato atual** (valor por temporada, anos restantes, tipo de opção).
6. **Timeline geral de notícias** — mesma engine do feed, sem filtro de
   favoritos.
7. **Free Agents (versão simples)** — lista derivada dos contratos que
   expiram na próxima offseason, ordenável por salário, posição e time.
   Sem score/ranking próprio no MVP.
8. **UI bilíngue** — PT-BR e EN em todos os componentes desde o início.

### Fica fora (adiado com justificativa)

| Item | Destino | Justificativa |
|---|---|---|
| Notificações (in-app e push) | Fase 2 | O feed personalizado já entrega o valor; notificação só faz sentido com usuários recorrentes |
| Resumos/IA | Fase 3 | Custo por chamada incompatível com orçamento zero; título+fonte+link já validam a hipótese |
| Atualização < 30 s | Relaxado para 5–15 min | Limite do cron gratuito; indistinguível para validação |
| WebSocket/realtime | Fase 2+ | Feed atualiza por revalidação (60 s) |
| Trade Machine, simuladores, Rumor Meter | Fase 3 | Conforme roadmap do documento original |

## 5. Estrutura do repositório

Um repositório, um deploy:

```
nba-front-office-hub/
├── app/                  # Next.js App Router
│   ├── (auth)/           # login, cadastro
│   ├── (main)/           # feed, times, jogadores, free-agents, perfil
│   └── api/              # route handlers (quando necessário)
├── components/           # UI (shadcn/ui + componentes do produto)
├── lib/                  # supabase client, prisma client, i18n, helpers
├── ingestion/            # scripts TS executados pelo GitHub Actions
│   ├── sources/          # rss.ts, reddit.ts, balldontlie.ts
│   ├── normalize.ts      # converte cada fonte ao formato único de notícia
│   ├── dedupe.ts         # hash de URL + similaridade de título
│   ├── tagger.ts         # liga notícia a times/jogadores (dicionário de apelidos)
│   └── run.ts            # orquestra: coleta → normaliza → dedup → tag → upsert
├── data/                 # datasets de contratos e cap (CSV versionado)
├── prisma/               # schema.prisma + migrations
├── messages/             # traduções next-intl (pt-BR.json, en.json)
└── .github/workflows/    # ingest.yml, import-contracts.yml, ci.yml
```

**Fronteiras de módulo:** `ingestion/` não importa nada de `app/` — comunica-se
apenas pelo banco (via Prisma). É a "costura marcada" para extração futura em
worker dedicado. `lib/` é a única porta de acesso a Supabase/Prisma para o app.

## 6. Modelo de dados

Usuário e favoritos seguem o documento original; identidade fica no Supabase
Auth (`auth.users`) e o restante em tabelas próprias:

| Tabela | Campos principais | Origem dos dados |
|---|---|---|
| `Profile` | id (= auth.users.id), name, avatar_url, language | Cadastro |
| `UserFavoriteTeam` | user_id, team_id | Usuário |
| `UserFavoritePlayer` | user_id, player_id | Usuário |
| `Team` | id, nba_id, name, abbreviation, conference, division, logo_url | balldontlie (seed único) |
| `Player` | id, nba_id, name, team_id, position, jersey, height, weight | balldontlie (sync diário) |
| `Contract` | id, player_id, team_id, salaries_by_season (jsonb), option_type, start_season, end_season | CSV importado (semanal) |
| `CapSeason` | season, cap_amount, tax_line, first_apron, second_apron | Manual (1×/ano) |
| `NewsItem` | id, source, external_id, url, title, excerpt, image_url, published_at, dedupe_hash | Ingestão (10 min) |
| `NewsTag` | news_item_id, team_id?, player_id? | Tagger da ingestão |

Consultas derivadas (sem tabelas extras):

- **Painel financeiro do time:** `SUM(salário da temporada corrente dos
  contratos ativos do time)` comparado a `CapSeason`.
- **Free Agents:** contratos com `end_season = temporada corrente` (e opções
  de jogador/time sinalizadas).
- **Feed personalizado:** `NewsItem JOIN NewsTag WHERE team_id IN (favoritos)
  OR player_id IN (favoritos)`, ordenado por `published_at`, paginação por
  cursor.

## 7. Fontes de dados (todas gratuitas)

| Dado | Fonte | Frequência | Observação |
|---|---|---|---|
| Times e elencos | balldontlie API (free tier) | Seed + sync diário | Respeitar rate limit do free tier |
| Notícias | RSS: ESPN NBA, HoopsHype, RealGM (e afins) | A cada 10 min | Armazenamos título/resumo/link — o clique leva à fonte (respeita direitos de conteúdo) |
| Rumores/discussão | Reddit API (r/nba, hot + new) | A cada 10 min | OAuth de app gratuito; respeitar rate limits |
| Contratos/salários | Dataset CSV em `data/` (fontes comunitárias) | Importação semanal via workflow manual | Sem scraping que viole termos de uso; precisão "boa o suficiente" para MVP |
| Valores de cap/tax/aprons | Inserção manual em `CapSeason` | 1×/ano | Valores públicos oficiais |

## 8. Fluxos principais

**Ingestão de notícias** (GitHub Actions, cron a cada 10 min):
`run.ts` → coleta todas as fontes em paralelo (cada fonte isolada em
try/catch — uma falhar não derruba as demais) → normaliza ao formato
`NewsItem` → deduplica (hash canônico da URL; similaridade de título entre
fontes) → tageia times/jogadores via dicionário de nomes e apelidos →
upsert no Postgres. Log estruturado no summary do workflow; falha total do
workflow dispara e-mail do GitHub.

**Leitura do feed:** Server Component com `revalidate: 60`; paginação
"carregar mais" no cliente via TanStack Query com cursor.

**Onboarding:** cadastro → escolher ≥1 time favorito (tela dedicada) →
feed já personalizado na primeira visita.

**Importação de contratos:** workflow manual (`workflow_dispatch`) valida o
CSV (schema + sanidade de valores) e faz upsert; erros de validação abortam
sem gravar nada.

## 9. Tratamento de erros e casos vazios

- Feed sem favoritos → sugerir times populares; feed vazio → estado desenhado.
- Fonte de notícia fora do ar → registrada no log, demais fontes seguem.
- Rate limit (Reddit/balldontlie) → backoff exponencial e respeito a headers.
- Error boundaries por rota no Next.js; Sentry captura erros de produção.
- Jogador sem contrato no dataset → exibir "dados de contrato indisponíveis"
  (nunca esconder o jogador).

## 10. Testes e qualidade

- **Vitest (unit):** normalização, dedupe e tagger — o coração da ingestão —
  com fixtures reais de RSS/JSON salvos no repositório.
- **Playwright (smoke E2E):** login → favoritar time → ver feed personalizado.
- **CI (GitHub Actions):** typecheck + lint + unit em todo PR; smoke E2E no
  merge para main.
- **LGPD:** coleta mínima (e-mail, nome), exclusão de conta autoatendida com
  cascade das tabelas próprias, página de política de privacidade.

## 11. Evolução pós-validação (não construir agora)

Se o MVP validar a hipótese, o caminho já está pavimentado — nenhum código é
jogado fora:

1. **Fase 2:** `ingestion/` vira worker NestJS + BullMQ + Redis (Railway ou
   VM), habilitando latência < 30 s, notificações e WebSocket. O código de
   normalização/dedupe/tagger migra como está.
2. **Dados licenciados:** `Contract`/`CapSeason` passam a ser alimentados por
   provedor licenciado — mesmo schema, nova origem.
3. **Fase 3:** IA (resumos, CBA, simuladores) como serviços consumindo o
   mesmo banco.

## 12. Riscos aceitos no MVP

- Dataset de salários comunitário pode ter imprecisões → aceitável para
  validação; painel exibirá nota "dados não oficiais".
- Free tiers têm limites (500 MB Postgres, minutos de Actions em repo
  privado) → monitorar; repo público zera o custo de Actions.
- APIs não oficiais (balldontlie) podem mudar → módulo `sources/` isola cada
  fonte atrás de uma interface única.
- Latência de 10 min nas notícias → aceita conscientemente (ver §4).
