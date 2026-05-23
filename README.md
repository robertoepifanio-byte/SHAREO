# ShareO

Marketplace de economia circular para aluguel local de itens entre pessoas e empresas.

**Stack**: Next.js 14 · TypeScript · Tailwind CSS · Supabase · Prisma · NextAuth.js v5

---

## Pré-requisitos

| Ferramenta | Versão mínima | Verificar |
|---|---|---|
| Node.js | 20 LTS | `node -v` |
| pnpm | 9+ | `pnpm -v` |
| Git | qualquer | `git --version` |
| Conta Supabase | — | [supabase.com](https://supabase.com) |

> Instalar pnpm: `npm install -g pnpm`

---

## Setup em 5 passos

### 1. Clonar e instalar dependências

```bash
git clone https://github.com/seu-org/shareo.git
cd shareo
pnpm install
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env.local
```

Abra `.env.local` e preencha as variáveis obrigatórias (marcadas abaixo). As opcionais têm valores padrão para desenvolvimento.

### 3. Criar projeto Supabase

1. Acesse [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**
2. Nome: `shareo-dev` · Região: `South America (São Paulo)`
3. Após criação, acesse **Settings → Database** e copie:
   - **Connection string** (Transaction mode, porta 6543) → `DATABASE_URL`
   - **Direct connection** (porta 5432) → `DIRECT_URL`
4. Acesse **Settings → API** e copie:
   - `URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY`
5. Ativar extensão PostGIS: **Database → Extensions** → buscar `postgis` → **Enable**

### 4. Rodar migrations e seed

```bash
# Criar as tabelas no banco
pnpm prisma migrate dev --name init

# Popular categorias e usuário admin inicial
pnpm prisma db seed
```

### 5. Iniciar o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000).

---

## Variáveis obrigatórias para o dev funcionar

```env
DATABASE_URL=          # Supabase connection string (pooler, porta 6543)
DIRECT_URL=            # Supabase direct connection (porta 5432)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_SECRET=           # Gerar: openssl rand -base64 32
NEXT_PUBLIC_MAPBOX_TOKEN=  # mapbox.com → Account → Tokens
```

As demais variáveis (Sentry, Resend, criptografia) são necessárias apenas para features específicas. O app sobe sem elas em desenvolvimento.

---

## Comandos do dia a dia

```bash
pnpm dev              # servidor de desenvolvimento (localhost:3000)
pnpm build            # build de produção
pnpm lint             # ESLint
pnpm test             # Jest (unitários + integração)
pnpm test:e2e         # Playwright (E2E)
pnpm type-check       # tsc --noEmit

# Prisma
pnpm prisma studio           # GUI do banco (localhost:5555)
pnpm prisma migrate dev      # nova migration após alterar schema.prisma
pnpm prisma migrate reset    # reset completo do banco (dev only)
pnpm prisma generate         # regenerar o Prisma Client
pnpm prisma db seed          # rodar seed

# Supabase local (opcional — alternativa ao projeto cloud)
pnpm supabase start          # sobe Supabase local via Docker
pnpm supabase stop
```

---

## Estrutura do projeto

```
app/            # Rotas Next.js (App Router)
├── (public)/   # Rotas sem autenticação (home, login, listagens)
├── (auth)/     # Rotas autenticadas (dashboard, anúncios, chat)
├── (admin)/    # Rotas de administração
└── api/        # Route Handlers (REST API interna)

components/
├── ui/         # Primitivos do Design System (Button, Input, Card…)
└── domain/     # Componentes com lógica de negócio (ItemCard, ChatWindow…)

lib/            # Clientes de serviço (prisma, supabase, auth)
hooks/          # React hooks customizados
services/       # Chamadas à API interna (client-side)
utils/          # Funções puras (validação CPF/CNPJ, formatação)
prisma/         # Schema e migrations
```

Estrutura completa com convenções: [`docs/estrutura-projeto.md`](docs/estrutura-projeto.md)

---

## Ambientes

| Ambiente | Branch | Deploy | Banco |
|---|---|---|---|
| Development | qualquer | local (`pnpm dev`) | Supabase `shareo-dev` |
| Staging | `main` | Vercel automático | Supabase `shareo-staging` |
| Production | tag `v*` + aprovação | Vercel manual | Supabase `shareo-prod` |

---

## Fluxo de contribuição

```bash
# 1. Criar branch a partir de main
git checkout -b feat/nome-da-feature

# 2. Desenvolver com testes
pnpm test --watch

# 3. Antes de abrir PR
pnpm lint && pnpm type-check && pnpm test

# 4. Abrir PR para main
# O CI roda automaticamente (lint → testes → build → preview deploy)
```

Convenção de commits: `feat:`, `fix:`, `chore:`, `docs:`, `test:`

---

## Documentação técnica

| Documento | Conteúdo |
|---|---|
| [`PRD.md`](PRD.md) | Personas, features, fluxos e critérios de aceite do MVP |
| [`ADRs/ADR-001-autenticacao.md`](ADRs/ADR-001-autenticacao.md) | Decisão: NextAuth.js v5 |
| [`ADRs/ADR-002-mapas.md`](ADRs/ADR-002-mapas.md) | Decisão: Mapbox + PostGIS |
| [`ADRs/ADR-003-chat.md`](ADRs/ADR-003-chat.md) | Decisão: Supabase Realtime |
| [`docs/estrutura-projeto.md`](docs/estrutura-projeto.md) | Estrutura de pastas e convenções |
| [`prisma/schema.prisma`](prisma/schema.prisma) | Schema do banco de dados |
| [`.env.example`](.env.example) | Todas as variáveis de ambiente documentadas |

---

## Problemas comuns

**`PrismaClientInitializationError` ao rodar migrations**
> Verifique se `DIRECT_URL` aponta para a porta `5432` (não `6543`). O pooler não suporta migrations.

**`Error: Cannot find module '@/components/...'`**
> Rode `pnpm install` — o path alias `@/` requer o `tsconfig.json` correto, gerado após a instalação.

**Mapa não aparece (tela em branco)**
> Confirme que `NEXT_PUBLIC_MAPBOX_TOKEN` está preenchido no `.env.local`. Tokens Mapbox começam com `pk.`.

**Realtime do chat não conecta**
> Verifique se a extensão `pg_net` está ativa no Supabase e se `NEXT_PUBLIC_SUPABASE_ANON_KEY` é a chave correta do projeto de dev (não de staging).

**PostGIS: `type "geometry" does not exist`**
> A extensão PostGIS não foi ativada no projeto Supabase. Acesse **Database → Extensions → postgis → Enable** antes de rodar a migration.

---

## Contato e suporte

- Dúvidas de produto: abrir issue ou falar com o PO
- Dúvidas de infra/deploy: falar com o DevOps
- Bugs: abrir issue com o template de bug report do QA
