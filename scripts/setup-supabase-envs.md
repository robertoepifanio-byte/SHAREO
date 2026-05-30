# Setup: 3 Instâncias Supabase (dev / staging / production)

Guia passo a passo para configurar os três ambientes isolados do ShareO no Supabase.
Execute uma vez ao iniciar o projeto ou ao integrar um novo membro com acesso de admin.

---

## Pré-requisitos

- Conta Supabase com organização criada (https://supabase.com/dashboard)
- Acesso ao repositório GitHub com permissão de admin (para configurar Secrets)
- Node.js >= 20 e pnpm >= 11 instalados localmente
- Vercel CLI instalado: `npm install -g vercel@latest`

---

## Parte 1 — Criar os 3 projetos no Supabase Dashboard

Repita os passos abaixo para cada ambiente: **dev**, **staging** e **production**.

### 1.1 Criar o projeto

1. Acesse https://supabase.com/dashboard/projects
2. Clique em **New project**
3. Preencha:
   - **Name**: `shareo-dev` / `shareo-staging` / `shareo-prod`
   - **Database password**: gere uma senha forte (guarde — você precisará para a connection string)
   - **Region**: `South America (São Paulo)` — `sa-east-1`
   - **Pricing plan**: Free (dev/staging) | Pro (production quando necessário)
4. Clique em **Create new project** e aguarde o provisionamento (~2 min)

### 1.2 Coletar as credenciais

Após o projeto estar ativo, colete os seguintes valores em **Settings > API**:

| Campo | Onde encontrar |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project API Keys > anon / public |
| `SUPABASE_SERVICE_ROLE_KEY` | Project API Keys > service_role |

Em **Settings > Database > Connection string**, colete:

| Campo | Formato |
|---|---|
| `DATABASE_URL` | URI com `?pgbouncer=true` na porta 6543 (Pooler) |
| `DIRECT_URL` | URI sem `?pgbouncer=true` na porta 5432 (Direct) |

### 1.3 Configurar o JWT Secret (AUTH_SECRET)

O `AUTH_SECRET` do NextAuth.js **deve ser o mesmo** configurado no Supabase para validação de tokens.

1. Em **Settings > API > JWT Settings**, clique em **Show JWT Secret**
2. Copie o valor — este é o JWT secret nativo do Supabase
3. No NextAuth.js, o `AUTH_SECRET` pode ser gerado independentemente com `openssl rand -base64 32`
   - Os dois valores são independentes — o Supabase usa o JWT nativo para o client JS,
     o NextAuth usa o `AUTH_SECRET` para sessões server-side
4. Salve o `AUTH_SECRET` de cada ambiente no GitHub Secrets (veja Parte 2)

### 1.4 Habilitar MFA no Supabase (obrigatório para produção)

1. Vá em **Authentication > Settings > Multi-factor authentication**
2. Ative MFA para membros do time com acesso ao painel de produção
3. No painel do Supabase, em **Settings > Team**, remova acessos desnecessários

---

## Parte 2 — Configurar GitHub Secrets

Acesse: `github.com/[org]/shareo/settings/secrets/actions`

Clique em **New repository secret** para cada valor abaixo.

### Secrets globais (usados em todos os ambientes)

| Secret | Valor |
|---|---|
| `VERCEL_TOKEN` | Gerado em https://vercel.com/account/tokens |
| `VERCEL_ORG_ID` | Em Vercel Dashboard > Settings > General > Team ID |
| `VERCEL_PROJECT_ID` | Em Vercel Project > Settings > General > Project ID |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `ENCRYPTION_KEY` | `openssl rand -hex 32` |

### Secrets de Staging

| Secret | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL_STAGING` | URL do projeto `shareo-staging` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY_STAGING` | Anon key do projeto `shareo-staging` |
| `DATABASE_URL_STAGING` | Connection string pooler do `shareo-staging` |
| `DIRECT_URL_STAGING` | Connection string direct do `shareo-staging` |
| `STAGING_URL` | URL do deploy de staging no Vercel (ex: `https://shareo-staging.vercel.app`) |

### Secrets de Production

| Secret | Valor |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL_PROD` | URL do projeto `shareo-prod` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD` | Anon key do projeto `shareo-prod` |
| `DATABASE_URL_PROD` | Connection string pooler do `shareo-prod` |
| `DIRECT_URL_PROD` | Connection string direct do `shareo-prod` |

---

## Parte 3 — Configurar o ambiente de produção com aprovação obrigatória

O deploy em produção requer aprovação manual de um reviewer antes de ser executado.

1. Acesse `github.com/[org]/shareo/settings/environments`
2. Clique em **New environment** e crie:
   - `preview` (sem proteção — deploy automático de PRs)
   - `staging` (sem proteção — deploy automático após merge na main)
   - `production` (com proteção obrigatória)
3. Na environment `production`, ative:
   - **Required reviewers**: adicione os aprovadores autorizados (Gestor de Projeto + Tech Lead)
   - **Wait timer**: opcional — 0 minutos para o MVP
   - **Deployment branches**: restrinja para `main` e padrão `v*` (tags de release)

---

## Parte 4 — Configurar o ambiente local (development)

Para cada desenvolvedor novo no time:

```bash
# 1. Clone o repositório
git clone https://github.com/[org]/shareo.git
cd shareo

# 2. Instale as dependências
pnpm install

# 3. Copie o arquivo de exemplo
cp .env.example .env.local

# 4. Preencha .env.local com as credenciais do projeto shareo-dev
#    (solicite ao DevOps ou Tech Lead os valores de dev)

# 5. Gere o cliente Prisma
pnpm db:generate

# 6. Aplique as migrations no banco de dev
pnpm db:migrate

# 7. Aplique as políticas RLS no banco de dev
pnpm rls

# 8. (Opcional) Popule com dados de seed
pnpm db:seed

# 9. Inicie o servidor de desenvolvimento
pnpm dev
```

O ambiente local deve estar funcional em menos de 30 minutos após a conclusão desses passos.

---

## Parte 5 — Aplicar RLS após criar cada instância

Após criar um novo projeto Supabase (dev, staging ou production), aplique as políticas de Row Level Security:

```bash
# Configure o DATABASE_URL no .env.local para o projeto alvo
# Então execute:
pnpm rls
```

O script `scripts/apply-rls.ts` lê `supabase/rls-policies.sql` e aplica todos os statements.
Statements já existentes são ignorados (idempotente) — seguro executar múltiplas vezes.

Para staging e produção, a migration de RLS é aplicada automaticamente pelo pipeline CI/CD
no job `staging` ou `production` do `deploy.yml` via `pnpm db:migrate:deploy`.

---

## Parte 6 — Configurar Vercel para múltiplos ambientes

### 6.1 Vincular o projeto ao Vercel

```bash
vercel link
```

Selecione a organização e o projeto `shareo`.

### 6.2 Configurar variáveis de ambiente por ambiente no Vercel

As variáveis secretas (SUPABASE_SERVICE_ROLE_KEY, STRIPE_SECRET_KEY, etc.) devem ser
configuradas também diretamente no Vercel Dashboard para os jobs `vercel build`:

1. Acesse `vercel.com/[org]/shareo/settings/environment-variables`
2. Para cada variável, selecione o escopo correto:
   - **Production**: apenas para deploys de produção
   - **Preview**: para PRs e staging
   - **Development**: para `vercel dev` local

### 6.3 Verificar o deploy de staging após configurar

Após configurar todos os secrets, faça um push na `main` e verifique:
1. O job `staging` no GitHub Actions executa sem erro
2. A URL do staging carrega corretamente
3. O Sentry está capturando eventos de staging (não de produção)

---

## Checklist de validação por ambiente

Após configurar cada ambiente, valide:

- [ ] `pnpm db:migrate:deploy` executa sem erros
- [ ] `pnpm rls` aplica todas as políticas sem erros
- [ ] A aplicação carrega no URL do ambiente
- [ ] Login e cadastro funcionam (Supabase Auth + NextAuth)
- [ ] Upload de imagem de item funciona (Supabase Storage)
- [ ] Chat em tempo real funciona (Supabase Realtime)
- [ ] Sentry recebe um evento de teste
- [ ] Nenhum secret aparece nos logs do Vercel ou do Sentry

---

## Referências

- ADR-001: Autenticação — `docs/adr/ADR-001-autenticacao.md`
- ADR-003: Chat Realtime — `docs/adr/ADR-003-chat.md`
- ADR-005: Criptografia de documentos — `docs/adr/ADR-005-criptografia-documentos.md`
- ADR-009: RLS + NextAuth — `docs/adr/ADR-009-rls-nextauth.md`
- Script RLS: `scripts/apply-rls.ts`
- Políticas SQL: `supabase/rls-policies.sql`
