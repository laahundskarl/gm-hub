# NBA Front Office Hub - Documento de Visão Técnica

## Objetivo

Construir uma plataforma web (e futuramente mobile) que centralize
informações da NBA voltadas a Free Agency, Draft, Trades, Salary Cap e
notícias em tempo real. O produto deve funcionar como um "Bloomberg
Terminal" da NBA, agregando dados, contexto e análises.

## Público-alvo

-   Fãs hardcore da NBA
-   Criadores de conteúdo
-   Jornalistas
-   Comunidade de fantasy
-   Desenvolvedores de conteúdo esportivo

## MVP

### Funcionalidades

-   Autenticação (e-mail/OAuth)
-   Perfil do usuário
-   Seleção de times favoritos
-   Seleção de jogadores favoritos
-   Feed personalizado
-   Perfil de times
-   Perfil de jogadores
-   Ranking de Free Agents
-   Timeline de notícias
-   Notificações

## Roadmap

### Fase 1

-   Login
-   Preferências
-   Feed
-   Favoritos

### Fase 2

-   Salary Cap
-   Luxury Tax
-   Aprons
-   Contratos
-   Draft Picks
-   Timeline de rumores

### Fase 3

-   IA
-   Trade Machine
-   Simulador de contratos
-   Rumor Meter
-   Push Notifications

## Arquitetura

Frontend: - Next.js - React - TypeScript - Tailwind CSS - shadcn/ui -
TanStack Query

Backend: - NestJS - REST + WebSocket - BullMQ - Redis

Persistência: - PostgreSQL - Prisma ORM

Infraestrutura: - Vercel - Railway/Fly.io - Docker - GitHub Actions

## Modelo de Dados

### User

-   id
-   name
-   email
-   password_hash
-   created_at

### UserFavoriteTeam

-   id
-   user_id
-   team_id

### UserFavoritePlayer

-   id
-   user_id
-   player_id

### UserSettings

-   theme
-   language
-   notifications
-   favorite_sources

### Notification

-   id
-   user_id
-   type
-   payload
-   read

## Fontes de Dados

Prioridade: 1. NBA APIs (elencos, estatísticas, jogos) 2. NBA Stats 3.
Reddit API 4. Fontes oficiais de notícias (ESPN, NBA) 5. Dados salariais
via provedores licenciados quando disponíveis.

Observação: - Evitar scraping quando violar termos de uso. - Preferir
APIs oficiais ou licenciadas.

## Workers

Responsabilidades: - Coletar notícias - Normalizar eventos - Identificar
jogadores/times - Deduplicar - Gerar resumos por IA - Atualizar cache -
Disparar notificações

## IA

Casos de uso: - Resumo de rumores - Explicação de regras do CBA -
Perguntas sobre cap - Simulação de offseason - Probabilidade de destino
de Free Agents (heurística inicialmente; modelo preditivo no futuro)

## Dashboard

Módulos: - Breaking News - Rumors - Transactions - Free Agency - Salary
Cap - Luxury Tax - Draft Picks - Trade Machine - Analytics - Timeline

## Requisitos Não Funcionais

-   Tempo de atualização inferior a 30 s para notícias.
-   Cache distribuído.
-   Observabilidade (logs, métricas e tracing).
-   Testes automatizados.
-   LGPD para dados de usuários.
-   Escalabilidade horizontal.

## Riscos

-   Custos/licenciamento de APIs.
-   Limitações de APIs do X.
-   Mudanças anuais no CBA.
-   Direitos de uso de conteúdo.

## Diferenciais

-   Feed personalizado.
-   Dados financeiros centralizados.
-   IA contextual.
-   Simuladores.
-   Rumor Meter.
-   Experiência única focada em Front Office.

## Futuro

-   Aplicativos iOS/Android.
-   Fantasy Tools.
-   Mock Draft.
-   API pública.
-   Planos Premium.
