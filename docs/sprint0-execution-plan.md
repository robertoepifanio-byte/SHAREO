# Plano de Execução — Sprint 0

**Data**: 2026-05-25  
**Responsável**: Arquiteto + DevOps + Full Stack Dev  
**Objetivo**: Setup técnico completo antes do primeiro feature do Sprint 1  
**Bloqueadores endereçados**: B1–B8 do relatório `revisao-pre-sprint1.md`

---

## Seção 1 — Pré-requisitos Manuais

Estas tarefas **não são código** e precisam ser executadas pelo dev fora do repositório, na ordem exata indicada. Vários passos dependem de IDs/URLs gerados nos passos anteriores.

### 1.1 Criar Supabase Staging

1. Acesse [supabase.com](https://supabase.com) → New Project
2. Nome: `shareo-staging` | Senha forte (guarde com segredo — será o `POSTGRES_PASSWORD` do staging)
3. Região: `South America (São Paulo)` — sa-east-1
4. Após criação (~2 min), copie: `Project URL`, `anon key`, `service_role key`, `DATABASE_URL` (Settings → Database → Connection string → URI)
5. No SQL Editor, execute: `CREATE EXTENSION IF NOT EXISTS postgis;`
6. Verifique: `SELECT PostGIS_Version();` deve retornar versão sem erro

### 1.2 Criar Supabase Production (Pro Plan)

7. Repita os passos 1–6 para um projeto separado: `shareo-production`
8. Guardar todas as chaves em um gerenciador de segredos (1Password, Bitwarden) — **nunca** em texto claro ou no repositório

### 1.3 Criar bucket de imagens no Supabase (ambos os projetos)

9. Em cada projeto Supabase → Storage → New bucket
10. Nome: `item-images` | Tipo: **Public** (leitura pública, escrita server-only)
11. Habilitar Image Transformations: Settings → Storage → Enable image transformations (Pro Plan)

### 1.4 Criar Environments no GitHub

12. Repositório GitHub → Settings → Environments → New environment
13. Criar environment `staging`:
    - Protection rules: nenhuma (deploy automático em PRs)
    - Secrets: `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `AUTH_SECRET`, `ENCRYPTION_KEY`, `RESEND_API_KEY`
14. Criar environment `production`: (Pro Plan)
    - Protection rules: Required reviewers (adicionar o dev como reviewer)
    - Secrets: os mesmos do staging com os valores de produção

### 1.5 Configurar secrets adicionais no repositório (não environments)

15. Settings → Secrets and variables → Actions → New repository secret
16. `CODECOV_TOKEN` — criar conta em codecov.io, linkar com o repositório, copiar token

### 1.6 Criar projeto Vercel

17. Acesse [vercel.com](https://vercel.com) → Add New → Project → Import Git Repository
18. Selecionar o repositório ShareO
19. Framework Preset: **Next.js**
20. Root Directory: `/` (raiz)
21. Environment Variables: não configurar agora — será feito via GitHub Actions com os secrets dos environments
22. Anotar o `VERCEL_TOKEN`, `VERCEL_ORG_ID` e `VERCEL_PROJECT_ID` (necessários para o CI/CD)
23. Adicionar ao GitHub: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` como repository secrets

### 1.7 Criar projeto Sentry

24. Acesse [sentry.io](https://sentry.io) → New Project → Next.js
25. Nome: `shareo-web`
26. Copiar `SENTRY_DSN` e `SENTRY_AUTH_TOKEN`
27. Adicionar `SENTRY_DSN` aos secrets dos environments staging e production
28. Adicionar `SENTRY_AUTH_TOKEN` como repository secret (usado pelo CI para upload de source maps)

---

## Seção 2 — Tarefas de Código

### DAG de Dependências

```
[A] Corrigir ci.yml
[B] Corrigir schema.prisma          ─────────────────────────────┐
[C] Corrigir tailwind.config.ts                                  │
[D] Criar package.json              ────────────────────────────┐│
     │                                                           ││
     ▼ (D concluído)                                            ││
[E] Criar estrutura de pastas                                   ││
     │                                                           ││
     ▼ (E concluído)                                            ││
[F] Configurar ferramentas de teste                             ││
     │                                                           ││
     └──────────────────────────────┬────────────────────────────┘│
                                    ▼ (B + D concluídos)          │
                              [G] Rodar prisma migrate dev         │
                                    │                              │
                                    ▼ (A + E + F + G concluídos)  │
                              [H] Primeiro deploy Vercel ◄─────────┘
                                  (requer C também)
```

---

### Tarefa A — Corrigir `ci.yml`

**Depende de**: nada (pode ser feita em paralelo com B, C, D)  
**Arquivo**: `.github/workflows/ci.yml`  
**Estimativa**: 1 hora

**O que fazer**:
1. Trocar `postgis/postgis:16-3.4` por `postgis/postgis:15-3.4` (bloqueador B3)
2. Reduzir threshold de cobertura de `70` para `0` com comment explicando a dívida técnica (bloqueador B6)
3. Adicionar variável `AUTH_URL` ao job que executa testes
4. Adicionar `RESEND_API_KEY` à lista de secrets documentados no cabeçalho do arquivo
5. Adicionar job `audit`:
```yaml
audit:
  name: Security Audit
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v3
    - run: pnpm audit --audit-level=high
```
6. Adicionar job `e2e` com Playwright (após criar `playwright.config.ts` na Tarefa F):
```yaml
e2e:
  name: E2E Tests
  runs-on: ubuntu-latest
  needs: [build]
  steps:
    - uses: actions/checkout@v4
    - uses: pnpm/action-setup@v3
    - run: pnpm install
    - run: npx playwright install --with-deps chromium
    - run: pnpm test:e2e
```
7. Criar `.github/dependabot.yml`:
```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
```

---

### Tarefa B — Corrigir `schema.prisma`

**Depende de**: nada (pode ser feita em paralelo)  
**Arquivo**: `prisma/schema.prisma`  
**Estimativa**: 30 minutos

**O que fazer**:
1. Adicionar `deletedAt DateTime?` ao modelo `Booking` (após `updatedAt`) — bloqueador S2/LGPD
2. Adicionar `deletedAt DateTime?` ao modelo `Message` (após `createdAt`) — bloqueador S2/LGPD
3. Adicionar campo `slug String @unique` ao modelo `Item` (necessário para ADR-006 ISR)
4. Atualizar o índice de `Item` para incluir `slug`: `@@index([slug])`

```prisma
// Adicionar em Booking (após updatedAt):
deletedAt       DateTime?

// Adicionar em Message (após createdAt):
deletedAt       DateTime?

// Adicionar em Item (após updatedAt):
slug            String    @unique // ex.: "furadeira-bosch-em-sao-paulo-sp-clx1abc"
```

---

### Tarefa C — Corrigir `tailwind.config.ts`

**Depende de**: nada (pode ser feita em paralelo)  
**Arquivo**: `tailwind.config.ts`  
**Estimativa**: 30 minutos

**O que fazer**:
1. Adicionar token `brand.cta: "#C05800"` (contraste 4.47:1 — bloqueador B2/WCAG)
2. Adicionar token `brand.link: "#9A4700"` (para links inline sobre fundo branco)
3. Adicionar tokens de estado desabilitado:
```typescript
disabled: {
  bg: "#F1F5F9",      // slate-100
  text: "#94A3B8",    // slate-400
  border: "#CBD5E1",  // slate-300
},
```
4. Adicionar `ringWidth.DEFAULT: "2px"` e `ringOffset.DEFAULT: "2px"` (token de focus)
5. Adicionar token `spacing.tap: "44px"` explícito (alinhado ao `minHeight.tap`)
6. Adicionar plugins ao array `plugins`:
```typescript
plugins: [
  require("tailwindcss-animate"),
  require("@tailwindcss/forms"),
],
```
7. Instalar os plugins (adicionar ao `package.json` na Tarefa D): `tailwindcss-animate`, `@tailwindcss/forms`

---

### Tarefa D — Criar `package.json`

**Depende de**: nada (pode ser feita em paralelo com A, B, C)  
**Arquivo**: `package.json` (criar do zero)  
**Estimativa**: 1 hora

**O que fazer — dependências de produção**:
```json
{
  "name": "shareo",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "test": "jest --passWithNoTests",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:e2e": "playwright test",
    "db:migrate": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:generate": "prisma generate",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "next": "14.2.x",
    "react": "18.x",
    "react-dom": "18.x",
    "typescript": "5.x",
    "@prisma/client": "5.x",
    "next-auth": "5.x",
    "@auth/prisma-adapter": "latest",
    "@tanstack/react-query": "5.x",
    "@supabase/supabase-js": "2.x",
    "zod": "3.x",
    "react-hook-form": "7.x",
    "@hookform/resolvers": "3.x",
    "bcryptjs": "2.x",
    "file-type": "19.x",
    "ulid": "2.x",
    "clsx": "2.x",
    "tailwind-merge": "2.x",
    "class-variance-authority": "0.7.x",
    "lucide-react": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-avatar": "latest",
    "@radix-ui/react-slot": "latest",
    "tailwindcss-animate": "1.x",
    "@tailwindcss/forms": "0.5.x"
  },
  "devDependencies": {
    "prisma": "5.x",
    "tailwindcss": "3.x",
    "postcss": "8.x",
    "autoprefixer": "10.x",
    "@types/react": "18.x",
    "@types/react-dom": "18.x",
    "@types/node": "20.x",
    "@types/bcryptjs": "2.x",
    "jest": "29.x",
    "jest-environment-jsdom": "29.x",
    "@jest/types": "29.x",
    "ts-jest": "29.x",
    "@testing-library/react": "14.x",
    "@testing-library/jest-dom": "6.x",
    "@testing-library/user-event": "14.x",
    "jest-axe": "8.x",
    "msw": "2.x",
    "@playwright/test": "1.x",
    "eslint": "8.x",
    "eslint-config-next": "14.x",
    "eslint-plugin-jsx-a11y": "6.x",
    "@tanstack/react-query-devtools": "5.x"
  }
}
```

Executar após criar o arquivo:
```bash
pnpm install
```

---

### Tarefa E — Criar Estrutura de Pastas

**Depende de**: D (package.json instalado)  
**Arquivos**: criar diretórios e arquivos placeholder  
**Estimativa**: 1 hora

**O que fazer**:
1. Criar todos os diretórios definidos no ADR-005
2. Criar arquivos placeholder mínimos para validar o build:

```typescript
// app/layout.tsx (root layout mínimo — expande no Sprint 1)
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ShareO — Use Mais. Possua Menos.",
  description: "Marketplace de aluguel local com busca geolocalizada",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
```

```typescript
// app/(public)/page.tsx (landing page placeholder)
export default function HomePage() {
  return <main><h1>ShareO — Em construção</h1></main>
}
```

```typescript
// lib/prisma.ts (singleton)
import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error"] : ["error"] })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
```

```typescript
// utils/cn.ts (shadcn/ui utility)
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

3. Inicializar shadcn/ui:
```bash
npx shadcn-ui@latest init
# Selecionar: TypeScript, tailwind, app router, src/ = não, @/ alias = sim
```

4. Instalar componentes base:
```bash
npx shadcn-ui@latest add button input label badge avatar skeleton separator
```

---

### Tarefa F — Configurar Ferramentas de Teste

**Depende de**: D (package.json instalado), E (estrutura de pastas)  
**Arquivos**: `jest.config.ts`, `jest.setup.ts`, `playwright.config.ts`, `src/mocks/server.ts`, `src/mocks/handlers.ts`  
**Estimativa**: 2 horas

**O que fazer**:

```typescript
// jest.config.ts
import type { Config } from "jest"
import nextJest from "next/jest.js"

const createJestConfig = nextJest({ dir: "./" })

const config: Config = {
  coverageProvider: "v8",
  testEnvironment: "jsdom",
  setupFilesAfterFramework: ["<rootDir>/jest.setup.ts"],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  collectCoverageFrom: [
    "lib/**/*.{ts,tsx}",
    "utils/**/*.{ts,tsx}",
    "hooks/**/*.{ts,tsx}",
    "components/**/*.{ts,tsx}",
    "!**/*.d.ts",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      branches: 0,   // TODO: elevar para 70% após Sprint 1 — issue #XX
      functions: 0,
      lines: 0,
      statements: 0,
    },
  },
}

export default createJestConfig(config)
```

```typescript
// jest.setup.ts (completo — bloqueador B4)
import "@testing-library/jest-dom"
import { toHaveNoViolations } from "jest-axe"
import { server } from "./src/mocks/server"

// jest-axe: adiciona expect.toHaveNoViolations()
expect.extend(toHaveNoViolations)

// MSW: inicia o servidor de mock antes de todos os testes
beforeAll(() => server.listen({ onUnhandledRequest: "error" }))

// MSW: reseta handlers para estado inicial após cada teste
afterEach(() => server.resetHandlers())

// MSW: fecha o servidor após todos os testes
afterAll(() => server.close())
```

```typescript
// src/mocks/server.ts
import { setupServer } from "msw/node"
import { handlers } from "./handlers"

export const server = setupServer(...handlers)
```

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from "msw"

// Handlers de base — adicionar por feature no Sprint 1
export const handlers = [
  // Exemplo: mock do endpoint de items
  http.get("/api/items", () => {
    return HttpResponse.json({ items: [], total: 0 })
  }),
]
```

```typescript
// playwright.config.ts (bloqueador B5)
import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "Mobile Chrome", use: { ...devices["Pixel 5"] } },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
  },
})
```

Criar arquivo de smoke test E2E mínimo:
```typescript
// e2e/smoke.spec.ts
import { test, expect } from "@playwright/test"

test("landing page carrega com título correto", async ({ page }) => {
  await page.goto("/")
  await expect(page).toHaveTitle(/ShareO/)
})
```

---

### Tarefa G — Rodar `prisma migrate dev --name init`

**Depende de**: B (schema.prisma corrigido), D (package.json com Prisma instalado)  
**Pré-requisito manual**: Supabase staging provisionado (Seção 1) e `DATABASE_URL`/`DIRECT_URL` configurados no `.env.local`  
**Estimativa**: 30 minutos

**O que fazer**:
1. Criar `.env.local` com as variáveis do Supabase staging (nunca commitar — já no `.gitignore`)
2. Executar:
```bash
pnpm db:generate   # gera o Prisma Client
pnpm db:migrate    # cria a migration e aplica no banco
# Quando perguntado: Enter a name for the new migration: init
```
3. Verificar no Supabase Studio que todas as tabelas foram criadas
4. Verificar extensão PostGIS: `SELECT PostGIS_Version();`

---

### Tarefa H — Primeiro Deploy de Preview no Vercel

**Depende de**: A (ci.yml corrigido), C (tailwind corrigido), E (estrutura de pastas), F (testes configurados), G (migration criada)  
**Estimativa**: 2 horas

**O que fazer**:
1. Criar branch `feat/sprint0-setup`
2. Commitar todas as tarefas A–G com mensagens semânticas
3. Abrir PR para `main`
4. Verificar que o CI passa:
   - Job `lint`: sem erros TypeScript
   - Job `test`: `--passWithNoTests` passa com 0 testes (threshold 0%)
   - Job `audit`: sem CVEs críticos nas dependências
   - Job `build`: `next build` completa sem erros
5. Verificar que o Vercel cria um preview deploy automático
6. Acessar a URL de preview e verificar que a página carrega sem erros 500
7. Merge do PR para `main` dispara deploy para staging
8. Verificar staging funcionando

---

## Seção 3 — Critério de "Sprint 0 Concluído"

Todos os itens abaixo devem estar verdes antes de iniciar qualquer feature do Sprint 1.

### Infraestrutura

- [ ] Supabase staging: `SELECT PostGIS_Version()` retorna versão sem erro
- [ ] Supabase production: idem
- [ ] Bucket `item-images` criado em staging e production (público, Image Transformations habilitadas)
- [ ] GitHub Environments `staging` e `production` existem com todos os 8 secrets configurados
- [ ] Vercel: projeto linkado ao repositório, preview deployments automáticos funcionando
- [ ] Sentry: projeto `shareo-web` criado, `SENTRY_DSN` configurado nos environments

### Pipeline CI/CD

- [ ] CI completo sem erros em um PR de exemplo:
  - [ ] Job `lint` passa (`next lint` + `tsc --noEmit`)
  - [ ] Job `test` passa (`--passWithNoTests` com threshold 0%)
  - [ ] Job `audit` passa (sem CVEs `high` ou `critical`)
  - [ ] Job `build` passa (`next build` em < 5 minutos)
  - [ ] Job `e2e` passa (smoke test de landing page)
- [ ] Vercel preview deploy funciona em PRs
- [ ] `.github/dependabot.yml` criado

### Código

- [ ] `package.json` com todos os scripts funcionando: `dev`, `build`, `lint`, `type-check`, `test`, `test:e2e`, `db:migrate`
- [ ] `pnpm dev` inicia sem erros em `http://localhost:3000`
- [ ] Estrutura de pastas conforme ADR-005 criada
- [ ] shadcn/ui inicializado: `components/ui/button.tsx` existe e é importável
- [ ] `jest.setup.ts` completo: MSW server + jest-axe configurados
- [ ] `playwright.config.ts` existe e smoke test passa localmente
- [ ] `lib/prisma.ts` singleton funcional
- [ ] `utils/cn.ts` funcional (shadcn/ui dependency)

### Banco de Dados

- [ ] `prisma/migrations/` contém a migration `init` aplicada com sucesso em staging
- [ ] Schema inclui `deletedAt` em `Booking` e `Message`
- [ ] Schema inclui `slug` em `Item`
- [ ] Prisma Studio conecta ao banco staging sem erros

### Configuração / Design System

- [ ] `tailwind.config.ts` com `brand.cta: "#C05800"` (contraste WCAG aprovado)
- [ ] `tailwind.config.ts` com plugins `tailwindcss-animate` e `@tailwindcss/forms`
- [ ] Tokens `disabled`, `ringWidth`, `ringOffset` adicionados

### ADRs

- [ ] ADR-005: Estrutura de pastas — criado e seguido na implementação
- [ ] ADR-006: Estratégia de renderização — criado
- [ ] ADR-007: Gestão de estado — criado
- [ ] ADR-008: RLS × NextAuth — criado (bloqueador B1 resolvido)
- [ ] ADR-009: Upload de imagens — criado

---

*Plano gerado pelo Arquiteto ShareO em 25/05/2026 com base no relatório `revisao-pre-sprint1.md`.*
